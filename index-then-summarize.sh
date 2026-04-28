#!/bin/bash
# Full pipeline: index new chunks, then summarize unsummarized ones
set -euo pipefail

DIR="$(dirname "$(realpath "$0")")"
LOG="/tmp/index-pipeline-$(date +%Y%m%d_%H%M).log"

echo "=== Index + Summarize Pipeline ===" | tee "$LOG"
echo "Started: $(date)" | tee -a "$LOG"

echo "--- Phase 1: Indexing (embed only, no summaries) ---" | tee -a "$LOG"
cd "$DIR"
python3 -u run-index.py 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "--- Phase 2: Summarizing unsummarized chunks ---" | tee -a "$LOG"
python3 -u - <<'PY' 2>&1 | tee -a "$LOG"
import json

from server import backfill_summaries

total_added = 0
total_failed = 0

while True:
    result = backfill_summaries(limit=100)
    print(json.dumps(result, indent=2), flush=True)

    total_added += result.get("summaries_added", 0)
    total_failed += result.get("failed", 0)

    if result.get("chunks_found", 0) == 0 or (
        result.get("summaries_added", 0) == 0 and result.get("failed", 0) == 0
    ):
        break

print(json.dumps({"summaries_added": total_added, "failed": total_failed}, indent=2), flush=True)
PY

echo "" | tee -a "$LOG"
echo "=== Pipeline complete: $(date) ===" | tee -a "$LOG"
