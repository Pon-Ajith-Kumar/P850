#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${P850_BRANCH:-main}"
COMMIT_MESSAGE="${P850_COMMIT_MESSAGE:-Update revision notes}"

cd "$PROJECT_ROOT"
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "Refusing to publish from '$CURRENT_BRANCH'; switch to '$BRANCH' first."
  exit 1
fi

npm run sync-notes
npm run build

git add -- notes src/data/subjects.json
DELETED_NOTES="$(git diff --cached --diff-filter=D --name-only -- notes)"
if [[ -n "$DELETED_NOTES" ]]; then
  echo "Refusing to publish note deletions. Restore these files before publishing:"
  printf '%s\n' "$DELETED_NOTES"
  exit 1
fi

if git diff --cached --quiet -- notes src/data/subjects.json; then
  echo "No new note changes to commit; will still push any earlier local commits."
else
  git commit --only -m "$COMMIT_MESSAGE" -- notes src/data/subjects.json
fi

git push origin "$BRANCH"
