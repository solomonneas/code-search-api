# Code Search API — Local Semantic Code Search with Ollama

![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-API-009688)
![Ollama](https://img.shields.io/badge/Ollama-local--first-black)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

A local-first semantic code search API built with Ollama and SQLite. It indexes your codebase using language-aware chunking, generates LLM summaries for each chunk, and supports hybrid search that combines raw code embeddings with summary embeddings so you can find implementation details by intent instead of exact text.

## Prerequisites

- Python 3.10+
- Ollama running locally or on a reachable host
- An embedding model available in Ollama, such as `nomic-embed-text`

## Quick Start

1. **Clone**
   ```bash
   git clone https://github.com/solomonneas/code-search-api.git
   cd code-search-api
   ```
2. **Install**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Configure**
   ```bash
   cp .env.example .env
   # edit .env to point at the code roots you want indexed
   ```
4. **Run**
   ```bash
   set -a
   source .env
   set +a
   python3 run-index.py
   uvicorn server:app --host 0.0.0.0 --port 8000
   ```

## API Docs

Interactive docs are available at `/docs` when the server is running.

Endpoints:
- `GET /health` — simple liveness check
- `GET /api/health` — health plus index/runtime metadata
- `POST /api/search` — semantic + hybrid search across indexed chunks
- `POST /api/index` — queue an indexing run in the background
- `POST /api/backfill-summaries` — generate summaries for chunks missing them
- `GET /api/projects` — per-project chunk counts and summary coverage
- `GET /api/stats` — chunk type and project coverage stats
- `GET /api/summary-stats` — summary counts by model

## Configuration

| Variable | Default | Description |
|---|---|---|
| `CODE_SEARCH_API_KEY` | unset | Protects `/api/*` write/search endpoints when set. |
| `CODE_SEARCH_WORKSPACE` | `./repos` | Primary directory tree to index. |
| `CODE_SEARCH_REFERENCE` | unset | Optional secondary directory tree for reference material. |
| `CODE_SEARCH_DB` | `./code_index.db` | SQLite database file path. |
| `CODE_SEARCH_CORS_ORIGINS` | `*` | Comma-separated CORS allowlist. |
| `OLLAMA_URL` | `http://localhost:11434` | Base URL for Ollama. |
| `CODE_SEARCH_EMBED_MODEL` | `nomic-embed-text` | Embedding model used for code/search vectors. |
| `CODE_SEARCH_SUMMARY_MODEL` | `qwen2.5:14b` | Primary summarization model. |
| `CODE_SEARCH_SUMMARY_FALLBACK` | `qwen2.5:14b` | Fallback summarization model. |
| `CODE_SEARCH_SUMMARY_WORKERS` | `4` | Parallel workers for summary generation. |
| `CODE_SEARCH_DB_BATCH_SIZE` | `100` | Batch size for database summary updates. |
| `CODE_SEARCH_CACHE_TTL_SECONDS` | `3600` | TTL for query embedding cache entries. |
| `CODE_SEARCH_BACKUP_DIR` | `./backups` | Output directory for `backup-db.sh`. |
| `CODE_SEARCH_MAX_BACKUPS` | `14` | Number of rotated SQLite backups to keep. |

## How It Works

1. **Chunking** — files are discovered under the configured roots, filtered by extension/size, and split into language-aware chunks.
2. **Embedding** — each chunk is embedded with Ollama and stored in SQLite as packed float vectors.
3. **Summarization** — chunks can be summarized with a local Ollama model so search works on both literal code and higher-level intent.
4. **Hybrid search** — query embeddings are matched against both code content and summaries, then weighted into a single ranked result set.

## Architecture

```text
Code repositories / reference docs
            |
            v
      file collection
            |
            v
   language-aware chunker
            |
            +-------------------+
            |                   |
            v                   v
   Ollama embeddings      Ollama summaries
            |                   |
            +---------+---------+
                      |
                      v
               SQLite index
                      |
                      v
           FastAPI search endpoints
                      |
                      v
              hybrid ranked results
```

## Helper Scripts

- `run-index.py` — direct CLI indexing run, useful for first-time or batch indexing
- `index-then-summarize.sh` — run indexing, then summarize unsummarized chunks
- `backup-db.sh` — create a rotated SQLite backup using the built-in Python backup API

## License

MIT
