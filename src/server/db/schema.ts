import { relations, sql } from 'drizzle-orm'
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	unique,
	uuid,
} from 'drizzle-orm/pg-core'

export const rolesEnum = pgEnum('roles', [
	'applicant',
	'agent',
	'requests',
	'pre-authorizations',
	'authorizations',
	'hr',
	'dispersions',
	'installments',
	'liquidations',
	'admin',
])

export const employeeSalaryFrequencyEnum = pgEnum('employee_salary_frequency', [
	'bi-monthly',
	'monthly',
])

export const durationTypeEnum = pgEnum('duration_type', [
	'bi-monthly',
	'monthly',
])

export const APPLICATION_STATUS_VALUES = [
	'pending',
	'approved',
	'invalid-documentation',
	'pre-authorized',
	'awaiting-authorization',
	'authorized',
	'disbursed',
	'denied',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUS_VALUES)[number]

export const applicationStatusEnum = pgEnum(
	'application_status',
	APPLICATION_STATUS_VALUES,
)

export const DOCUMENT_TYPE_VALUES = [
	'official-id',
	'proof-of-address',
	'bank-statement',
	'authorization',
	'contract',
	'payroll-receipt',
] as const

export type DocumentType = (typeof DOCUMENT_TYPE_VALUES)[number]

export const documentTypeEnum = pgEnum('document_type', DOCUMENT_TYPE_VALUES)

export const DOCUMENT_STATUS_VALUES = [
	'pending',
	'approved',
	'rejected',
] as const

export type DocumentStatus = (typeof DOCUMENT_STATUS_VALUES)[number]

export const documentStatusEnum = pgEnum(
	'document_status',
	DOCUMENT_STATUS_VALUES,
)

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

// Junction table for user roles (many-to-many relationship)
export const userRoles = pgTable(
	'user_roles',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: rolesEnum('role').notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userId, table.role] }),
	}),
)

