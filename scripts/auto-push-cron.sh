#!/bin/sh
# Cron companion to auto-push.sh: also commits + pushes edits made outside Claude Code (e.g. in VS Code).
# Runs every 5 minutes; waits until nothing has been touched for 2 minutes so a half-saved edit isn't pushed.
cd "$(dirname "$0")/.." || exit 0
export GIT_TERMINAL_PROMPT=0

changed=$(git status --porcelain | cut -c4- | sed 's/^"\(.*\)"$/\1/')
[ -z "$changed" ] && { [ -n "$(git log origin/"$(git rev-parse --abbrev-ref HEAD)"..HEAD --oneline 2>/dev/null)" ] && sh scripts/auto-push.sh >/dev/null; exit 0; }

now=$(date +%s)
newest=0
for f in $changed; do
  [ -e "$f" ] || continue
  m=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  [ "$m" -gt "$newest" ] && newest=$m
done
[ $((now - newest)) -lt 120 ] && exit 0

sh scripts/auto-push.sh >/dev/null
