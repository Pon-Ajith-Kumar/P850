#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${P850_BRANCH:-main}"
COMMIT_MESSAGE="${P850_COMMIT_MESSAGE:-Update revision notes}"

cd "$PROJECT_ROOT"
npm run sync-notes
npm run build

git add -- notes src/data/subjects.json
if git diff --cached --quiet -- notes src/data/subjects.json; then
  echo "No note changes to publish."
  exit 0
fi

git commit --only -m "$COMMIT_MESSAGE" -- notes src/data/subjects.json
git push origin "$BRANCH"
