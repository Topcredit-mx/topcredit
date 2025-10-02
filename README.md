# Topcredit

## Todo

App Setup

- [x] Make it deploy (vercel)
  - [x] App builds locally
  - [x] Publish to github
  - [x] Connect/deploy to vercel
  - [x] vercel url works
  - [x] Setup biome w/autosave
- [-] Setup db (neon postgres w drizzle-orm) & next-auth
  - [x] Create neon dbs for dev preview and prod
  - [x] Setup drizzle-orm
  - [x] Initial schemas for users and accounts
  - [x] migrate db
  - [x] Setup next-auth w/ drizzle adapter
  - [x] Add env vars to vercel
  - [x] Setup credentials provider
  - [x] Basic login view
  - [x] Send OTP email (resend)
  - [x] Verify OTP code
  - [x] Cleanup code / Remove unused stuff
  - [x] Landing home page
  - [x] Users Layout (logout, nav) w/ auth guard (redirect to login if not auth)
  - [x] Users home page (new users requesting credits)
- [ ] End to end tests (cypress)
- [ ] CI for cypress cloud
- [ ] Setup employee schema
  - [ ] Employee schema
  - [ ] Employee login (credentials provider)
- [ ] Employee layout (logout, nav) w/ auth guard (redirect to login if not auth)
  - [ ] Employee home page (list of credit requests)

Features

## Company Management

### Company creation and editing
- Can create company with name, domain, rate, borrowingCapacity, employeeSalaryFrequency
- Can update company details
- Domain must be unique
- Rate must be positive number
- BorrowingCapacity is optional
- EmployeeSalaryFrequency must be "bi-monthly" or "monthly"

### Company listing and overview
- Display all companies with pagination
- Show company name, domain, rate, borrowing capacity
- Filter by company status/activity
- Search by company name or domain

### Company credit assignment and management
- Assign credits to companies
- Track total credit usage vs borrowing capacity
- Display company's active credits
- Prevent exceeding borrowing capacity

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
- HR users linked to specific companies (hrCompanyId)
- HR approval workflow for credits (hrStatus)
- HR payment confirmation (hrConfirmedAt)
- Company employee management

### Role-based access and permissions
- Enforce role-based access to features
- Restrict data access based on user roles
- HR users only see their company's data
- Admin users have full system access

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

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Email**: Resend
- **Deployment**: Vercel
- **Language**: TypeScript
- **Monitoring & Analytics**: (To be decided) maybe Sentry

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # User dashboard
│   ├── login/             # Authentication pages
│   ├── settings/          # User settings
│   └── ...
├── components/
│   ├── credit/            # Credit-related components
│   ├── landing/           # Landing page sections
│   ├── ui/                # shadcn UI components
│   └── ...
├── lib/
│   ├── user-flow.ts       # User journey logic
│   └── ...
└── server/
    ├── auth/              # Auth configuration
    └── db/                # Database schema & client
```

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations: `pnpm db:push`
5. Start dev server: `pnpm dev`

## 📝 Notes

This is an active development project focused on providing accessible credit to employees of affiliated companies in Mexico. The application emphasizes security (2FA), user experience (Spanish UI), and a streamlined credit application process.
