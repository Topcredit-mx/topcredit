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
- **E2E (Cypress)** — main paths covered: cuenta applicant flow in **`applications.cy.ts`** (list, new application, navigation, **application detail documents**, **pre-authorized package**); equipo **`requests-agents`**, **`pre-authorizations-agents`**, **`authorizations-agents`** for role-appropriate flows. Specs live next to the routes they exercise.

---

## Up next

- **Queue + navigation** — Filtered list and/or dedicated nav for **`awaiting-authorization`** if product wants an authorizations **inbox** distinct from the shared applications list (today authorizations specialists use the same list + filters/detail as requests; E2E already exercises specialist behavior on detail).
- When authorizations inbox/navigation is decided (or deferred), the next major build block is **HR** (`hrStatus`, first discount date), then **disbursements** (transfer + receipt → create **Credit**).

---

## Later phases

**Automated application-status email tests** — Add regression tests that assert the email pipeline when an application transitions status (e.g. to `authorized`), in a dedicated PR; keep relying on code review for email behavior until then.

**Post-authorization operations** — HR fields (`hrStatus`, `first discount date`), when an **Application** becomes a **Credit**, disbursement queue, transfer + receipt capture, payment schedule generation.

**Credits and payments** — Credits and schedule models, applicant **My credits** + payment history, HR payment confirmation, payments/reporting views for agents.

---

## Ongoing

- Rename fixtures/copy that still imply deprecated “company not ready” gating.
- Update this doc and operational docs when new roles or queues ship.
- When adding flows, keep **Cypress specs colocated** with the App Router routes they cover (same pattern as merged cuenta `applications.cy.ts` and equipo application specs).
