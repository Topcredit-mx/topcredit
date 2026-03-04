---
name: vertical-slice-plans
description: Use when creating or editing plans in .cursor/plans/, breaking features into PRs, or when the user wants incremental delivery.
---

# Vertical-slice feature plans

Each deliverable = one **vertical slice**: one user capability with backend + UI + E2E in one PR. No backend-only or UI-only PRs. Smallest slice first; state dependencies.

---

## Rules

1. **Goal** = E2E scenarios (list by plan). **Existing** = one line. **Additional info** = only when needed (auth, API, secrets); optional, short.
2. **Per plan:** **E2E** first—list each test explicitly, one line per test (1–3 tests; keep minimum). Match wording of existing E2E tests (see below). Then **Backend** and **UI**—one or two sentences each, no long bullets.
3. **E2E wording:** Use the style of the test file you’re adding to. Examples: [application-documents.cy.ts](src/app/app/applications/application-documents.cy.ts) / [applications.cy.ts](src/app/dashboard/applications/applications.cy.ts) — lowercase, outcome: *"shows X when Y"*, *"agent can ..."*. [users.cy.ts](src/app/app/users/users.cy.ts) — *"should"* + verb.
4. **When a plan task is finished:** Spin up a subagent that runs code-review (e.g. /code-review).

---

## Plan document structure

```markdown
# <Feature title>

**Goal:** E2E scenarios (mirror list under each plan; 1–3 per plan).

**Existing:** One line.

**Additional info:** (optional) Auth, API, etc. Omit if nothing special.

---

- [ ] ## Plan 1 — <Short title>

**E2E:** One line per test. e.g. *shows approved state when agent clicks Aprobar on pending document*.

**Backend:** Schema + mutation; auth; revalidate. (1–2 sentences.)

**UI:** What to add, where, i18n. (1–2 sentences.)

**Deliverable:** One PR. When done, run code-review (subagent).

---

- [ ] ## Plan 2 — <Short title>

**E2E:** (1) … (2) … when multiple tests.

**Backend:** Short. **UI:** Short. **Deliverable:** One PR. Depends on Plan 1. When done, run code-review (subagent).
```

---

## Slice design

First slice = smallest value (e.g. approve only). Next = one capability at a time; extend schema/UI. Shared pieces: introduce in first slice that needs them; later slices extend. Prefer 1 E2E test per plan; 2–3 only when needed.

---

## Checklist

- [ ] Goal = E2E list. Existing one line. Additional info only if needed.
- [ ] Each plan is a checklist item (- [ ] ## Plan N — …). E2E (explicit) → Backend → UI, short. One PR per plan; E2E fails before, passes after. When plan is finished, spin up subagent for code-review. Dependencies stated in deliverable when needed.
