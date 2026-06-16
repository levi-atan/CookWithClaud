---
name: git-summary
description: Generate a human-readable summary of recent git activity. Use when the user asks "what did I work on?", "summarize recent changes", or "what changed recently?"
arguments: [days]
allowed-tools: Bash(git *)
---

## Recent Git Activity Summary

Summarize the last $ARGUMENTS days of work (default: 7 days if no argument given).

### Commits in the last $ARGUMENTS days:
!`git log --oneline --since="$ARGUMENTS days ago" 2>/dev/null || echo "No git repository found or no commits in this period."`

### Files changed:
!`git diff --stat HEAD~5 HEAD 2>/dev/null || echo "Cannot compare — fewer than 5 commits or no git repo."`

### Current status:
!`git status --short 2>/dev/null || echo "Not a git repository."`

---

Using the output above, provide:
1. **Overview** — A 2-3 sentence plain-English summary of what was worked on.
2. **Key changes** — Bullet list of the most significant changes.
3. **Files touched** — Which areas of the codebase were affected.
4. **Uncommitted work** — Any pending changes still in progress.

If no git repo is found, say so clearly and suggest running `git init` to start tracking changes.
