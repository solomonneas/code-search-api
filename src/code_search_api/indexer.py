"""Run the local indexer directly without HTTP."""
import hashlib
import sys
import time
from contextlib import closing
from pathlib import Path

from .server import collect_files, chunk_file, embed_text, get_conn, init_db, migrate_db, pack_embedding

def main():
    init_db()
    migrate_db()

    print("Collecting files...")
    files = collect_files()
    print(f"Found {len(files)} files to process")

    # Get existing chunk hashes
    with closing(get_conn()) as conn:
        existing = {}
        for row in conn.execute("SELECT file_path, chunk_index, content_hash FROM chunks").fetchall():
            existing[(row["file_path"], row["chunk_index"])] = row["content_hash"]
    print(f"Existing chunks in DB: {len(existing)}")

    new_chunks = 0
    skipped = 0
    embedded = 0
    failed = 0
    t0 = time.time()

    last_report = t0
    for idx, (project, rel_path, abs_path) in enumerate(files):
        # Progress every 30 seconds regardless
        now = time.time()
        if now - last_report >= 30:
            elapsed = now - t0
            rate = new_chunks / max(elapsed, 1) * 3600
            print(f"  [{idx+1}/{len(files)} files] {new_chunks} new, {skipped} skipped, {embedded} embedded, {failed} failed ({rate:.0f}/hr) [{elapsed/60:.1f}m]")
            sys.stdout.flush()
            last_report = now

        try:
            content = Path(abs_path).read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        chunks = chunk_file(content, rel_path)

        for i, (chunk_content, chunk_type) in enumerate(chunks):
            chunk_hash = hashlib.md5(chunk_content.encode()).hexdigest()
            key = (rel_path, i)

            if key in existing and existing[key] == chunk_hash:
                skipped += 1
                continue

            emb = embed_text(chunk_content)
            emb_blob = pack_embedding(emb) if emb else None

            with closing(get_conn()) as conn:
                conn.execute(
                    """
                    INSERT INTO chunks (file_path, project, chunk_index, content, content_hash,
                                       embedding, summary, summary_embedding, chunk_type, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
                    ON CONFLICT(file_path, chunk_index) DO UPDATE SET
                        content=excluded.content, content_hash=excluded.content_hash,
                        embedding=excluded.embedding,
                        chunk_type=excluded.chunk_type, created_at=excluded.created_at
                    """,
                    (rel_path, project, i, chunk_content, chunk_hash, emb_blob,
                     chunk_type, time.time()),
                )
                conn.commit()

            new_chunks += 1
            if emb:
                embedded += 1
            else:
                failed += 1

    elapsed = time.time() - t0
    print(f"\n{'='*50}")
    print(f"Index complete!")
    print(f"  Files scanned: {len(files)}")
    print(f"  New chunks: {new_chunks}")
    print(f"  Skipped (unchanged): {skipped}")
    print(f"  Embedded: {embedded}")
    print(f"  Failed: {failed}")
    print(f"  Time: {elapsed/60:.1f} minutes")

if __name__ == "__main__":
    main()
