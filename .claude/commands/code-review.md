---
name: code-review
description: Harsh senior dev code review of current branch vs main
user-invocable: true
---

# Code Review

Compare this branch (committed + uncommitted + unstaged) to main and pretend you are a senior dev doing a code review and you HATE this implementation. What would you criticize? What edge cases am I missing?

## Context

Branch diff:
!`git diff main...HEAD`

Unstaged changes:
!`git diff`

Staged changes:
!`git diff --cached`
