#!/bin/sh
# Auto-commit + push any working-tree changes. Run by the Claude Code Stop hook (and by auto-push-cron.sh).
# After a successful push, a pending update announcement (announcements/pending.json — written only for big,
# user-visible changes) is posted to the Discord #updates channel and archived to announcements/posted/.
cd "$(dirname "$0")/.." || exit 0
export GIT_TERMINAL_PROMPT=0
LOG=/tmp/auto-push-$(id -u).log

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0

commit_all() {
  [ -n "$(git status --porcelain)" ] || return 1
  git add -A
  files=$(git diff --cached --name-only | head -5 | tr '\n' ' ')
  count=$(git diff --cached --name-only | wc -l)
  git commit -q -m "${1:-Auto-update: ${files}$( [ "$count" -gt 5 ] && echo "(+$((count-5)) more)")}" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
}

push() {
  if [ -n "$(git log "origin/$branch..HEAD" --oneline 2>/dev/null)" ] || ! git rev-parse -q --verify "origin/$branch" >/dev/null; then
    timeout 60 git push -q origin "$branch" 2>>"$LOG"
    return $?
  fi
  return 2 # nothing to push
}

commit_all
push
pushed=$?

msg=""
case $pushed in
  0) msg="Auto-push: pushed $branch to origin" ;;
  2) ;; # nothing to push
  *) msg="Auto-push FAILED (see $LOG)" ;;
esac

# Announce only once the change is safely on GitHub; on failure the file stays pending and is retried next time.
if { [ "$pushed" -eq 0 ] || [ "$pushed" -eq 2 ]; } && [ -f announcements/pending.json ]; then
  if node discord-bot/scripts/announce-update.js announcements/pending.json >>"$LOG" 2>&1; then
    mkdir -p announcements/posted
    mv announcements/pending.json "announcements/posted/$(date +%Y-%m-%d-%H%M%S).json"
    commit_all "Archive posted update announcement" && push
    msg="${msg:+$msg · }Update announced on Discord #updates"
  else
    msg="${msg:+$msg · }Update announcement FAILED (see $LOG), will retry"
  fi
fi

[ -n "$msg" ] && echo "{\"systemMessage\": \"$msg\"}"
exit 0
