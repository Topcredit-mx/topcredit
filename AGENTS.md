# Agent instructions

Defaults for how agents write and test code in this repository.

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

## Plans

- Plans must be **concise**: state the outcome, a short bullet list of file-level actions, and how to verify. Avoid long narrative, repeated context, and diagrams unless they save real ambiguity.

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
- If in plan mode, the todo's should clearly follow a "Red-Green-Refactor" cycle: write a failing test, write minimal code to pass, and refactor
- Between each todo, (Red, Green, Refactor) you should run unit or e2e tests only for the affected tests.
- Do **not** run the full E2E or unit test suite at the end of a task. Only run the tests related to the changes you made.

## Commits (Husky vs. cloud agents)

The repo's Husky `pre-commit` hook runs `bun run check && bun run typecheck` before every commit when Git is using the hooks from `bun install` (the `prepare` script installs Husky into `.husky`).

Some environments (including Cursor agents) set Git's `core.hooksPath` to a separate hook directory, so **Husky's `.husky/pre-commit` does not run** even though the project is configured for it. In those environments you must run the same checks yourself **before** `git commit`:

`bun run validate`

That matches what `.husky/pre-commit` runs and catches the same Biome/typecheck failures as CI's lint and type-check steps.

## Cursor Cloud specific instructions

### Environment

- **Node.js 24.15.0** is required (pinned in `.node-version`) for unit tests (`node:test`).
- **Bun** is the package manager and script runner. Install via `curl -fsSL https://bun.sh/install | bash` or use `oven-sh/setup-bun` in CI.
- `.env` must exist with `DATABASE_URL`, `AUTH_SECRET`, `EMAIL_FROM`, `RESEND_API_KEY`. Set `E2E_OTP_CODE=123456` to bypass real emails (E2E mode uses a fixed OTP). Secrets are injected as environment variables by the Cloud Agent; write them to `.env` before starting the dev server.

### Running services

- **Dev server:** `bun run dev` (port 3000). Reads `.env` automatically.
- **DB migrations:** `bun run db:migrate` applies pending Drizzle migrations against the Neon Postgres instance.
- **DB seed:** `bun run db:seed` populates test data (users, companies, applications, credits). Admin login: `admin@topcredit.mx` with OTP `123456`.

### Key commands

| Task | Command |
|------|---------|
| Lint | `bun run check` (Biome) |
| Typecheck | `bun run typecheck` |
| Both (pre-commit equivalent) | `bun run validate` |
| Unit tests | `bun run test:unit` |
| E2E tests | `bun run test:e2e` (start `bun run dev` on port 3000 first; `DATABASE_URL` set → global setup runs `db:nuke:migrate` before tests) |
| Playwright install | `bunx playwright install chromium --with-deps` |

### Gotchas

- Bun builds native addons automatically during install. No allowlist is needed (unlike pnpm's `onlyBuiltDependencies`).
- The app validates env vars at startup via `src/env.js` (Zod + `@t3-oss/env-nextjs`). Set `SKIP_ENV_VALIDATION=1` to bypass if needed for tooling that doesn't require a running app.
- The database is remote (Neon serverless Postgres) — no local Postgres needed.
- E2E with `DATABASE_URL`: Playwright global setup nukes and migrates the DB before tests. Use a **single** `bun run dev` on port 3000; if a dev server is stuck or duplicated, stop it and start again before `bun run test:e2e`.
