# TopCredit — App Flow (start to finish)

High-level, end-to-end flow for the **new app**, from first application to fully paid credit, plus who does what per role.

For what is **implemented today** versus **up next** (queues, E2E coverage, backlog), see [`next-steps.md`](./next-steps.md).

---

## 1. New application (applicant flow)

| Step | Screen | Action | Resulting state |
|------|--------|--------|-----------------|
| 1.1 | **Cuenta** (applicant) | If the applicant has no applications, they are redirected to **New application** (`/cuenta/applications/new`). Signup should collect only **full name** and **email**. | — |
| 1.2 | **New application** (applicant) | Applicant submits **general details** in **one submit**: salary, payroll/employee number, RFC (13 chars), interbank CLABE (18 digits), street and number, optional interior number, city, state, country (default `México`), postal code (5 chars), and phone number. Salary follows the company's pay frequency (`quincenal` / `mensual`). Applicant also uploads initial docs: official ID (INE or passport), proof of address (<= 3 months), bank statement (<= 3 months), and payroll slip (<= 1 month). Applicant does **not** choose term nor credit amount. | Application created with status `pending`. |
| 1.3 | *(agent)* **Requests** (agent, requests) | Requests agent (in `/equipo`, company selected) sees applications in `pending`. Reviews each document and **approves** or **rejects** it with a reason; the application **stays `pending`** until the queue approves the case. Then **Approve** (→ `approved`) or **Deny** (→ `denied`). Only **approved** moves to the next queue; requests agent does not set pre-authorized. | Application stays `pending` (with per-document outcomes) or → `approved` / `denied`. |
| 1.3b | **Application detail** (applicant) | While the application is **`pending`**, if any documents were rejected, the applicant opens **application detail** and **resubmits** those documents (replace or add). The case is reviewed again in the requests queue. | Stays **`pending`** until requests approves. |
| 1.4 | *(agent)* **Pre-authorizations** (agent, pre-authorizations) | Pre-authorizations agent sees only applications in `approved`. For each, **sets loan amount** and **term** (dropdown from company term offerings). Validations: max loan from salary + company capacity; admin can override. Then **Pre-Autorizar** or **Rechazar**. Only this role can move an application to pre-authorized. | Application → `pre-authorized` or `denied`. |
| 1.5 | **Pre-authorized** (applicant) | Applicant sees the pre-authorized offer (amount, term). Signs **contract**, uploads **contract docs**, **payroll receipt**, **authorization**, and any other required docs. **Submit for review** moves the application to the authorizations queue. | Application → **`awaiting-authorization`**. |
| 1.6 | *(agent)* **Authorizations** (agent, authorizations) | Authorizations agent sees **`awaiting-authorization`** applications. Reviews contract + package docs (approve or reject each document as needed). **Authorize** is available only when the authorization package is fully approved; otherwise **Deny** (reason required when denying). | Application → `authorized` or `denied`. |
| 1.7 | *(agent)* **HR** (agent, hr) | HR agent (company-scoped in `/equipo`) sees `authorized` applications for their company. Opens each, sets **first discount date**, and clicks **Aprobar** to approve HR side. | Application stays `authorized`; `hrStatus` set to `approved`. |
| 1.8 | **Authorized** (applicant) | Applicant sees the application as **authorized** and waits for disbursement. | Application stays `authorized`. |
| 1.9 | *(agent)* **Disbursements** (agent, dispersions) | Disbursements agent sees only `authorized` applications with `hrStatus: approved`. For each, fills **bank transfer data** (account, reference, amount), attaches **receipt** (proof of transfer), and submits. The system creates a **Credit** from the application, sets the disbursement date, stores transfer data + receipt, and generates the payment schedule. | Credit created with status `dispersed`. |
| 1.10 | **Dispersed** (applicant) | Applicant sees the credit in **My credits** with total amount, term, schedule, and next payment due. | Credit visible as `dispersed`. |

---

## 2. After the credit

| Step | Who | What |
|------|-----|------|
| 2.1 | Applicant | In **My credits** / cuenta, sees all active credits, each with status (`dispersed`, later `settled`/`defaulted`), payment schedule, and next payment. |
| 2.2 | Applicant | Opens **payment history** for a credit: weekly/bi-weekly expected payments showing due date, amount, and status (pending / confirmed). |
| 2.3 | *(agent – hr)* | HR agent marks each payment as confirmed (`hrConfirmedAt`) when payroll deduction has been applied. |
| 2.4 | Applicant | Once all scheduled payments are confirmed, the credit is marked `settled`; applicant sees the credit as **complete** and moved out of active credits. |
| 2.5 | *(agent – payments)* | Payments agents can view company/credit payments and completed credits views for reporting. |

