## Up next

### Credit schema + creation + applicant views active credit

When an application is disbursed, the system creates a **Credit** record. The applicant sees their active credits on `/cuenta/credits`.

- `credits` table: `id`, `applicationId` (FK unique), `status` (`dispersed`), `disbursementDate`, `transferAmount`, `disbursedByUserId`, `createdAt`, `updatedAt`.
- Credit creation triggered inside the existing `disburseApplication` mutation.
- Credit inherits financial data from the application (amount, term, transfer info).
- Query: fetch credits for the authenticated applicant (join credits → applications where `applicantId = userId`).
- `/cuenta/credits` page: list active credits with amount, status (`dispersed`), and disbursement date.
- CASL: applicants can read their own credits (`applicantId` check via the linked application).
- E2E in **`cypress/e2e/cuenta/credits.cy.ts`**.

### Credit detail page

- Credit detail page (`/cuenta/credits/[id]`): show credit summary — amount, term, rate, first discount date, disbursement date, and payment schedule overview.

### Payment history for active credit

The applicant opens a credit and sees their full payment schedule with status per payment.

- `credit_payments` table: `id`, `creditId` (FK), `dueDate`, `amount`, `status` (`pending` / `confirmed`), `hrConfirmedAt`, `confirmedByUserId`, `createdAt`.
- Payment schedule generation: triggered when the Credit is created, based on term duration, frequency, first discount date, and credit amount + rate.
- `/cuenta/credits/[id]` detail page: payment history table showing due date, amount, and status (pending / confirmed) per installment.
- HR payment confirmation flow (`hrConfirmedAt`): HR agent marks each payment as confirmed when payroll deduction is applied.
- Payments/reporting views for agents.
- E2E in **`cypress/e2e/cuenta/credits.cy.ts`** (applicant views payment history).
