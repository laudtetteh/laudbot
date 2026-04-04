#!/bin/sh
# Copy commit-msg and post-commit into .git/hooks so they run even when
# core.hooksPath is not set to .husky (some GUIs / editors).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GIT_HOOKS="${ROOT}/.git/hooks"
HUSKY="${ROOT}/.husky"

if [ ! -d "${GIT_HOOKS}" ]; then
  echo "No .git/hooks; run from repo root after git init."
  exit 0
fi

for name in commit-msg post-commit; do
  src=""
  if [ -f "${HUSKY}/${name}" ]; then
    src="${HUSKY}/${name}"
  elif [ -f "${HUSKY}/${name}.sh" ]; then
    src="${HUSKY}/${name}.sh"
  fi
  if [ -n "${src}" ]; then
    cp "${src}" "${GIT_HOOKS}/${name}"
    chmod +x "${GIT_HOOKS}/${name}"
    echo "Installed ${name} <- ${src##*/} -> .git/hooks/${name}"
  else
    echo "Skipping ${name}: no ${HUSKY}/${name} or ${HUSKY}/${name}.sh" >&2
  fi
done