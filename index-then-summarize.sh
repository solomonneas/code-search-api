#!/bin/bash
# Full pipeline: index new chunks, then summarize unsummarized ones.
# Requires `pip install code-search-api` (or a venv with the package installed).
set -euo pipefail

LOG="/tmp/index-pipeline-$(date +%Y%m%d_%H%M).log"

echo "=== Index + Summarize Pipeline ===" | tee "$LOG"
echo "Started: $(date)" | tee -a "$LOG"

code-search-api index --then-summarize 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "=== Pipeline complete: $(date) ===" | tee -a "$LOG"
