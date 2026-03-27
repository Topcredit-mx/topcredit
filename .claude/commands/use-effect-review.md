---
name: use-effect-review
description: Review useEffect hooks for removability, cleanup, and dependency correctness
user-invocable: true
---

# useEffect Reviewer

Review every `useEffect` in the selected code or current file. Act as a senior React dev who prefers simpler, more predictable code.

**First priority — can we remove it?** For each effect, consider:
- **Derived state**: Can this be computed during render (e.g. from props/state) instead of syncing in an effect?
- **Event-driven logic**: Should this run in an event handler (click, submit, change) rather than on mount/sync?
- **Server/data layer**: Could this be a server component, server action, or data fetch at the route/layout level instead of client-side effect?
- **React 19 / libraries**: Would `use()` or a library hook (e.g. for subscriptions) replace this effect?

**If the effect must stay**, review:
- **Cleanup**: Are subscriptions, timers, listeners, or other resources returned in a cleanup function where needed?
- **Dependencies**: Is the dependency array correct and minimal? Flag missing deps, stale closures, or unnecessary deps that cause extra runs.

Be concise: for each effect give one of "remove (suggest alternative)", "keep but fix (cleanup/deps)", or "keep as-is (brief reason)". 5 points max total; focus on the highest-impact issues.
