# App flow proposal — next steps

Based on [app-flow-proposal.md](./app-flow-proposal.md): where the product already matches the doc, what to build next, and later phases.

---

## Implemented today (baseline, not gaps)

This section is an **inventory of what already exists** so “Up next” starts from a clear line in the sand. It is **not** a missing-coverage checklist; polish and test tightening for older flows live under **Ongoing** below.

- Requests queue; applicant resubmits via **rejected document rows** while the application stays `pending` (no separate `invalid-documentation` application status for that flow).
- Pre-authorizations role, approved-only queue, amount + term from offerings, borrowing-capacity rules (with admin override where implemented), `pre-authorized` / `denied`, and E2E for the main pre-auth paths.
- Applicant **pre-authorized package** on cuenta: detail CTA plus dedicated offer page (amount, term, copy); required authorization-package uploads enforced before submit; **Submit for review** moves the application to `awaiting-authorization`.
- **`authorizations`** role (DB enum, CASL, company assignments with `agent`), equipo detail: document actions when allowed; **Authorize** gated on all three package documents **approved** (visible hint + tooltip when blocked); **Deny** at `awaiting-authorization`; server rejects `authorized` if the package is incomplete; E2E `authorizations-agents.cy.ts` (specialist + admin paths).

---

## Up next

- **Queue + navigation** — filtered list of `awaiting-authorization` applications with dedicated nav or filters if product wants a separate authorizations inbox (today authorizations use the shared applications list + detail).
- When authorizations are solid, the next major block is **HR** (`hrStatus`, first discount date), then **disbursements** (transfer + receipt → create **Credit**).

---

## Later phases

**Automated application-status email tests** — Add regression tests that assert the email pipeline when an application transitions status (e.g. to `authorized`), in a dedicated PR; keep relying on code review for email behavior until then.

**Post-authorization operations** — HR fields (`hrStatus`, `first discount date`), when an **Application** becomes a **Credit**, disbursement queue, transfer + receipt capture, payment schedule generation.

**Credits and payments** — Credits and schedule models, applicant **My credits** + payment history, HR payment confirmation, payments/reporting views for agents.

---

## Ongoing

- Rename fixtures/copy that still imply deprecated “company not ready” gating.
- Update this doc and operational docs when new roles or queues ship.
