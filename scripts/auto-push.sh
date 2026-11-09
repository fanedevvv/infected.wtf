#!/bin/sh
# Auto-commit + push any working-tree changes. Run by the Claude Code Stop hook.
cd "$(dirname "$0")/.." || exit 0
export GIT_TERMINAL_PROMPT=0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  files=$(git diff --cached --name-only | head -5 | tr '\n' ' ')
  count=$(git diff --cached --name-only | wc -l)
  git commit -q -m "Auto-update: ${files}$( [ "$count" -gt 5 ] && echo "(+$((count-5)) more)")" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" || exit 0
fi

# Push only if local is ahead of remote
if [ -n "$(git log "origin/$branch..HEAD" --oneline 2>/dev/null)" ] || ! git rev-parse -q --verify "origin/$branch" >/dev/null; then
  if timeout 60 git push -q origin "$branch" 2>/tmp/auto-push-$(id -u).log; then
    echo "{\"systemMessage\": \"Auto-push: pushed $branch to origin\"}"
  else
    echo "{\"systemMessage\": \"Auto-push FAILED (see /tmp/auto-push-$(id -u).log)\"}"
  fi
fi
exit 0
