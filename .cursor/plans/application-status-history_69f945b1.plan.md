---
name: application-status-history
overview: Add an `application_status_history` relationship while keeping `applications.status` as the current snapshot. Centralize status writes so every runtime transition appends a history row and current/future detail pages can render an audit trail.
todos:
  - id: add-history-schema
    content: Add `applicationStatusHistory` schema, relations, and a migration with backfill.
    status: pending
  - id: centralize-status-writes
    content: Create a shared status-write helper and route all runtime status changes through it.
    status: pending
  - id: align-transition-rules
    content: Update transition rules to explicitly support `invalid-documentation -> pending` after all rejected documents are re-uploaded for verification.
    status: pending
  - id: load-and-render-history
    content: Expose history on application detail queries/pages and render a basic timeline.
    status: pending
  - id: test-status-audit
    content: Add rule, mutation, and integration coverage for history row creation.
    status: pending
  - id: seed-realistic-history
    content: Update seed and Cypress task helpers so seeded applications include realistic status timelines that match their current status.
    status: pending
isProject: false
---

# Application Status History Plan

## Decisions

- Keep `applications.status` as the current snapshot for simpler reads and minimal UI churn.
- Add a child table for status transitions, with one row per status change.
- Make `setByUserId` nullable so backfills and system-driven transitions can be represented safely.

## Data Model

- Extend `[/Users/davidcantum/workspace/topcredit/src/server/db/schema.ts](/Users/davidcantum/workspace/topcredit/src/server/db/schema.ts)` with an `applicationStatusHistory` table related to `applications`.
- Proposed columns:
  - `id`
  - `applicationId` -> `applications.id`
  - `status` -> same enum as `applications.status`
  - `setByUserId` -> `users.id`, nullable
  - `createdAt` timestamp
- Add relations from `applications` and `users` so history can be loaded cleanly in Drizzle queries.
- Add a migration in `[/Users/davidcantum/workspace/topcredit/drizzle](/Users/davidcantum/workspace/topcredit/drizzle)` that creates the table and backfills one initial row per existing application using its current `status` and `updatedAt`.
- Backfilled and seeded history should stay consistent with the current snapshot status so detail pages never show an empty or impossible audit timeline for an existing application.

## Centralize Writes

- Introduce a shared server-side helper in `[/Users/davidcantum/workspace/topcredit/src/server/mutations.ts](/Users/davidcantum/workspace/topcredit/src/server/mutations.ts)` or a nearby server module that performs both:
  - updating `applications.status` and related fields
  - inserting the matching history row in the same transaction
- Route all runtime status mutations through that helper:
  - reviewer/admin transitions in `[/Users/davidcantum/workspace/topcredit/src/server/mutations.ts](/Users/davidcantum/workspace/topcredit/src/server/mutations.ts)`
  - applicant creation and the required `invalid-documentation -> pending` reset in `[/Users/davidcantum/workspace/topcredit/src/app/dashboard/applications/actions.ts](/Users/davidcantum/workspace/topcredit/src/app/dashboard/applications/actions.ts)`
- Keep transition validation in `[/Users/davidcantum/workspace/topcredit/src/lib/application-rules.ts](/Users/davidcantum/workspace/topcredit/src/lib/application-rules.ts)`, and update the ruleset so `invalid-documentation -> pending` is an explicit allowed transition when all previously rejected documents have been re-uploaded for verification.

## Read Surfaces

- Extend status-bearing queries in `[/Users/davidcantum/workspace/topcredit/src/server/queries.ts](/Users/davidcantum/workspace/topcredit/src/server/queries.ts)` to optionally load history for detail pages first, not list pages.
- Start with the two detail surfaces where audit information is most useful:
  - applicant detail: `[/Users/davidcantum/workspace/topcredit/src/app/dashboard/applications/[id]/page.tsx](/Users/davidcantum/workspace/topcredit/src/app/dashboard/applications/[id]/page.tsx)`
  - reviewer detail: `[/Users/davidcantum/workspace/topcredit/src/app/app/applications/[id]/page.tsx](/Users/davidcantum/workspace/topcredit/src/app/app/applications/[id]/page.tsx)`
- Render a simple reverse-chronological timeline showing status, timestamp, and actor when present.

## Seed And Fixture Consistency

- Update direct application seed paths so applications that start in later statuses also get realistic history rows instead of a single synthetic current-state entry.
- Prioritize seeded `approved`, `pending`, and `invalid-documentation` applications, since these are the most likely to look inconsistent in an audit section if history is missing or unrealistic.
- Cover both app seeds and Cypress helpers that currently insert applications directly:
  - `[/Users/davidcantum/workspace/topcredit/cypress/tasks/index.ts](/Users/davidcantum/workspace/topcredit/cypress/tasks/index.ts)`
  - `[/Users/davidcantum/workspace/topcredit/scripts/seed.ts](/Users/davidcantum/workspace/topcredit/scripts/seed.ts)`
  - `[/Users/davidcantum/workspace/topcredit/scripts/seed.fixtures.ts](/Users/davidcantum/workspace/topcredit/scripts/seed.fixtures.ts)`
  - `[/Users/davidcantum/workspace/topcredit/src/app/app/applications/applications-review.fixtures.ts](/Users/davidcantum/workspace/topcredit/src/app/app/applications/applications-review.fixtures.ts)`
- Seed histories should reflect plausible real flows that lead to the current snapshot status, so the rendered timeline looks exactly like a real application path rather than test-only synthetic data.
- Lower-risk fixture/test updates can stay minimal as long as seeded detail pages do not render empty history sections or logically impossible timelines.

## Tests

- Extend `[/Users/davidcantum/workspace/topcredit/src/lib/application-rules.test.ts](/Users/davidcantum/workspace/topcredit/src/lib/application-rules.test.ts)` to cover the final transition model, including `invalid-documentation -> pending` as a supported transition.
- Add server-side tests around the shared status-write helper so each transition both updates the application row and appends exactly one history record.
- Add one integration/E2E path for the document re-upload flow to confirm that once all rejected documents are replaced, the application returns to `pending` and writes a history row for that reset.
- Add coverage for seeded/history-backed detail pages so applications rendered from fixtures do not show empty or logically impossible timelines for their current status.

## Notes

- Existing list pages can continue reading `applications.status` unchanged, so this plan avoids broad UI/query churn while still making history available where it matters.

