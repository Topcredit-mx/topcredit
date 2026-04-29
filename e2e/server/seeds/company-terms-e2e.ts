import { eq } from 'drizzle-orm'
import {
	applications,
	companies,
	termOfferings,
	terms,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'
import { deleteOrphanTermsWithoutOfferings } from '../shared/db-cleanup'

const DOMAIN = 'terms-mgmt-e2e.local'
const AGENT_EMAIL = 'terms-mgmt-agent@example.com'

export const companyTermsE2e = {
	domain: DOMAIN,
	agentEmail: AGENT_EMAIL,
}

export const seedCompanyTermsManagementFixture = async () => {
	const db = getDb(process.env.DATABASE_URL || '')

	await db.delete(users).where(eq(users.email, AGENT_EMAIL))
	await db.delete(companies).where(eq(companies.domain, DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)

	const now = new Date()
	const [agent] = await db
		.insert(users)
		.values({
			email: AGENT_EMAIL,
			name: 'Terms Mgmt Agent',
			emailVerified: now,
		})
		.returning()

	if (!agent) throw new Error('seedCompanyTermsManagement: agent not created')

	await db.insert(userRoles).values([
		{ userId: agent.id, role: 'agent' },
		{ userId: agent.id, role: 'admin' },
	])

	const [company] = await db
		.insert(companies)
		.values({
			name: 'E2E Terms Mgmt Co',
			domain: DOMAIN,
			rate: '0.0250',
			borrowingCapacityRate: '0.30',
			employeeSalaryFrequency: 'monthly',
			active: true,
		})
		.returning()

	if (!company)
		throw new Error('seedCompanyTermsManagement: company not created')

	const [term12] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 12 })
		.returning({ id: terms.id })

	if (!term12) throw new Error('seedCompanyTermsManagement: term not created')

	const [offering12] = await db
		.insert(termOfferings)
		.values({
			companyId: company.id,
			termId: term12.id,
			disabled: false,
		})
		.returning({ id: termOfferings.id })

	if (!offering12) {
		throw new Error('seedCompanyTermsManagement: term offering not created')
	}

	return {
		companyId: company.id,
		termOfferingId12: offering12.id,
		agentEmail: AGENT_EMAIL,
	}
}

export type SeedCompanyTermsWithLockedOfferingParams = {
	companyId: number
	termOfferingId: number
	applicantEmail: string
}

export const seedApplicationUsingTermOffering = async (
	params: SeedCompanyTermsWithLockedOfferingParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	await db.delete(users).where(eq(users.email, params.applicantEmail))

	const now = new Date()
	const [applicant] = await db
		.insert(users)
		.values({
			email: params.applicantEmail,
			name: 'E2E Locked Term Applicant',
			emailVerified: now,
		})
		.returning()

	if (!applicant)
		throw new Error('seedApplicationUsingTermOffering: no applicant')

	await db.insert(userRoles).values({
		userId: applicant.id,
		role: 'applicant',
	})

	await db.insert(applications).values({
		applicantId: applicant.id,
		companyId: params.companyId,
		termOfferingId: params.termOfferingId,
		creditAmount: null,
		salaryAtApplication: '50000.00',
		salaryFrequency: 'monthly',
		status: 'pending',
	})

	return { applicantId: applicant.id }
}

export const cleanupCompanyTermsManagementFixture = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, AGENT_EMAIL))
	await db
		.delete(users)
		.where(eq(users.email, 'terms-locked-applicant@example.com'))
	await db.delete(companies).where(eq(companies.domain, DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}

const BI_MONTHLY_DOMAIN = 'terms-mgmt-bimonth-e2e.local'
const BI_MONTHLY_AGENT = 'terms-mgmt-bimonth-agent@example.com'

export const companyTermsBimonthlyE2e = {
	domain: BI_MONTHLY_DOMAIN,
	agentEmail: BI_MONTHLY_AGENT,
}

export const seedCompanyTermsBimonthlyFixture = async () => {
	const db = getDb(process.env.DATABASE_URL || '')

	await db.delete(users).where(eq(users.email, BI_MONTHLY_AGENT))
	await db.delete(companies).where(eq(companies.domain, BI_MONTHLY_DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)

	const now = new Date()
	const [agent] = await db
		.insert(users)
		.values({
			email: BI_MONTHLY_AGENT,
			name: 'Terms Bi-Month Agent',
			emailVerified: now,
		})
		.returning()

	if (!agent) throw new Error('seedCompanyTermsBimonthly: agent not created')

	await db.insert(userRoles).values([
		{ userId: agent.id, role: 'agent' },
		{ userId: agent.id, role: 'admin' },
	])

	const [company] = await db
		.insert(companies)
		.values({
			name: 'E2E Terms Bi-Month Co',
			domain: BI_MONTHLY_DOMAIN,
			rate: '0.0250',
			borrowingCapacityRate: null,
			employeeSalaryFrequency: 'bi-monthly',
			active: true,
		})
		.returning()

	if (!company)
		throw new Error('seedCompanyTermsBimonthly: company not created')

	const [term24] = await db
		.insert(terms)
		.values({ durationType: 'bi-monthly', duration: 88 })
		.returning({ id: terms.id })

	if (!term24) throw new Error('seedCompanyTermsBimonthly: term not created')

	const [offering] = await db
		.insert(termOfferings)
		.values({
			companyId: company.id,
			termId: term24.id,
			disabled: false,
		})
		.returning({ id: termOfferings.id })

	if (!offering)
		throw new Error('seedCompanyTermsBimonthly: offering not created')

	return {
		companyId: company.id,
		agentEmail: BI_MONTHLY_AGENT,
		termOfferingId24: offering.id,
	}
}

export const cleanupCompanyTermsBimonthlyFixture = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, BI_MONTHLY_AGENT))
	await db.delete(companies).where(eq(companies.domain, BI_MONTHLY_DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)
}

