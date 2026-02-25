# TypeScript Strict Typing

Key rules:
- **Never** use `as SomeType` (except `as const`)
- **Never** use `!` non-null assertion
- **Never** use `any`
- Use type narrowing, guards, and `Set<string>` for `.includes()` on readonly tuples
- Use guards for array index and Map/Record lookups instead of `!` or `as`
- Use `unknown` + runtime checks for `JSON.parse()` results
- Use type generics when possible

# KISS (Keep It Simple)

- Keep solutions simple. We want all code easy to read and maintain.

# Always Check for redundant code

Key rules:
- If there's a function you will build, check if there is something shared already.
- Before adding new code, look for existing **constants**, **duplicate values**, **type guards/narrows**, **queries** (API, DB, or data-fetch), and shared utilities—reuse or extend instead of duplicating.

# Test-Driven Development (TDD)

Key rules:
- **Write tests first**, then implement code to make them pass.
- **Cover edge cases**, error scenarios, and boundary conditions.
- **Prefer E2E tests** (e.g. Cypress) for critical user flows; unit tests where they add value.
