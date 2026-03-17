# App flow proposal — gap analysis

Based on [app-flow-proposal.md](./app-flow-proposal.md): these are the suggested next steps.

---

## Next steps

1. **Applicant resubmit for review (1.3b)**
   - On dashboard application detail, when status is `invalid-documentation`, show a “Resubmit for review” (or similar) button.
   - Server action: check status is `invalid-documentation`, set application status to `pending`, revalidate paths.

2. **New application without term/amount (align with 1.2)**
   - Make `termOfferingId` and `creditAmount` nullable on applications (or add a “draft”/“initial” phase and set them later).
   - New application form: only general details (e.g. profile, salary, bank) + initial doc uploads; no term/amount selection.
   - Ensure creation sets status to `pending` (or keep `new` and move to `pending` when docs are submitted, per your product choice).

3. **Roles and pre-authorizations (1.4)**
   - Add roles: `pre-authorizations`, `authorizations`, `hr`, `dispersions`, `payments` (DB + ROLES_DOCUMENTATION + middleware if needed).
   - CASL: only `pre-authorizations` (or admin) can set status to `pre-authorized`; only `authorizations` can set `authorized`.
   - Pre-authorizations queue: list applications with status `approved` only; detail page: set loan amount + term (from company term offerings), validations, then Pre-Autorizar / Rechazar.
   - Schema: if application is created without amount/term, pre-auth step fills them; otherwise keep current schema and only allow pre-auth to “confirm” or override (product decision).

4. **HR and disbursements**
   - Add `hrStatus` and `firstDiscountDate` (e.g. on applications, or on a separate table if you prefer).
   - HR view: `authorized` applications; set first discount date and approve HR.
   - Credits table: e.g. `applicationId`, amount, term, status (`dispersed` \| `settled` \| `defaulted`), disbursement date, transfer data, receipt.
   - Disbursements view: list authorized + hr approved; form: bank data + receipt; submit creates Credit and marks dispersed, generates payment schedule.

5. **Credits and payments (Section 2)**
   - Payment schedule table (e.g. per credit: due date, amount, status, hrConfirmedAt).
   - Applicant: “My credits” page (list credits from applications that have been disbursed); payment history per credit.
   - HR: confirm payments. Payments agent: reporting views. Implement `/app/credits` and `/app/payments` pages.

6. **Document types and initial docs**
   - Align document types with proposal (e.g. ID, bank statement, proof of address) for initial submit and/or keep current types and map them in copy; ensure one-submit flow includes required uploads.
