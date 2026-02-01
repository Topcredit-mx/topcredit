import { relations } from 'drizzle-orm'
import {
	boolean,
	integer,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'

export const rolesEnum = pgEnum('roles', [
	'customer',
	'employee',
	'requests',
	'admin',
])

export const employeeSalaryFrequencyEnum = pgEnum('employee_salary_frequency', [
	'bi-monthly',
	'monthly',
])

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

export const usersRelations = relations(users, ({ many }) => ({
	roles: many(userRoles),
	companies: many(userCompanies),
}))

export const companiesRelations = relations(companies, ({ many }) => ({
	users: many(userCompanies),
}))

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
