#!/bin/sh
# In-place filter for commit message files. Used by commit-msg and post-commit.
#
# Strips:
# - Git trailer lines added by Cursor, Claude Code Desktop, Copilot, etc.:
#   Co-authored-by / Co-Authored-By (same with -i), Signed-off-by, Reviewed-by,
#   Acked-by, Tested-by, Helped-by, On-behalf-of (case-insensitive, flexible spacing).
# - Common non-trailer footer lines some tools inject (e.g. "Generated with Cursor").
#
# Usage: sh .husky/filter-commit-message-inplace.sh <message-file>
f="$1"
[ -n "$f" ] && [ -f "$f" ] || exit 0
t=$(mktemp) || exit 1
# 1) Standard / de-facto trailer keys (covers Cursor + Claude Co-Authored-By: ... <noreply@anthropic.com>)
grep -viE '^[[:space:]]*(co-authored-by|signed-off-by|reviewed-by|acked-by|tested-by|helped-by|on-behalf-of)[[:space:]]*:' "$f" |
# 2) Assistant / IDE footer lines (markdown bullets or plain)
  grep -viE '^[[:space:]]*([#*>-][[:space:]]*)*[Gg]enerated[[:space:]]+with[[:space:]]+Cursor([[:space:]].*)?$' |
  grep -viE '^[[:space:]]*([#*>-][[:space:]]*)*[Gg]enerated[[:space:]]+by[[:space:]]+Cursor([[:space:]].*)?$' |
  grep -viE '^[[:space:]]*([#*>-][[:space:]]*)*[Gg]enerated[[:space:]]+with[[:space:]]+Claude([[:space:]].*)?$' |
  grep -viE '^[[:space:]]*([#*>-][[:space:]]*)*[Gg]enerated[[:space:]]+by[[:space:]]+Claude([[:space:]].*)?$' |
  grep -viE '^[[:space:]]*([#*>-][[:space:]]*)*[Cc]ommitted[[:space:]]+with[[:space:]]+Cursor([[:space:]].*)?$' |
  sed 's/\r$//' > "$t"
mv "$t" "$f"
