# App flow proposal — next steps

Based on [app-flow-proposal.md](./app-flow-proposal.md): where the product already matches the doc, what to build next, and later phases.

---

## Implemented today (baseline, not gaps)

This section is an **inventory of what already exists** so “Up next” starts from a clear line in the sand. It is **not** a missing-coverage checklist; polish and test tightening for older flows live under **Ongoing** below.

- Requests queue; applicant resubmits via **rejected document rows** while the application stays `pending` (no separate `invalid-documentation` application status for that flow).
- Pre-authorizations role, approved-only queue, amount + term from offerings, borrowing-capacity rules (with admin override where implemented), `pre-authorized` / `denied`, and E2E for the main pre-auth paths.
- Applicant **pre-authorized package** on cuenta: detail CTA plus dedicated offer page (amount, term, copy); required authorization-package uploads enforced before submit; **Submit for review** moves the application to `awaiting-authorization`.
- **`authorizations`** role (DB enum, CASL, company assignments with `agent`), equipo detail: document actions when allowed; **Authorize** gated on all three package documents **approved** (visible hint + tooltip when blocked); **Deny** at `awaiting-authorization`; server rejects `authorized` if the package is incomplete.
- **Equipo document review UX** (requests + authorizations stages): primary actions live on the document form (e.g. save + approve / save + authorize where applicable); **Acciones** trimmed to match (e.g. deny, pre-auth when applicable; approve in menu only when there are no documents to review).
- **Role-based queue navigation** — Each agent role gets a dedicated sidebar link pre-filtered to their queue's status: `requests` → `?status=pending`, `pre-authorizations` → `?status=approved`, `authorizations` → `?status=awaiting-authorization`. Multi-role agents see all applicable links. E2E in **`cypress/e2e/equipo/role-queue-nav.cy.ts`**.
- **E2E (Cypress)** — main paths covered: cuenta applicant flow in **`cypress/e2e/cuenta/applications.cy.ts`** (list, new application, navigation, **application detail documents**, **pre-authorized package**); equipo **`requests-agents`**, **`pre-authorizations-agents`**, **`authorizations-agents`** under **`cypress/e2e/equipo/`** for role-appropriate flows; admin and other areas under **`cypress/e2e/admin/`** and **`cypress/e2e/other/`** (e.g. **`landing.cy.ts`** for `/`).

---

## Up next

- **HR** (`hrStatus`, first discount date) — After authorization, an HR agent (`agent` + `hr` role) reviews the application, sets `firstDiscountDate`, and approves. `hrStatus` is a field on the application; the application status stays `authorized`. New roles `hr` and `dispersions` need to be added to the DB enum.
- **Disbursements** (transfer + receipt → create **Credit**) — After HR approves, a disbursements agent (`agent` + `dispersions`) fills bank transfer data, attaches a receipt, and creates a Credit record from the authorized application.

---

## Later phases

**Automated application-status email tests** — Add regression tests that assert the email pipeline when an application transitions status (e.g. to `authorized`), in a dedicated PR; keep relying on code review for email behavior until then.

**Post-authorization operations** — HR fields (`hrStatus`, `first discount date`), when an **Application** becomes a **Credit**, disbursement queue, transfer + receipt capture, payment schedule generation.

**Credits and payments** — Credits and schedule models, applicant **My credits** + payment history, HR payment confirmation, payments/reporting views for agents.

---

## Ongoing

- Rename fixtures/copy that still imply deprecated “company not ready” gating.
- Update this doc and operational docs when new roles or queues ship.
- When adding flows, add or extend specs under **`cypress/e2e/{cuenta,equipo,admin,other}/`** (flat per folder; use descriptive filenames). Import shared helpers via **`~/cypress/support/...`** and **`~/cypress/tasks`** as needed.
