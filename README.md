# TopCredit

[![Cypress Tests](https://img.shields.io/endpoint?url=https://cloud.cypress.io/badge/detailed/zco6oy/main&style=flat&logo=cypress)](https://cloud.cypress.io/projects/zco6oy/runs)

> Plataforma de créditos empresariales para empleados de empresas afiliadas

## 📊 Current Status

### Phase 1: Foundation
- [x] Vercel deployment & CI/CD
- [x] PostgreSQL database (Neon) with Drizzle ORM
- [x] NextAuth authentication with email OTP
- [x] TOTP 2FA with backup codes
- [x] Rate limiting & security
- [x] Professional landing page (Spanish)
- [x] User authentication flows
- [x] Settings & account management
- [x] User flow redirect logic

### Phase 2: Employees & Role Management
- [x] Multi-role system with junction table (userRoles)
- [x] Role management utilities (assignRole, removeRole, setUserRoles)
- [x] Auth utilities for role checks (requireAnyRole, requireAllRoles, hasRole)
- [x] Middleware for route protection
- [x] Unauthorized page (403)
- [x] Employee dashboard layout
- [x] Admin panel for role management UI

#### Phase 2.1: Company CRUD
- [x] Company schema (name, domain, rate, borrowingCapacityRate, employeeSalaryFrequency, active)
- [x] Company queries (list, byId, byDomain, search, activeOnly filter)
- [x] Company mutations (create, update, soft delete)
- [x] Admin UI: Company list page with data table
- [x] Admin UI: Company create page with form
- [x] Admin UI: Company edit page with form
- [x] Domain validation & uniqueness (enforced at DB level)
- [x] Company CRUD E2E tests (access control, display, search, filtering, create, edit, validation)

#### Phase 2.2: Employee-Company Relationship

**US-2.2.1: Admin assigns companies to employees**
As an admin, I want to assign companies to an employee, so that they can manage those companies' data.
- [x] Admin can view employee's current company assignments
- [x] Admin can assign one or more companies to an employee
- [x] Assignment persists and shows in the user row (admin users table)

**US-2.2.2: Admin removes company assignments**
As an admin, I want to remove company assignments from an employee, so that they no longer have access.
- [ ] Admin can see list of assigned companies for an employee
- [ ] Admin can remove company assignments
- [ ] Removal takes effect immediately

**US-2.2.3: Employee sees only assigned companies**
As an employee, I want to see only my assigned companies, so that I focus on relevant data.
- [ ] Sidebar company switcher shows only assigned companies
- [ ] Employee can switch between assigned companies via sidebar
- [ ] Selected company filters all data views
- [ ] Unassigned companies are not visible in switcher

**US-2.2.4: Employee without assignments sees appropriate message**
As an employee without company assignments, I should see a helpful message, so that I understand I need assignments.
- [ ] Empty state message displayed when no assignments
- [ ] No company data accessible

**US-2.2.5: Admin sees general overview dashboard**
As an admin, I want to see a general overview dashboard, so that I can monitor the entire system.
- [ ] Admin dashboard shows aggregated data across all companies
- [ ] Overview is the default view for admins

**US-2.2.6: Admin can view any company as an employee would**
As an admin, I want to select any company and view its data like an assigned employee, so that I can support employees and troubleshoot.
- [ ] Sidebar company switcher shows all companies for admin
- [ ] Admin can select any company via sidebar switcher
- [ ] Selected company view matches what an assigned employee sees
- [ ] Selected company persists on page reload (stored in session/cookie)
- [ ] Admin can switch companies or select "Overview" to return to general dashboard

### Phase 3: Credit Application Flow
- [ ] Users - Credit application creation
- [ ] Users - Credit application status overview
- [ ] Employees - Review, authorize, reject credit applications
- [ ] Users - review rejected applications and resubmit
- [ ] Users - Pre-Authorized Credit application submit contract signing & document uploads
- [ ] Employees - Review, authorize, reject pre-authorized credits
- [ ] Employees - HR Review, authorize, reject pre-authorized credits
- [ ] Users - review authorized credits, wait for disbursement
- [ ] Employees - Credit disbursement and payment tracking
- [ ] Users - Active Credit Dashboard
- [ ] Users - Payment schedule and tracking
- [ ] Employees - Active credits overview and tracking
- [ ] Employees - Payment tracking and management
- [ ] Employees - Completed credits reporting

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

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Email**: Resend
- **Deployment**: Vercel
- **Language**: TypeScript
- **Linting**: Biome
- **Monitoring**: TBD (considering Sentry)

## 📁 Project Structure

```
src/
├── app/                       # Next.js app router
│   ├── (auth)/               # Auth pages (login, signup, verify)
│   ├── apply/                # Credit application
│   ├── dashboard/            # User dashboard
│   ├── settings/             # Account settings
│   └── api/auth/             # NextAuth API routes
├── components/
│   ├── credit/               # Credit application components
│   ├── landing/              # Landing page sections
│   ├── ui/                   # shadcn UI components
│   └── ...                   # Feature components
├── lib/
│   ├── user-flow.ts          # User journey/redirect logic
│   ├── totp.ts               # TOTP utilities
│   └── utils.ts              # Shared utilities
└── server/
    ├── auth/                 # Auth config & actions
    │   ├── config.ts         # NextAuth configuration
    │   ├── actions.ts        # Auth server actions
    │   └── lib.ts            # Auth utilities
    ├── db/
    │   ├── index.ts          # Database client
    │   └── schema.ts         # Drizzle schema
    └── email.ts              # Email utilities
```

## 🚀 Getting Started

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd topcredit
   pnpm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Add your database URL, NextAuth secret, Resend API key, etc.

3. **Database Setup**
   ```bash
   pnpm db:push          # Push schema to database
   pnpm db:studio        # Open Drizzle Studio
   ```

4. **Development**
   ```bash
   pnpm dev              # Start dev server
   pnpm build            # Build for production
   pnpm start            # Start production server
   ```

The goal is to provide accessible, transparent credit to Mexican employees while maintaining rigorous security and compliance standards.
