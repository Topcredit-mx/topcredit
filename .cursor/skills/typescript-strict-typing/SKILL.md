---
name: typescript-strict-typing
description: Enforces strict TypeScript typing — no type assertions (except as const), no non-null assertions (!), no any. Use proper type narrowing, guards, and generics instead. Apply when writing, reviewing, or refactoring any TypeScript code.
---

# TypeScript Strict Typing

## Forbidden

- `as SomeType` — never cast types
- `!` (non-null assertion) — never assume non-null
- `any` — never use as a type, parameter, or return value

## Allowed

- `as const` — narrowing literals is fine

## How to Handle `T | undefined`

Use type narrowing with guards:

```typescript
const user = users.find(u => u.email === email)
if (!user) throw new Error(`User ${email} not found`)
// user is now narrowed — no assertion needed
```

For repeated lookups, use a scoped finder:

```typescript
function findUser(email: string) {
  const row = createdUsers.find(u => u.email === email)
  if (!row) throw new Error(`User ${email} not found`)
  return row
}
```

## Generics

Use generics to avoid duplication, but keep them simple:

```typescript
// Good — one type parameter, clear purpose
function first<T>(items: T[]): T {
  const item = items[0]
  if (!item) throw new Error('Empty array')
  return item
}

// Bad — over-generic, hard to read
function transform<T, U, V extends keyof T>(obj: T, key: V, fn: (val: T[V]) => U): U
```

## Common Patterns

**Array index access** — guard instead of `!`:

```typescript
const item = items[index]
if (!item) throw new Error(`Missing item at ${index}`)
```

**Map/Record lookups** — guard instead of `!` or `as`:

```typescript
const value = map.get(key)
if (!value) throw new Error(`Missing key ${key}`)
```

**Discriminated unions** — narrow with property checks:

```typescript
if (result.status === 'success') {
  result.data // narrowed
}
```

**Function return types** — let TypeScript infer when obvious, annotate when the function is public or the return is complex.
