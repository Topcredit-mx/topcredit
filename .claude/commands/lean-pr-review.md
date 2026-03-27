---
name: lean-pr-review
description: Review branch diff for unnecessary or over-engineered changes
user-invocable: true
---

# Lean PR Review

Compare this branch to main. Act as a senior dev whose goal is to keep PRs as small and focused as possible. Review the diff and answer: could this solution be leaner? Flag any changes that seem unnecessary, redundant, or over-engineered. Suggest what could be removed, inlined, or simplified so the PR does the minimum required. Be concise: 5 points max.

## Context

Branch diff:
!`git diff main...HEAD`
