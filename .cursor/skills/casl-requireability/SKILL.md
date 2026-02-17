---
name: casl-requireability
description: CASL requireAbility usage for server-side auth guards. Use when adding or reviewing requireAbility(ability, action, subject) calls, or when implementing CASL ability checks in this Next.js project.
---

# CASL requireAbility Usage

Use `getAbility()` + `requireAbility(ability, action, subject)` for server-side authorization. The **subject** argument must match the rule type: string vs `subject()` wrapper.

## When to Use What

| Rule type | Example ability rule | Use |
|-----------|---------------------|-----|
| **String subject** | `can('manage', 'all')`, `can('create', 'Credit')` | `requireAbility(ability, 'create', 'Credit')` |
| **Object subject** | `can('read', 'Credit', { borrowerId })`, `can('read', 'Company', { id: { $in: ids } })` | `requireAbility(ability, 'read', subject('Credit', { borrowerId: userId }))` |
| **Instance check** | `can('update', 'Company', { id: { $in: ids } })` | `requireAbility(ability, 'update', subject('Company', company))` |

## Why

- **Rules with conditions** – CASL evaluates the condition against the subject's properties. A string has no properties, so the condition fails. Always use `subject(type, object)`.
- **Rules without conditions** – String subject is sufficient: `'Company'`, `'Credit'`, `'User'`, `'Admin'`.

## Examples

```typescript
// No conditions → string
requireAbility(ability, 'create', 'Company')
requireAbility(ability, 'create', 'Credit')
requireAbility(ability, 'manage', 'User')
requireAbility(ability, 'read', 'Admin')

// Conditions → subject() with matching fields
requireAbility(ability, 'read', subject('Credit', { id: 0, borrowerId: userId }))
requireAbility(ability, 'read', subject('Company', { id }))
requireAbility(ability, 'update', subject('User', { id: sessionUser.id }))
requireAbility(ability, 'update', subject('Company', company))
requireAbility(ability, 'delete', subject('Company', company))
```

## Checklist

When adding a `requireAbility` call:

1. Find the matching rule in `defineAbilityFor` (abilities.ts)
2. Does the rule have conditions? → Use `subject(type, object)` with the fields the condition checks
3. No conditions? → Use the subject type string