---

## 3. Application and credit status

- **Application:** `pending` (created in one submit with general details + docs; document rejections keep the case `pending` until requests **Approve**) → `approved` | `denied` → (pre-authorizations sets amount + term) → `pre-authorized` | `denied` → (applicant completes package and submits for review) → `awaiting-authorization` → (authorizations) → `authorized` | `denied`.
- **Credit:** Created only at **Disbursement** from an `authorized` + HR approved application; then `dispersed` → `settled` | `defaulted`.

```mermaid
stateDiagram-v2
    state "Application: pre-authorized" as preauth
    state "Application: awaiting-authorization" as awaiting_auth
    state "Application: pending" as pending
    state "Application: approved" as approved
    state "Application: authorized" as authorized
    state "Application: denied" as denied
    state "Credit: dispersed" as dispersed
    state "Credit: settled" as settled
    state "Credit: defaulted" as defaulted
    [*] --> pending: Applicant submits general details + docs (one submit)
    pending --> approved: Requests agent: approve case
    pending --> denied: Requests agent: deny
    note right of pending: Rejected docs: applicant resubmits while pending
    approved --> preauth: Pre-authorizations agent: set amount + term, Pre-Autorizar
    approved --> denied: Pre-authorizations agent: Rechazar
    preauth --> preauth: Applicant uploads contract + package docs
    preauth --> awaiting_auth: Applicant: submit for review
    awaiting_auth --> authorized: Authorizations agent: package OK + Authorize
    awaiting_auth --> denied: Authorizations agent: deny
    authorized --> authorized: HR agent approves (hrStatus)
    note right of authorized: No credit yet
    authorized --> dispersed: Disbursements agent: transfer + receipt → create Credit
    dispersed --> settled: All payments confirmed
    dispersed --> defaulted: Default
```

---

## 4. Who does what after application submission?

| Role key | Where | Responsibility |
|----------|--------|----------------|
| `requests` | `/equipo` (company selected) | Review `pending` applications: approve/reject **individual documents** (with reasons); **Approve** or **Deny** the case. Set status to **approved** (→ next queue) or **denied**. Only pre-authorizations role can set pre-authorized. |
| `pre-authorizations` | `/equipo` | See only `approved` applications. Set **loan amount** and **term** per application; validations (max loan, capacity). Then **Pre-Autorizar** (→ `pre-authorized`) or **Rechazar** (→ `denied`). Only this role can pre-authorize. |
| `authorizations` | `/equipo` | Review **`awaiting-authorization`** applications (contract + package docs). Approve/reject documents as needed; **Authorize** only when the package is fully approved; deny with reason. |
| `hr` | `/equipo` (company-scoped) | For `authorized` applications, set first discount date and approve HR side (`hrStatus: approved`); after disbursement, confirm payments (`hrConfirmedAt`); see completed credits. |
| `dispersions` | `/equipo` | For authorized + HR approved applications, fill bank transfer data and attach receipt; submit to create Credit and mark it `dispersed`. |
| `payments` | `/equipo` | View and manage company/credit payments and reporting. |
| `admin` | `/equipo` | Configure companies, terms, users, and agent–company assignments; can view data as an agent for any company or overview. |

---

## 5. Roles overview

| Role key | Main access |
|----------|------------|
| `applicant` | `/cuenta`: new application, application detail, my credits, payment history. |
| `agent` | Base role required for `/equipo`. Combined with the keys below to shape access. |
| `requests` | Review pending applications: per-document decisions; approve case (→ approved) or deny. |
| `pre-authorizations` | See approved applications only; set loan amount and term; Pre-Autorizar or Rechazar. |
| `authorizations` | Final approval/denial at **`awaiting-authorization`** (after applicant submits the pre-authorized package for review). |
| `hr` | HR approval and payment confirmation for credits. |
| `dispersions` | Disbursement execution, credit creation, and transfer recording. |
| `payments` | Payments and collections views. |
| `admin` | Companies, terms, users, and assignments; full configuration access. |
