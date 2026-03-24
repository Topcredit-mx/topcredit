# App flow proposal — next steps

Based on [app-flow-proposal.md](./app-flow-proposal.md): where the product already matches the doc, what to build next, and later phases.

---

## Implemented today (baseline, not gaps)

This section is an **inventory of what already exists** so “Up next” starts from a clear line in the sand. It is **not** a missing-coverage checklist; polish and test tightening for older flows live under **Ongoing** below.

- Requests queue; applicant can resubmit after `invalid-documentation`.
- Pre-authorizations role, approved-only queue, amount + term from offerings, borrowing-capacity rules (with admin override where implemented), `pre-authorized` / `denied`, and E2E for the main pre-auth paths.
- Applicant **pre-authorized package** on cuenta: detail CTA plus dedicated offer page (amount, term, copy); required authorization-package uploads enforced before submit; **Submit for review** moves the application to `awaiting-authorization` so authorizations can see packages that are ready.

---

## Up next

The **authorizations** agent reviews applications that reached `awaiting-authorization` after the applicant submitted the contract and supporting uploads.

### Authorizations stage

- Decide whether `authorized` stays **admin-only** for a short period or you introduce the **`authorizations`** role immediately (role in DB, CASL abilities, assignments).
- **Queue + navigation** — filtered list of `awaiting-authorization` applications (criteria must match the applicant submit step).
- **Detail actions** — review contract + uploaded docs; **Authorize** → `authorized` or **Deny** (reason required).
- E2E: at least one path from “applicant marked ready” → authorize and one → deny.

When authorizations are solid, the next major block is **HR** (`hrStatus`, first discount date), then **disbursements** (transfer + receipt → create **Credit**).

---

## Later phases

**Automated application-status email tests** — Add regression tests that assert the email pipeline when an application transitions status (e.g. to `authorized`), in a dedicated PR; keep relying on code review for the authorizations PR until then.

**Post-authorization operations** — HR fields (`hrStatus`, `first discount date`), when an **Application** becomes a **Credit**, disbursement queue, transfer + receipt capture, payment schedule generation.

**Credits and payments** — Credits and schedule models, applicant **My credits** + payment history, HR payment confirmation, payments/reporting views for agents.

---

## Ongoing

- Tighten tests anywhere `new` vs `pending` is still ambiguous.
- Rename fixtures/copy that still imply deprecated “company not ready” gating.
- Update this doc and operational docs when new roles or queues ship.
