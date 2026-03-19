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
python3 -u -c "from server import summarize_unsummarized; import json; print(json.dumps(summarize_unsummarized(), indent=2))" 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "=== Pipeline complete: $(date) ===" | tee -a "$LOG"
