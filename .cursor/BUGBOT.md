# Bugbot review rules – TopCredit

Review every PR according to these project standards. Primary focus: **E2E test coverage for new/changed feature code**.

---

## 1. E2E test coverage (primary focus)

- List all **new or meaningfully changed** files in the PR. Ignore docs, config, lockfiles.
- For each new or changed **feature code** under `src/` (pages, server actions, app routes, components that affect user flows):
  - Check if there is a corresponding E2E spec. We use **Cypress** with specs in `cypress/e2e/**/*.cy.{js,ts}` (grouped under `cuenta/`, `equipo/`, `admin/`, or `other/`).
  - If there is **no clear E2E coverage** for new user-facing behavior, request adding or extending a `.cy.ts` spec and explain what should be covered (happy path + important edge cases).
- **Do not** require E2E for:
  - Pure refactors
  - Types only
  - Internal utils that don’t change user-facing behavior

---

## 2. Project E2E standards

When reviewing or requesting E2E tests, enforce:

- **Scope:** Happy path + some edge cases. Not every case is required; the rest can be noted in comments as future tests.
- **Data setup:** Use `cypress/tasks` for any DB-related setup (e.g. creating test data).
- **Hooks:** Use `before`, `after`, `beforeEach`, `afterEach` correctly for setup and teardown.
- **Language:** E2E tests must be written in **English**.
- **Selectors:** Do **not** use `data-testid`. Use **role**, **label**, **text content**, or similar.
- **Assertions:** Use **`should()`** assertions.

---

## 3. Code quality and consistency

- Note obvious **code quality**, **security**, or **consistency** issues.
- Project standards (for context when reviewing implementation):
  - Form submissions: use **form actions**.
  - Prefer **server components** where possible.
  - Avoid **useEffect** unless necessary.
  - Data fetching: use `src/server/queries`; mutations/actions: use `src/server/mutations`. Never use Drizzle DB directly in pages.
  - UI: **shadcn/ui** and **Tailwind**; use Biome for formatting and linting; **pnpm** for package management.
  - User-facing text must be in **Spanish**.

---

## 4. Review output

- Be **concise**.
- Use **inline comments** for specific lines where relevant.
- Post **one top-level summary** that includes:
  - An **E2E coverage checklist** (which new/changed features have specs, which don’t and what to add).
  - Any other highlights (quality, security, consistency).
