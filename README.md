# TopCredit

[![Cypress Tests](https://img.shields.io/endpoint?url=https://cloud.cypress.io/badge/detailed/zco6oy/main&style=flat&logo=cypress)](https://cloud.cypress.io/projects/zco6oy/runs)

> Plataforma de créditos empresariales para empleados de empresas afiliadas

## Current status

### Phase 1: Foundation
- [x] Next.js 16, Vercel deploy
- [x] PostgreSQL (Neon) + Drizzle ORM, migrations
- [x] NextAuth: email OTP, TOTP 2FA, backup codes
- [x] Rate limiting & security (login attempts, etc.)
- [x] Landing page (Spanish)
- [x] Auth flows: login, signup, verify OTP/TOTP/backup-code, setup TOTP
- [x] Settings: profile, security (email, TOTP), nav
- [x] Proxy (`src/proxy.ts`): redirect logged-in users from `/`, `/login`, `/signup`, verify-* to dashboard/app; protect `/dashboard`, `/app`, `/settings` by role; sign-out redirects to `/login`
- [x] Email verification: unverified users see warning on dashboard/app
- [x] E2E: login (redirects, roles), home/landing, settings (profile, security)
- [x] CI: typecheck on push; Cypress E2E (Neon branch per run); prod DB workflow (generate + drift check + migrate on push to main when schema/drizzle change, production env)
- [ ] i18n: UI is Spanish-only (hardcoded); no locale switching or translation layer yet

### Phase 2: Employees & roles
- [x] Roles: customer, employee, requests, admin (junction table `user_roles`)
- [x] Auth helpers: requireAuth, requireAnyRole, requireAllRoles, hasRole, redirectIfLoggedIn
- [x] Proxy: role-based route protection (dashboard = customer, app = employee, admin routes = admin)
- [x] Unauthorized page (403)
- [x] App layout & sidebar (company switcher, nav, user menu)
- [x] Admin: role management UI (users table, assign/remove roles)

#### Phase 2.1: Company CRUD
- [x] Company schema & queries & mutations (create, update, list, byDomain, search, active filter)
- [x] Admin UI: companies list, create, edit; domain validation & uniqueness
- [x] E2E: companies (access, list, search, create, edit), users (access, role checkboxes)

#### Phase 2.2: Employee–company relationship
- [x] **US-2.2.1** Admin assigns companies to employees (UI + persist)
- [x] **US-2.2.2** Admin removes company assignments
- [x] **US-2.2.3** Employee sees only assigned companies in switcher; selected company filters data; inactive shown disabled
- [x] **US-2.2.4** Employee with no assignments sees empty state, no company data
- [x] **US-2.2.5** Admin overview dashboard (aggregated, no company selected)
- [x] **US-2.2.6** Admin can pick any company in switcher, view as employee; “Vista general” to return; selection in cookie
- [x] E2E: company switcher, admin company switcher, employee no assignments, employee no company picked, admin overview dashboard

### Phase 3: Credit application flow
- [ ] Users: credit application creation, status overview
- [ ] Employees: review / authorize / reject applications
- [ ] Users: resubmit rejected, pre-authorized flow (contract, docs)
- [ ] Employees: pre-authorized review, HR review
- [ ] Disbursement, active credit dashboard, payment schedule and tracking
- [ ] Employees: active credits overview, payment management, completed credits reporting

---

## 📚 Feature Specifications

*The following sections define the complete feature set that will be built incrementally.*

## Company Management

### Company creation and editing
- Can create company with name, domain, rate, borrowingCapacityRate, employeeSalaryFrequency, active
- Can update company details
- Domain must be unique and valid email domain format
- Rate must be positive number
- BorrowingCapacityRate is optional, decimal between 0 and 1 (e.g., 0.30 = 30% of employee salary)
- EmployeeSalaryFrequency must be "bi-monthly" or "monthly"
- Active defaults to true (inactive = soft delete)

### Company listing and overview
- Display all companies with pagination
- Show company name, domain, rate, borrowing capacity rate (as percentage), active status
- Filter by active/inactive status
- Search by company name or domain

### Company credit assignment and management
- Assign credits to companies
- Calculate max loan amount based on borrowingCapacityRate (percentage of salary)
- Display company's active credits
- Use borrowingCapacityRate in max loan calculations

### Company term assignment (assign-term-form, new-term-form)
- Create new terms with durationType (bi-monthly/monthly) and duration
- Assign existing terms to companies via termOfferings
- Validate term duration is positive
- Display assigned terms per company

### Company credits overview and tracking
- Show all credits associated with company
- Display credit status distribution
- Calculate total dispersed amounts
- Track payment performance

## Credit Management

### Credit application creation (new-credit)
- Create credit with creditAmount, termOffering, borrower
- Status starts as "new"
- CreditAmount must not exceed maxLoanAmount
- Associate with specific company termOffering
- Upload required documents (authorization, contract, payrollReceipt)

### Credit listing and filtering
- Display all credits with status, amount, borrower info
- Filter by status: new, pending, invalid-documentation, authorized, denied, dispersed, settled, defaulted
- Filter by date ranges (createdAt, dispersedAt)
- Search by borrower name or email

### User's personal credits view (my-credits)
- Show only credits where current user is borrower
- Display credit status, amount, payments
- Show payment schedule and next payment due
- Access to credit documents

### Company completed credits tracking
- List credits with status "settled" or "defaulted"
- Calculate completion rates and performance metrics
- Show total amounts dispersed vs repaid
- Track average settlement time

### Credit status management and workflows
- Transition: new → pending → invalid-documentation → authorized/denied → dispersed → settled/defaulted
- Cannot skip status steps
- Set dispersedAt when status becomes "dispersed"
- Track reason for denials

## Authorization & Approval Workflows

### Pending authorizations processing
- List credits with status "pending"
- Review uploaded documents (authorization, contract, payrollReceipt)
- Approve/reject each document with status and rejection reasons
- Progress to "authorized" when all docs approved

### Pre-authorizations management
- Manage users with status "pre-authorization"
- Review user documents (identity, payrollReceipt, proofOfAddress, bankStatement)
- Approve/deny user pre-authorization
- Set user status to "pre-authorized" or "denied"

### Approval/denial workflows
- Record hrStatus (approved/denied) for credits
- Capture rejection reasons for denials
- Send notifications based on decision
- Track approval/denial statistics

### Authorization routing and assignment
- Route credits to appropriate authorizers based on amount
- Assign credits to staff based on roles (pre_authorizations, authorizations)
- Track processing times and workload distribution
- Escalate overdue authorizations

## Financial Operations

### Company payments tracking and management
- Create payment schedules based on term duration and durationType
- Track payment status: expected vs actual (paidAt)
- Calculate expectedAmount vs actual amount
- Handle bi-monthly vs monthly payment frequencies

### Dispersion calculations and processing
- Calculate loan amount based on creditAmount and company rate
- Set firstDiscountDate for payment schedule
- Generate amortization schedule
- Track dispersal amounts and dates

### Payment status monitoring
- Monitor overdue payments (expectedAt < current date, paidAt = null)
- Track HR confirmation (hrConfirmedAt)
- Calculate total outstanding amounts
- Generate payment reports

## Request Management

### Request creation and submission
- Users can submit various types of requests
- Capture request details and supporting documents
- Assign request numbers and timestamps
- Route to appropriate department based on type

### Request processing workflows
- Track request status through workflow stages
- Assign to appropriate staff based on roles
- Set processing timelines and SLAs
- Update requestors on progress

### Request status tracking
- Display current status and progress
- Show processing history and actions taken
- Provide estimated completion times
- Send status change notifications

## User & Staff Management

### User management and administration
- Manage user profiles with complete address/bank info
- Track user status: new → pending → invalid-documentation → pre-authorization → pre-authorized/denied
- Handle document uploads and approvals (identity, payrollReceipt, proofOfAddress, bankStatement)
- Manage employee numbers and salary info

### Staff-specific dashboards and workflows
- Role-based access: requests, pre_authorizations, authorizations, dispersions, payments, admin, companies
- Display work queues based on user roles
- Track productivity and processing metrics
- Provide role-specific navigation (SidebarRoutes)

### HR integration and processes
- Employees can be assigned to one or many companies (many-to-many)
- Employees without company assignments see no company data
- Employees with assignments see only their assigned companies' data
- HR approval workflow for credits (hrStatus)
- HR payment confirmation (hrConfirmedAt)
- Company employee management

### Role-based access and permissions
- Enforce role-based access to features
- Restrict data access based on user roles and company assignments
- Employees with company assignments see only their assigned companies' data
- Employees without assignments see no company data
- Admin users have full system access (see all data)

## Activity & Monitoring

### Activity tracking and logging
- Log all system events with timestamps
- Track user actions and system changes
- Maintain audit trail for compliance
- Generate activity reports

### Credit monitoring and alerts
- Monitor credit status changes
- Alert on overdue payments
- Track document approval deadlines
- Generate risk alerts

### Dashboard analytics and reporting
- Real-time dashboard metrics
- Credit portfolio performance
- Payment collection rates
- User status distributions

## Authentication Workflows

### User registration and confirmation
- Email-based registration process
- Email confirmation required for activation
- Password strength requirements
- Account activation workflow

### Password generation and reset
- Secure password reset via email
- Temporary password generation
- Password expiration handling
- Security question validation

### Email confirmation processes
- Send confirmation emails for registration
- Handle confirmation success/failure
- Resend confirmation emails
- Track confirmation attempts

## Notification System

### Event-driven notifications
- Generate notifications for all NotificationType events:
  - PendingUser, PreAuthorizationUser, DeniedUser
  - InvalidDocumentationUser, PreAuthorizedUser
  - PendingCredit, InvalidDocumentationCredit
  - AuthorizedCredit, DeniedCredit, DispersedCredit, InstalledCredit
- Store notification messages and metadata
- Track notification delivery and read status

### Document Management
- Handle file uploads with metadata (contentType, filename, size, uploadedAt)
- Track document status: pending → approved/rejected
- Store rejection reasons for denied documents
- Support multiple document types per entity
- Maintain document audit trail

## Data Integrity & Validation

### Address validation
- Support all Mexican states (StateOfMexico enum)
- Validate postal codes and city names
- Ensure address completeness for user profiles

### Financial calculations
- Accurate amortization calculations
- Interest rate applications
- Payment schedule generation
- Currency handling and precision

### Document validation
- File type validation based on contentType
- File size limits and validation
- Required document checks per workflow stage
- Document expiration handling

---

## Tech stack

- Next.js 16 (App Router), TypeScript
- PostgreSQL (Neon), Drizzle ORM
- NextAuth (email OTP, TOTP, backup codes)
- Tailwind v4, shadcn/ui
- Resend (email), Vercel (deploy), Biome (lint)
- **i18n:** Spanish only, hardcoded (no translation layer yet; see [i18n](#i18n) below)

## Getting started

```bash
git clone <repo-url>
cd topcredit
pnpm install
cp .env.example .env   # then fill in values
pnpm db:push           # sync schema to local DB
pnpm dev
```

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (Neon) |
| `AUTH_SECRET` | NextAuth secret (e.g. `openssl rand -base64 32`) |
| `AUTH_URL` | App URL (`http://localhost:3000` in dev) |
| `EMAIL_FROM` | Sender address for Resend |
| `RESEND_API_KEY` | Resend API key |

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm db:generate` | Generate migration files from schema |
| `pnpm db:migrate` | Apply migrations (use in prod) |
| `pnpm db:push` | Push schema to DB without migration files (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:reset` | Wipe DB data (dev); `--seed` to seed after |
| `pnpm typecheck` | Run TypeScript check |
| `pnpm check` | Run Biome lint |
| `pnpm cy:open` | Open Cypress UI |
| `pnpm cy:run` | Run Cypress E2E headless |

## Database

- **Local dev:** `pnpm db:push` to sync schema, or `pnpm db:migrate` if you use migrations.
- **Production:** Migrations only. Commit files under `drizzle/` and `src/server/db/schema.ts`; CI runs `db:generate` (fails if schema changed but migrations not committed), then `db:migrate` against the production DB.
- Schema lives in `src/server/db/schema.ts`; migration files in `drizzle/`.

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| Type Check | Every push | `pnpm typecheck` |
| Cypress Tests | Every push | E2E tests (Neon branch per run, then teardown) |
| Prod DB | Push to `main` when `drizzle/**` or `src/server/db/schema.ts` change | Runs in `production` env: generate, fail on uncommitted migration drift, then `db:migrate`. Needs `DATABASE_URL` in production environment secrets. |

## Project structure

```
src/
├── app/              # Routes (dashboard, app, settings, login, api/auth)
├── components/       # UI + feature components
├── lib/              # Shared utils, auth-utils, totp
├── server/           # db (schema, client), auth (config, users), mutations, queries
└── proxy.ts          # Next 16 proxy (auth redirects, route protection)
```

## i18n

**Current:** All UI copy is in Spanish and hardcoded. Root layout sets `lang="es"` and metadata uses `locale: 'es_MX'`. No translation library or locale switching.

**To add later:** Use a single default locale (e.g. `es`) and either (1) next-intl (or similar) with App Router, or (2) a simple `messages/{locale}.json` + `t(key)` helper and locale from cookie or path. Then move strings into message keys and add a language switcher if needed.

---

The goal is to provide accessible, transparent credit to Mexican employees while maintaining rigorous security and compliance standards.
