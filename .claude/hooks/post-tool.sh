#!/bin/bash
# post-tool.sh
# Runs after Claude Code executes a tool.
# Wired via .claude/settings.json — do not rename or move.
# Claude Code passes the tool name as $1 and result as JSON on stdin.

TOOL="$1"
REPO="/Users/beaconavenue/code/laudbot"
SESSION_LOG="/tmp/claude-session.log"
PROGRESS_FILE="$REPO/memory/PROGRESS.md"

# ── Session log ──────────────────────────────────────────────────────────────
echo "[$(date +%H:%M:%S)] POST: $TOOL" >> "$SESSION_LOG"

# ── Auto-log git commits to PROGRESS.md ─────────────────────────────────────
# After any Bash tool, check if a new commit landed. If so, append a stub
# entry to PROGRESS.md so the record exists even before Claude writes the
# full narrative. Claude is expected to expand the entry during wrap-up.
if [[ "$TOOL" == "Bash" ]]; then
  RESULT=$(cat)

  # Heuristic: git commit output always contains a short hash in brackets
  if echo "$RESULT" | grep -qE '\[[a-f0-9]{7,}\]'; then
    COMMIT_MSG=$(git -C "$REPO" log -1 --format="%s" 2>/dev/null)
    COMMIT_HASH=$(git -C "$REPO" log -1 --format="%h" 2>/dev/null)
    COMMIT_DATE=$(date +%Y-%m-%d)

    if [[ -n "$COMMIT_MSG" && -n "$COMMIT_HASH" ]]; then
      # Only append if this hash isn't already logged
      if ! grep -q "$COMMIT_HASH" "$PROGRESS_FILE" 2>/dev/null; then
        STUB="\n## $COMMIT_DATE — $COMMIT_MSG [$COMMIT_HASH]\n_Auto-logged. Claude should expand this entry._\n\n---"
        # Insert after the first --- separator (line ~6)
        TMP=$(mktemp)
        awk -v stub="$STUB" '/^---$/ && !done { print; print stub; done=1; next } 1' "$PROGRESS_FILE" > "$TMP" \
          && mv "$TMP" "$PROGRESS_FILE"
        echo "[$(date +%H:%M:%S)] PROGRESS.md auto-stub: $COMMIT_HASH $COMMIT_MSG" >> "$SESSION_LOG"
      fi
    fi
  fi
fi

exit 0
