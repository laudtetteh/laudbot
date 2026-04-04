#!/bin/bash
# pre-tool.sh
# Runs before Claude Code executes any tool.
# Exit 0 to allow. Exit 1 to block (Claude will see your stderr as the reason).
#
# Claude Code passes the tool name as $1 and tool input as JSON on stdin.
# Tool names are capitalized: Write, Edit, Bash, Read, Glob, Grep, etc.

TOOL="$1"
INPUT=$(cat)

# Log every tool call to a local session log (optional — comment out if noisy)
echo "[$(date +%H:%M:%S)] TOOL: $TOOL" >> /tmp/claude-session.log

# Block direct writes to off-limits paths
if [[ "$TOOL" == "Write" || "$TOOL" == "Edit" ]]; then
  # Extract file_path from JSON input
  PATH_ARG=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

  BLOCKED_PATHS=(
    ".env.production"
    "migrations/"
    "data/approved/"   # approved source files are read-only — never written by Claude
  )

  for blocked in "${BLOCKED_PATHS[@]}"; do
    if [[ "$PATH_ARG" == *"$blocked"* ]]; then
      echo "Blocked: $PATH_ARG matches off-limits path '$blocked'" >&2
      exit 1
    fi
  done
fi

exit 0
