# App flow proposal — gap analysis

Based on [app-flow-proposal.md](./app-flow-proposal.md): these are the suggested next steps.

---

## Next steps

1. **New application without term/amount (align with 1.2)**
   - Make `termOfferingId` and `creditAmount` nullable on applications (or add a “draft”/“initial” phase and set them later).
   - Signup should collect only full name and email. The application form should collect the rest of the applicant data.
   - New application form: only general details + initial doc uploads; no term/amount selection.
   - General details fields:
     - Employment & income: salary, payroll/employee number, RFC (13 characters).
     - Bank: interbank CLABE (18 digits).
     - Address: street and number, interior number (optional), city, state (Mexican states dropdown), country (dropdown, default `México`), postal code (5 characters).
     - Contact: phone number.
   - Salary should align with the company's pay frequency (for example `quincenal` or `mensual`).
   - Initial required uploads:
     - Official ID: only INE or passport.
     - Proof of address: no older than 3 months.
     - Bank statement: no older than 3 months.
     - Payroll slip: no older than 1 month.
   - Ensure creation sets status to `pending` (or keep `new` and move to `pending` when docs are submitted, per your product choice).

2. **Dedicated roles and scoped transitions (1.4-1.6)**
   - Add roles: `pre-authorizations`, `authorizations`, `hr`, `dispersions`, `payments` (DB + ROLES_DOCUMENTATION + middleware if needed).
   - CASL: only `pre-authorizations` (or admin) can set status to `pre-authorized`; only `authorizations` can set `authorized`.
   - Pre-authorizations queue: list applications with status `approved` only; detail page: set loan amount + term (from company term offerings), validations, then Pre-Autorizar / Rechazar.
   - Schema: if application is created without amount/term, pre-auth step fills them; otherwise keep current schema and only allow pre-auth to “confirm” or override (product decision).

3. **HR and disbursements**
   - Add `hrStatus` and `firstDiscountDate` (e.g. on applications, or on a separate table if you prefer).
   - HR view: `authorized` applications; set first discount date and approve HR.
   - Credits table: e.g. `applicationId`, amount, term, status (`dispersed` \| `settled` \| `defaulted`), disbursement date, transfer data, receipt.
   - Disbursements view: list authorized + hr approved; form: bank data + receipt; submit creates Credit and marks dispersed, generates payment schedule.

4. **Credits and payments (Section 2)**
   - Payment schedule table (e.g. per credit: due date, amount, status, hrConfirmedAt).
   - Applicant: “My credits” page (list credits from applications that have been disbursed); payment history per credit.
   - HR: confirm payments. Payments agent: reporting views. Implement `/app/credits` and `/app/payments` pages.

5. **Document types and initial docs**
   - Align document types with proposal for initial submit and/or keep current types and map them in copy.
   - Initial submit should require: official ID (INE or passport), proof of address (<= 3 months), bank statement (<= 3 months), and payroll slip (<= 1 month).
