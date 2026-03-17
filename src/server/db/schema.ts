import { relations, sql } from 'drizzle-orm'
import {
	boolean,
	check,
	index,
	integer,
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
	'new',
	'pending',
	'approved',
	'invalid-documentation',
	'pre-authorized',
	'authorized',
	'denied',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUS_VALUES)[number]

export const applicationStatusEnum = pgEnum(
	'application_status',
	APPLICATION_STATUS_VALUES,
)

export const DOCUMENT_TYPE_VALUES = [
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

export const terms = pgTable('terms', {
	id: serial('id').primaryKey(),
	durationType: durationTypeEnum('duration_type').notNull(),
	duration: integer('duration').notNull(), // e.g. months
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

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

export const applications = pgTable('applications', {
	id: serial('id').primaryKey(),
	applicantId: integer('applicant_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	termOfferingId: integer('term_offering_id')
		.notNull()
		.references(() => termOfferings.id),
	creditAmount: numeric('credit_amount', { precision: 12, scale: 2 }).notNull(),
	salaryAtApplication: numeric('salary_at_application', {
		precision: 12,
		scale: 2,
	}).notNull(),
	status: applicationStatusEnum('status').notNull(),
	denialReason: text('denial_reason'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

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

export const usersRelations = relations(users, ({ many }) => ({
	roles: many(userRoles),
	companies: many(userCompanies),
	applications: many(applications),
}))

export const companiesRelations = relations(companies, ({ many }) => ({
	users: many(userCompanies),
	termOfferings: many(termOfferings),
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
		termOffering: one(termOfferings, {
			fields: [applications.termOfferingId],
			references: [termOfferings.id],
		}),
		documents: many(applicationDocuments),
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
