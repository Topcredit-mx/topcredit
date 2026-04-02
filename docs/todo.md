## Up next

### Payment history for active credit

The applicant opens a credit and sees their full payment schedule with status per payment.

- `credit_payments` table: `id`, `creditId` (FK), `dueDate`, `amount`, `status` (`pending` / `confirmed`), `hrConfirmedAt`, `confirmedByUserId`, `createdAt`.
- Payment schedule generation: triggered when the Credit is created, based on term duration, frequency, first discount date, and credit amount + rate.
- `/cuenta/credits/[id]` detail page: payment history table showing due date, amount, and status (pending / confirmed) per installment.
- HR payment confirmation flow (`hrConfirmedAt`): HR agent marks each payment as confirmed when payroll deduction is applied.
- Payments/reporting views for agents.
- E2E in `**cypress/e2e/cuenta/credits.cy.ts**` (applicant views payment history).

