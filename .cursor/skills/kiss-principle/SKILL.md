---
name: kiss-principle
description: Enforces the KISS (Keep It Simple, Stupid) principle across all code. Prioritizes readability, straightforward logic, and simplicity over cleverness. Apply when writing, reviewing, or refactoring any code.
---

# KISS Principle

Keep It Simple, Stupid. Code should be easy to read and understand.

## Core Rules

1. **Readability over cleverness** - If a junior developer can't understand it quickly, simplify it
2. **Straightforward logic** - Avoid nested ternaries, complex one-liners, and implicit behavior
3. **Explicit over implicit** - Clear code beats "elegant" code that requires mental gymnastics

## What to Avoid

- Deeply nested conditionals (max 2 levels)
- Chained ternary operators
- Single-letter variable names (except loop counters)
- "Clever" one-liners that do multiple things
- Premature abstractions
- Over-engineered solutions

## What to Prefer

- Descriptive variable and function names
- Early returns to reduce nesting
- Simple `if/else` over complex ternaries
- Small, focused functions (single responsibility)
- Comments for "why", not "what"

## Examples

**Bad - too clever:**

```typescript
const result = data?.items?.filter(x => x.active && x.type === 'A')?.map(x => x.value)?.reduce((a, b) => a + b, 0) ?? 0;
```

**Good - readable:**

```typescript
const activeItems = data?.items?.filter(item => item.active && item.type === 'A') ?? [];
const values = activeItems.map(item => item.value);
const total = values.reduce((sum, value) => sum + value, 0);
```

**Bad - nested conditionals:**

```typescript
function process(user) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        return doSomething(user);
      }
    }
  }
  return null;
}
```

**Good - early returns:**

```typescript
function process(user) {
  if (!user) return null;
  if (!user.isActive) return null;
  if (!user.hasPermission) return null;
  
  return doSomething(user);
}
```

## When Reviewing Code

Ask yourself:
- Can a junior dev understand this in under 30 seconds?
- Is there a simpler way to achieve the same result?
- Am I being clever, or am I being clear?
