# Project instructions

Defaults for how to write and test code in this repository.

## TypeScript

- **Never** use `as SomeType` (except `as const`)
- **Never** use `!` non-null assertion
- **Never** use `any`
- Use type narrowing, guards, and `Set<string>` for `.includes()` on readonly tuples
- Use guards for array index and Map/Record lookups instead of `!` or `as`
- Use `unknown` + runtime checks for `JSON.parse()` results
- Use type generics when possible

## Simplicity

- Keep solutions simple. Prefer code that is easy to read and maintain.

## Comments

- Do **not** add comments on functions (including JSDoc / docstrings) unless strictly necessary.
- Reserve them for non-obvious invariants, safety or compliance notes, or other cases where the code alone cannot carry the meaning clearly.
- Prefer clear naming and structure over explaining what the code does in a comment.

## Reuse and exploration

- Before adding a new function or module, check whether something shared already exists.
- Before adding new code, look for existing **constants**, **duplicate values**, **type guards/narrows**, **queries** (API, DB, or data-fetch), and shared utilities—reuse or extend instead of duplicating.

## Test-driven development

- **Write tests first**, then implement code to make them pass.
- **Cover edge cases**, error scenarios, and boundary conditions.
- **Prefer E2E tests** (e.g. Cypress) for critical user flows; unit tests where they add value.
- If in plan mode, the todos should clearly follow a "Red-Green-Refactor" cycle: write a failing test, write minimal code to pass, and refactor.
- Between each todo (Red, Green, Refactor), run unit or E2E tests only for the affected tests.
- The full test suite should only be tested at the end.
