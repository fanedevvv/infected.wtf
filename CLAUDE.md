@AGENTS.md

## Discord update announcements

Big, user-visible changes are announced in the Discord #updates channel automatically. When you finish one, write
`announcements/pending.json` before ending your turn; `scripts/auto-push.sh` (Stop hook) posts it after the push and
archives it to `announcements/posted/`.

Announce: a new feature, layout, integration or page; a visible redesign; a fix for something users actually hit.
Don't announce: refactors, internal tooling, small tweaks, copy edits, config/secrets, bot-only or admin-only changes.
When in doubt, don't — the owner wants only the updates that really change something.

```json
{ "kind": "feature|layout|design|fix", "title": "Short headline", "summary": "One sentence for users.",
  "changes": ["What users can now do", "..."], "link": "https://infected.wtf/...", "linkLabel": "Try it" }
```

Write it in English, for site users (not developers): what they can do now, no file names or internals.