const EDIT_CONFLICT_DOMAIN = 'terms-dup-edit-e2e.local'
const EDIT_CONFLICT_AGENT = 'terms-dup-edit-agent@example.com'

export const companyTermsEditConflictE2e = {
	domain: EDIT_CONFLICT_DOMAIN,
	agentEmail: EDIT_CONFLICT_AGENT,
}

export const seedCompanyTermsEditConflictFixture = async () => {
	const db = getDb(process.env.DATABASE_URL || '')

	await db.delete(users).where(eq(users.email, EDIT_CONFLICT_AGENT))
	await db.delete(companies).where(eq(companies.domain, EDIT_CONFLICT_DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)

	const now = new Date()
	const [agent] = await db
		.insert(users)
		.values({
			email: EDIT_CONFLICT_AGENT,
			name: 'Terms Dup Edit Agent',
			emailVerified: now,
		})
		.returning()

	if (!agent) throw new Error('seedCompanyTermsEditConflict: agent not created')

	await db.insert(userRoles).values([
		{ userId: agent.id, role: 'agent' },
		{ userId: agent.id, role: 'admin' },
	])

	const [company] = await db
		.insert(companies)
		.values({
			name: 'E2E Dup Edit Co',
			domain: EDIT_CONFLICT_DOMAIN,
			rate: '0.0250',
			borrowingCapacityRate: null,
			employeeSalaryFrequency: 'monthly',
			active: true,
		})
		.returning()

	if (!company)
		throw new Error('seedCompanyTermsEditConflict: company not created')

	const [termA] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 117 })
		.returning({ id: terms.id })
	const [termB] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 118 })
		.returning({ id: terms.id })

	if (!termA || !termB) {
		throw new Error('seedCompanyTermsEditConflict: terms not created')
	}

	const [off12] = await db
		.insert(termOfferings)
		.values({ companyId: company.id, termId: termA.id, disabled: false })
		.returning({ id: termOfferings.id })
	const [off18] = await db
		.insert(termOfferings)
		.values({ companyId: company.id, termId: termB.id, disabled: false })
		.returning({ id: termOfferings.id })

	if (!off12 || !off18) {
		throw new Error('seedCompanyTermsEditConflict: offerings not created')
	}

	return {
		companyId: company.id,
		agentEmail: EDIT_CONFLICT_AGENT,
		termOfferingId18: off18.id,
	}
}

export const cleanupCompanyTermsEditConflictFixture = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, EDIT_CONFLICT_AGENT))
	await db.delete(companies).where(eq(companies.domain, EDIT_CONFLICT_DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)
}

const PAYROLL_MISMATCH_DOMAIN = 'terms-payroll-mismatch-e2e.local'
const PAYROLL_MISMATCH_AGENT = 'terms-payroll-mismatch-agent@example.com'

export const companyTermsPayrollMismatchE2e = {
	domain: PAYROLL_MISMATCH_DOMAIN,
	agentEmail: PAYROLL_MISMATCH_AGENT,
}

export const seedCompanyTermsPayrollMismatchFixture = async () => {
	const db = getDb(process.env.DATABASE_URL || '')

	await db.delete(users).where(eq(users.email, PAYROLL_MISMATCH_AGENT))
	await db
		.delete(companies)
		.where(eq(companies.domain, PAYROLL_MISMATCH_DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)

	const now = new Date()
	const [agent] = await db
		.insert(users)
		.values({
			email: PAYROLL_MISMATCH_AGENT,
			name: 'Terms Payroll Mismatch Agent',
			emailVerified: now,
		})
		.returning()

	if (!agent)
		throw new Error('seedCompanyTermsPayrollMismatch: agent not created')

	await db.insert(userRoles).values([
		{ userId: agent.id, role: 'agent' },
		{ userId: agent.id, role: 'admin' },
	])

	const [company] = await db
		.insert(companies)
		.values({
			name: 'E2E Payroll Mismatch Co',
			domain: PAYROLL_MISMATCH_DOMAIN,
			rate: '0.0250',
			borrowingCapacityRate: null,
			employeeSalaryFrequency: 'monthly',
			active: true,
		})
		.returning()

	if (!company) {
		throw new Error('seedCompanyTermsPayrollMismatch: company not created')
	}

	const [termMonthly] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 91 })
		.returning({ id: terms.id })
	const [termBi] = await db
		.insert(terms)
		.values({ durationType: 'bi-monthly', duration: 92 })
		.returning({ id: terms.id })

	if (!termMonthly || !termBi) {
		throw new Error('seedCompanyTermsPayrollMismatch: terms not created')
	}

	await db.insert(termOfferings).values([
		{
			companyId: company.id,
			termId: termMonthly.id,
			disabled: false,
		},
		{
			companyId: company.id,
			termId: termBi.id,
			disabled: true,
		},
	])

	return {
		companyId: company.id,
		agentEmail: PAYROLL_MISMATCH_AGENT,
	}
}

export const cleanupCompanyTermsPayrollMismatchFixture = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, PAYROLL_MISMATCH_AGENT))
	await db
		.delete(companies)
		.where(eq(companies.domain, PAYROLL_MISMATCH_DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)
}
