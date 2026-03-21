# App flow proposal — next steps

Based on [app-flow-proposal.md](./app-flow-proposal.md): where the product already matches the doc, what to build next, and later phases.

---

## Implemented today (baseline, not gaps)

This section is an **inventory of what already exists** so “Up next” starts from a clear line in the sand. It is **not** a missing-coverage checklist; polish and test tightening for older flows live under **Ongoing** below.

- Requests queue; applicant can resubmit after `invalid-documentation`.
- Pre-authorizations role, approved-only queue, amount + term from offerings, borrowing-capacity rules (with admin override where implemented), `pre-authorized` / `denied`, and E2E for the main pre-auth paths.

---

## Up next

After pre-authorization, the **applicant** completes contract and supporting uploads while the application stays `pre-authorized`; only then does the **authorizations** agent review.

### Applicant flow at `pre-authorized`

- Show the **pre-authorized offer** on cuenta application detail: amount, term, and clear copy that the applicant must complete the next steps.
- Define the **required uploads** for this stage (contract, payroll receipt, authorization, and any extras the business wants) and enforce them on submit.
- **Submit for review** — keep status `pre-authorized` but make it obvious to agents that the package is ready for authorizations (e.g. flag, timestamp, or document completeness; exact mechanism TBD).
- Align cuenta UX and copy with whatever checklist you lock in.

### Authorizations stage

- Decide whether `authorized` stays **admin-only** for a short period or you introduce the **`authorizations`** role immediately (role in DB, CASL abilities, assignments).
- **Queue + navigation** — filtered list of `pre-authorized` applications that are ready for authorization review (criteria must match how the applicant submit step signals “ready”).
- **Detail actions** — review contract + uploaded docs; **Authorize** → `authorized` or **Deny** (reason required).
- E2E: at least one path from “applicant marked ready” → authorize and one → deny.

When applicant pre-authorized flow and authorizations are solid, the next major block is **HR** (`hrStatus`, first discount date), then **disbursements** (transfer + receipt → create **Credit**).

---

## Later phases

**Post-authorization operations** — HR fields (`hrStatus`, `first discount date`), when an **Application** becomes a **Credit**, disbursement queue, transfer + receipt capture, payment schedule generation.

**Credits and payments** — Credits and schedule models, applicant **My credits** + payment history, HR payment confirmation, payments/reporting views for agents.

---

## Ongoing

- Tighten tests anywhere `new` vs `pending` is still ambiguous.
- Rename fixtures/copy that still imply deprecated “company not ready” gating.
- Update this doc and operational docs when new roles or queues ship.