export const companies = pgTable('companies', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	domain: text('domain').notNull().unique(),
	rate: numeric('rate', { precision: 5, scale: 4 }).notNull(), // e.g., 0.0250 for 2.5%
	borrowingCapacityRate: numeric('borrowing_capacity_rate', {
		precision: 3,
		scale: 2,
	}), // Optional, nullable. Decimal between 0 and 1 (e.g., 0.30 = 30% of salary)
	employeeSalaryFrequency: employeeSalaryFrequencyEnum(
		'employee_salary_frequency',
	).notNull(),
	active: boolean('active').default(true).notNull(),
	authorizationTemplateStorageKey: text('authorization_template_storage_key'),
	authorizationTemplateFileName: text('authorization_template_file_name'),
	contractTemplateStorageKey: text('contract_template_storage_key'),
	contractTemplateFileName: text('contract_template_file_name'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

export const userCompanies = pgTable(
	'user_companies',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		companyId: integer('company_id')
			.notNull()
			.references(() => companies.id, { onDelete: 'cascade' }),
		assignedAt: timestamp('assigned_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userId, table.companyId] }),
	}),
)

export const terms = pgTable(
	'terms',
	{
		id: serial('id').primaryKey(),
		durationType: durationTypeEnum('duration_type').notNull(),
		duration: integer('duration').notNull(), // e.g. months
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [unique().on(table.durationType, table.duration)],
)

export const termOfferings = pgTable(
	'term_offerings',
	{
		id: serial('id').primaryKey(),
		companyId: integer('company_id')
			.notNull()
			.references(() => companies.id, { onDelete: 'cascade' }),
		termId: integer('term_id')
			.notNull()
			.references(() => terms.id, { onDelete: 'cascade' }),
		disabled: boolean('disabled').default(false).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [unique().on(table.companyId, table.termId)],
)

export const applications = pgTable(
	'applications',
	{
		id: serial('id').primaryKey(),
		applicantId: integer('applicant_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		companyId: integer('company_id')
			.notNull()
			.references(() => companies.id, { onDelete: 'cascade' }),
		termOfferingId: integer('term_offering_id').references(
			() => termOfferings.id,
		),
		creditAmount: numeric('credit_amount', { precision: 12, scale: 2 }),
		applicantRequestedCreditAmount: numeric(
			'applicant_requested_credit_amount',
			{
				precision: 12,
				scale: 2,
			},
		),
		salaryAtApplication: numeric('salary_at_application', {
			precision: 12,
			scale: 2,
		}).notNull(),
		salaryFrequency: employeeSalaryFrequencyEnum('salary_frequency').notNull(),
		payrollNumber: text('payroll_number'),
		rfc: text('rfc'),
		clabe: text('clabe'),
		streetAndNumber: text('street_and_number'),
		interiorNumber: text('interior_number'),
		city: text('city'),
		state: text('state'),
		country: text('country'),
		postalCode: text('postal_code'),
		phoneNumber: text('phone_number'),
		status: applicationStatusEnum('status').notNull(),
		denialReason: text('denial_reason'),
		transferReference: text('transfer_reference'),
		receiptStorageKey: text('receipt_storage_key'),
		receiptFileName: text('receipt_file_name'),
		firstDiscountDate: timestamp('first_discount_date', {
			withTimezone: true,
		}),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			'applications_financial_terms_required_for_late_statuses_check',
			sql`(${table.status} NOT IN ('pre-authorized', 'awaiting-authorization', 'authorized') OR (${table.termOfferingId} IS NOT NULL AND ${table.creditAmount} IS NOT NULL))`,
		),
	],
)

export const applicationStatusHistory = pgTable(
	'application_status_history',
	{
		id: serial('id').primaryKey(),
		applicationId: integer('application_id')
			.notNull()
			.references(() => applications.id, { onDelete: 'cascade' }),
		status: applicationStatusEnum('status').notNull(),
		setByUserId: integer('set_by_user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index('application_status_history_application_id_created_at_idx').on(
			table.applicationId,
			table.createdAt,
		),
	],
)

export const applicationDocuments = pgTable(
	'application_documents',
	{
		id: serial('id').primaryKey(),
		applicationId: integer('application_id')
			.notNull()
			.references(() => applications.id, { onDelete: 'cascade' }),
		documentType: documentTypeEnum('document_type').notNull(),
		status: documentStatusEnum('status').notNull(),
		storageKey: text('storage_key').notNull(),
		fileName: text('file_name').notNull(),
		rejectionReason: text('rejection_reason'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			'application_documents_rejection_reason_check',
			sql`((${table.status} = 'rejected' AND ${table.rejectionReason} IS NOT NULL) OR (${table.status} <> 'rejected' AND ${table.rejectionReason} IS NULL))`,
		),
		index('application_documents_application_id_document_type_idx').on(
			table.applicationId,
			table.documentType,
		),
	],
)

export const CREDIT_STATUS_VALUES = [
	'dispersed',
	'settled',
	'defaulted',
] as const
export type CreditStatus = (typeof CREDIT_STATUS_VALUES)[number]
export const creditStatusEnum = pgEnum('credit_status', CREDIT_STATUS_VALUES)

export const LIQUIDATION_REQUEST_STATUS_VALUES = [
	'pending',
	'accepted',
	'denied',
] as const
export type LiquidationRequestStatus =
	(typeof LIQUIDATION_REQUEST_STATUS_VALUES)[number]
export const liquidationRequestStatusEnum = pgEnum(
	'liquidation_request_status',
	LIQUIDATION_REQUEST_STATUS_VALUES,
)

export const credits = pgTable('credits', {
	id: serial('id').primaryKey(),
	applicationId: integer('application_id')
		.notNull()
		.unique()
		.references(() => applications.id, { onDelete: 'cascade' }),
	status: creditStatusEnum('status').notNull(),
	disbursementDate: timestamp('disbursement_date', {
		withTimezone: true,
	}).notNull(),
	transferAmount: numeric('transfer_amount', {
		precision: 12,
		scale: 2,
	}).notNull(),
	disbursedByUserId: integer('disbursed_by_user_id').references(
		() => users.id,
		{ onDelete: 'set null' },
	),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

export const creditPayments = pgTable('credit_payments', {
	id: serial('id').primaryKey(),
	creditId: integer('credit_id')
		.notNull()
		.references(() => credits.id, { onDelete: 'cascade' }),
	dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
	amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
	principalAmount: numeric('principal_amount', {
		precision: 12,
		scale: 2,
	})
		.notNull()
		.default('0'),
	financingAmount: numeric('financing_amount', {
		precision: 12,
		scale: 2,
	})
		.notNull()
		.default('0'),
	hrConfirmedAt: timestamp('hr_confirmed_at', { withTimezone: true }),
	hrConfirmedByUserId: integer('confirmed_by_user_id').references(
		() => users.id,
		{ onDelete: 'set null' },
	),
	installmentConfirmedAt: timestamp('installment_confirmed_at', {
		withTimezone: true,
	}),
	installmentConfirmedByUserId: integer(
		'installment_confirmed_by_user_id',
	).references(() => users.id, { onDelete: 'set null' }),
	closedByLiquidationAt: timestamp('closed_by_liquidation_at', {
		withTimezone: true,
	}),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

export const creditLiquidationRequests = pgTable(
	'credit_liquidation_requests',
	{
		id: serial('id').primaryKey(),
		creditId: integer('credit_id')
			.notNull()
			.references(() => credits.id, { onDelete: 'cascade' }),
		applicantId: integer('applicant_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		companyId: integer('company_id')
			.notNull()
			.references(() => companies.id, { onDelete: 'cascade' }),
		status: liquidationRequestStatusEnum('status').notNull(),
		denialReason: text('denial_reason'),
		decidedAt: timestamp('decided_at', { withTimezone: true }),
		decidedByUserId: integer('decided_by_user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		liquidatedPrincipal: numeric('liquidated_principal', {
			precision: 12,
			scale: 2,
		}),
		liquidatedFinancing: numeric('liquidated_financing', {
			precision: 12,
			scale: 2,
		}),
		liquidatedScheduledTotal: numeric('liquidated_scheduled_total', {
			precision: 12,
			scale: 2,
		}),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
)

export const queueBulkConfirmJobKindEnum = pgEnum(
	'queue_bulk_confirm_job_kind',
	['hr_deductions', 'installments'],
)

export const queueBulkConfirmJobStatusEnum = pgEnum(
	'queue_bulk_confirm_job_status',
	['pending', 'running', 'completed', 'partial', 'failed'],
)

export type QueueBulkConfirmJobKind =
	(typeof queueBulkConfirmJobKindEnum.enumValues)[number]

export type QueueBulkConfirmJobStatus =
	(typeof queueBulkConfirmJobStatusEnum.enumValues)[number]

export type QueueBulkConfirmJobFailure = {
	paymentId: number
	error: string
}

export const queueBulkConfirmJobs = pgTable('queue_bulk_confirm_jobs', {
	id: serial('id').primaryKey(),
	kind: queueBulkConfirmJobKindEnum('kind').notNull(),
	status: queueBulkConfirmJobStatusEnum('status').notNull().default('pending'),
	createdByUserId: integer('created_by_user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	paymentIds: jsonb('payment_ids').$type<number[]>().notNull(),
	totalCount: integer('total_count').notNull(),
	processedCount: integer('processed_count').notNull().default(0),
	succeededCount: integer('succeeded_count').notNull().default(0),
	failedCount: integer('failed_count').notNull().default(0),
	failures: jsonb('failures').$type<QueueBulkConfirmJobFailure[]>().notNull(),
	errorMessage: text('error_message'),
	startedAt: timestamp('started_at', { withTimezone: true }),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
	roles: many(userRoles),
	companies: many(userCompanies),
	applications: many(applications),
	applicationStatusHistory: many(applicationStatusHistory),
	disbursedCredits: many(credits),
	hrConfirmedCreditPayments: many(creditPayments, {
		relationName: 'hrConfirmedCreditPayments',
	}),
	installmentConfirmedCreditPayments: many(creditPayments, {
		relationName: 'installmentConfirmedCreditPayments',
	}),
	liquidationRequestsDecided: many(creditLiquidationRequests, {
		relationName: 'liquidationRequestsDecidedByUser',
	}),
}))

export const companiesRelations = relations(companies, ({ many }) => ({
	users: many(userCompanies),
	termOfferings: many(termOfferings),
	liquidationRequests: many(creditLiquidationRequests),
}))

export const termsRelations = relations(terms, ({ many }) => ({
	termOfferings: many(termOfferings),
}))

export const termOfferingsRelations = relations(
	termOfferings,
	({ one, many }) => ({
		company: one(companies, {
			fields: [termOfferings.companyId],
			references: [companies.id],
		}),
		term: one(terms, {
			fields: [termOfferings.termId],
			references: [terms.id],
		}),
		applications: many(applications),
	}),
)

export const applicationsRelations = relations(
	applications,
	({ one, many }) => ({
		applicant: one(users, {
			fields: [applications.applicantId],
			references: [users.id],
		}),
		company: one(companies, {
			fields: [applications.companyId],
			references: [companies.id],
		}),
		termOffering: one(termOfferings, {
			fields: [applications.termOfferingId],
			references: [termOfferings.id],
		}),
		documents: many(applicationDocuments),
		statusHistory: many(applicationStatusHistory),
		credit: one(credits),
	}),
)

export const applicationStatusHistoryRelations = relations(
	applicationStatusHistory,
	({ one }) => ({
		application: one(applications, {
			fields: [applicationStatusHistory.applicationId],
			references: [applications.id],
		}),
		setByUser: one(users, {
			fields: [applicationStatusHistory.setByUserId],
			references: [users.id],
		}),
	}),
)

export const creditsRelations = relations(credits, ({ one, many }) => ({
	application: one(applications, {
		fields: [credits.applicationId],
		references: [applications.id],
	}),
	disbursedByUser: one(users, {
		fields: [credits.disbursedByUserId],
		references: [users.id],
	}),
	creditPayments: many(creditPayments),
	liquidationRequests: many(creditLiquidationRequests),
}))

export const creditPaymentsRelations = relations(creditPayments, ({ one }) => ({
	credit: one(credits, {
		fields: [creditPayments.creditId],
		references: [credits.id],
	}),
	hrConfirmedByUser: one(users, {
		relationName: 'hrConfirmedCreditPayments',
		fields: [creditPayments.hrConfirmedByUserId],
		references: [users.id],
	}),
	installmentConfirmedByUser: one(users, {
		relationName: 'installmentConfirmedCreditPayments',
		fields: [creditPayments.installmentConfirmedByUserId],
		references: [users.id],
	}),
}))

export const creditLiquidationRequestsRelations = relations(
	creditLiquidationRequests,
	({ one }) => ({
		credit: one(credits, {
			fields: [creditLiquidationRequests.creditId],
			references: [credits.id],
		}),
		applicant: one(users, {
			fields: [creditLiquidationRequests.applicantId],
			references: [users.id],
		}),
		company: one(companies, {
			fields: [creditLiquidationRequests.companyId],
			references: [companies.id],
		}),
		decidedByUser: one(users, {
			relationName: 'liquidationRequestsDecidedByUser',
			fields: [creditLiquidationRequests.decidedByUserId],
			references: [users.id],
		}),
	}),
)

export const applicationDocumentsRelations = relations(
	applicationDocuments,
	({ one }) => ({
		application: one(applications, {
			fields: [applicationDocuments.applicationId],
			references: [applications.id],
		}),
	}),
)

export const userRolesRelations = relations(userRoles, ({ one }) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id],
	}),
}))

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
	user: one(users, {
		fields: [userCompanies.userId],
		references: [users.id],
	}),
	company: one(companies, {
		fields: [userCompanies.companyId],
		references: [companies.id],
	}),
}))
