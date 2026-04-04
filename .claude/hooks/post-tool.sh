#!/bin/bash
# post-tool.sh
# Runs after Claude Code executes a tool.
# Use this for logging, notifications, or auto-actions on completion.
#
# Claude Code passes the tool name as $1 and result as JSON on stdin.
# Exit code is ignored — this is fire-and-forget.

TOOL="$1"

# Log file writes to session log
if [[ "$TOOL" == "write_file" || "$TOOL" == "edit_file" ]]; then
  echo "[$(date +%H:%M:%S)] WROTE via $TOOL" >> /tmp/claude-session.log
fi

# Log bash commands run
if [[ "$TOOL" == "bash" ]]; then
  echo "[$(date +%H:%M:%S)] RAN bash" >> /tmp/claude-session.log
fi

exit 0
