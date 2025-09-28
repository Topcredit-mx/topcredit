import {
	boolean,
	decimal,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	image: text('image'),
	emailVerified: timestamp('email_verified', { mode: 'date' }),
	createdAt: timestamp('createdAt', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updatedAt', { withTimezone: true })
		.defaultNow()
		.notNull(),
	firstLogin: boolean('first_login').default(true),
	mfaMethod: text('mfa_method')
		.$type<'email' | 'totp'>()
		.default('email')
		.notNull(),

	// TOTP - Just the essentials
	totpSecret: text('totp_secret'), // Base32 secret (can encrypt later if needed)
	totpEnabled: boolean('totp_enabled').default(false).notNull(),
	totpBackupCodes: text('totp_backup_codes'), // JSON array of backup codes

	// Authentication attempts (covers both email OTP and TOTP)
	loginFailedAttempts: integer('login_failed_attempts').default(0).notNull(),
	lastOtpSentAt: timestamp('last_otp_sent_at', { withTimezone: true }),
})

export const emailOtps = pgTable('email_otps', {
	id: uuid('id').defaultRandom().primaryKey(),
	email: text('email').notNull().unique(),
	code: text('code').notNull(),
	ipAddress: text('ip_address').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

export const sessions = pgTable('session', {
	sessionToken: text('sessionToken').primaryKey(),
	userId: integer('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// Credit Application Status Enum
export const creditStatusEnum = pgEnum('credit_status', [
	'draft', // Application started but not submitted
	'submitted', // Application submitted, pending review
	'under_review', // Being reviewed by underwriting team
	'approved', // Credit approved, ready for disbursement
	'disbursed', // Funds have been disbursed to user
	'active', // Loan is active with payments due
	'paid_off', // Loan fully paid off
	'rejected', // Application rejected
	'cancelled', // Application cancelled by user
	'defaulted', // Loan in default
])

// Credit Applications Table
export const creditApplications = pgTable('credit_applications', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),

	// Application Details
	requestedAmount: decimal('requested_amount', {
		precision: 12,
		scale: 2,
	}).notNull(),
	approvedAmount: decimal('approved_amount', { precision: 12, scale: 2 }),
	interestRate: decimal('interest_rate', { precision: 5, scale: 4 }), // e.g., 0.1250 for 12.50%
	termMonths: integer('term_months'), // Loan term in months

	// Status and Workflow
	status: creditStatusEnum('status').default('draft').notNull(),
	submittedAt: timestamp('submitted_at', { withTimezone: true }),
	reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
	approvedAt: timestamp('approved_at', { withTimezone: true }),
	disbursedAt: timestamp('disbursed_at', { withTimezone: true }),

	// Employment Information (for credit decision)
	employerName: text('employer_name'),
	employeeId: text('employee_id'),
	monthlyIncome: decimal('monthly_income', { precision: 10, scale: 2 }),
	employmentStartDate: timestamp('employment_start_date', { mode: 'date' }),

	// Application Notes and Comments
	applicationNotes: text('application_notes'), // User's notes/reason for loan
	reviewNotes: text('review_notes'), // Internal review notes
	rejectionReason: text('rejection_reason'), // Reason if rejected

	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

// Active Credits/Loans Table
export const credits = pgTable('credits', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	applicationId: integer('application_id')
		.notNull()
		.references(() => creditApplications.id),

	// Loan Details
	principalAmount: decimal('principal_amount', {
		precision: 12,
		scale: 2,
	}).notNull(),
	interestRate: decimal('interest_rate', { precision: 5, scale: 4 }).notNull(),
	termMonths: integer('term_months').notNull(),
	monthlyPayment: decimal('monthly_payment', {
		precision: 10,
		scale: 2,
	}).notNull(),

	// Current Status
	outstandingBalance: decimal('outstanding_balance', {
		precision: 12,
		scale: 2,
	}).notNull(),
	nextPaymentDate: timestamp('next_payment_date', { mode: 'date' }),
	nextPaymentAmount: decimal('next_payment_amount', {
		precision: 10,
		scale: 2,
	}),

	// Loan Status
	status: text('status')
		.$type<'active' | 'paid_off' | 'defaulted'>()
		.default('active')
		.notNull(),

	// Important Dates
	disbursedAt: timestamp('disbursed_at', { withTimezone: true }).notNull(),
	firstPaymentDate: timestamp('first_payment_date', { mode: 'date' }).notNull(),
	maturityDate: timestamp('maturity_date', { mode: 'date' }).notNull(),

	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})
