## Up next

### Dispersions agent sees their queue

A dispersions agent (`agent` + `dispersions`) logs in, sees a "Dispersiones" sidebar link, clicks it, and sees only `authorized` applications where HR has approved (`firstDiscountDate IS NOT NULL`).

- Add `'disbursed'` to `applicationStatusEnum` (application final state).
- CASL: dispersions read rules (company-scoped).
- Query: `disbursementPending=true` filter on `getApplicationsForReview` (`firstDiscountDate IS NOT NULL`).
- Sidebar: "Dispersiones" nav link → `/equipo/applications?status=authorized&disbursementPending=true`.
- Application rules: `authorized` → `disbursed` transition; `disbursed` in inactive statuses.
- E2E in **`cypress/e2e/equipo/disbursement-agents.cy.ts`**.

### Dispersions agent can disburse an application

A dispersions agent opens an authorized+HR-approved application, sees a disbursement form, fills transfer reference + amount, attaches a receipt, submits — the application moves to `disbursed` and disappears from the queue.

- CASL: `'disburse'` action on Application, dispersions + admin.
- Schema: add `transferReference`, `receiptStorageKey`, `receiptFileName` to `applications` table.
- Mutation: `disburseApplication` — verify authorized + HR approved, update status to `disbursed` via `updateApplicationWithStatusHistory`, store transfer data.
- Server action + form component (`disburse-form.tsx`): transfer reference input, amount (pre-filled, read-only), receipt file upload, submit.
- Detail page: show form when canDisburse; show read-only info when `disbursed`.
- E2E extends **`cypress/e2e/equipo/disbursement-agents.cy.ts`**.

### Applicant sees disbursed application

After disbursement, the applicant sees their application marked as **"Dispersado"** in cuenta — on the dashboard, the applications list, and the application detail page.

- Update `getApplicationStatusBadgeClass()` in the cuenta application detail page to handle `disbursed` (green/success color).
- Add i18n key `status-disbursed` → "Dispersado".
- Dashboard home page (`/cuenta`): `disbursed` applications no longer show in "in progress" (already inactive via `INACTIVE_APPLICATION_STATUSES`).
- Application detail: show read-only disbursement info (transfer reference, receipt) when status is `disbursed`.
- E2E in **`cypress/e2e/cuenta/applications.cy.ts`** (applicant views disbursed application).

### Credit schema + creation from disbursed applications

When an application is disbursed, the system also creates a **Credit** record linking the application to its financial lifecycle.

- `credits` table: `id`, `applicationId` (FK unique), `status` (`dispersed`), `disbursementDate`, `transferAmount`, `disbursedByUserId`, `createdAt`, `updatedAt`.
- Credit creation triggered inside the existing `disburseApplication` mutation.
- Credit inherits financial data from the application (amount, term, transfer info).

### Applicant views active credit

The applicant sees their active credit in **Mis Préstamos** (`/cuenta/loans`) — the page and sidebar link already exist as a placeholder.

- Query: fetch credits for the authenticated applicant (join credits → applications where `applicantId = userId`).
- `/cuenta/loans` page: list active credits with amount, term, status (`dispersed`), disbursement date, and next payment due.
- Credit detail page (`/cuenta/loans/[id]`): show credit summary — amount, term, rate, first discount date, disbursement date, and payment schedule overview.
- CASL: applicants can read their own credits (`applicantId` check via the linked application).
- E2E in **`cypress/e2e/cuenta/loans.cy.ts`**.

### Payment history for active credit

The applicant opens a credit and sees their full payment schedule with status per payment.

- `credit_payments` table: `id`, `creditId` (FK), `dueDate`, `amount`, `status` (`pending` / `confirmed`), `hrConfirmedAt`, `confirmedByUserId`, `createdAt`.
- Payment schedule generation: triggered when the Credit is created, based on term duration, frequency, first discount date, and credit amount + rate.
- `/cuenta/loans/[id]` detail page: payment history table showing due date, amount, and status (pending / confirmed) per installment.
- HR payment confirmation flow (`hrConfirmedAt`): HR agent marks each payment as confirmed when payroll deduction is applied.
- Payments/reporting views for agents.
- E2E in **`cypress/e2e/cuenta/loans.cy.ts`** (applicant views payment history).
