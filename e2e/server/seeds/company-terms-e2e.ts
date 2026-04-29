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

	const now = new Date()
	const [[agent]] = await Promise.all([
		db
			.insert(users)
			.values({
				email: AGENT_EMAIL,
				name: 'Terms Mgmt Agent',
				emailVerified: now,
			})
			.returning(),
	])

	if (!agent) throw new Error('seedCompanyTermsManagement: agent not created')

	await db.insert(userRoles).values([
		{ userId: agent.id, role: 'agent' },
		{ userId: agent.id, role: 'admin' },
	])

	const [[company]] = await db
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

	if (!company) throw new Error('seedCompanyTermsManagement: company not created')

	const [[term12]] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 12 })
		.returning({ id: terms.id })

	if (!term12) throw new Error('seedCompanyTermsManagement: term not created')

	const [[offering12]] = await db
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
	const [[applicant]] = await db
		.insert(users)
		.values({
			email: params.applicantEmail,
			name: 'E2E Locked Term Applicant',
			emailVerified: now,
		})
		.returning()

	if (!applicant) throw new Error('seedApplicationUsingTermOffering: no applicant')

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
	await db.delete(users).where(
		eq(users.email, 'terms-locked-applicant@example.com'),
	)
	await db.delete(companies).where(eq(companies.domain, DOMAIN))
	return null
}
