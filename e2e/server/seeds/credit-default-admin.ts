import { eq } from 'drizzle-orm'
import {
	allCreditDefaultAdminUsers,
	creditDefaultAdminCompany,
} from '~/e2e/equipo/credit-default-admin.fixtures'
import { approximatePrincipalFinancingForPaymentAmount } from '~/lib/credit-payment-amount-split'
import {
	applicationStatusHistory,
	applications,
	companies,
	creditPayments,
	credits,
	termOfferings,
	terms,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'
import { deleteOrphanTermsWithoutOfferings } from '../shared/db-cleanup'
import { endOfMonthMonthsAgoEodMx } from '../shared/mexico-seed-dates'
import { createOrderedSeedStatusHistory } from '../shared/status-history'

export type SeedCreditDefaultAdminResult = {
	companyId: number
	defaultTargetCreditId: number
	otherOverdueCreditId: number
	defaultTargetApplicantName: string
	otherOverdueApplicantName: string
}

export const seedCreditDefaultAdmin =
	async (): Promise<SeedCreditDefaultAdminResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditDefaultAdminUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, creditDefaultAdminCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditDefaultAdminCompany.name,
					domain: creditDefaultAdminCompany.domain,
					rate: creditDefaultAdminCompany.rate,
					employeeSalaryFrequency:
						creditDefaultAdminCompany.employeeSalaryFrequency,
					active: creditDefaultAdminCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditDefaultAdminUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed CreditDefaultAdmin: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed CreditDefaultAdmin: user ${email} not found`)
			return u
		}

		const adminUser = findUser('admin@credit-default-admin.e2e')
		const applicant = findUser('applicant@credit-default-admin.e2e')
		const otherApplicant = findUser('other@credit-default-admin.e2e')

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 6 })
			.returning()
		if (!term) throw new Error('Seed CreditDefaultAdmin: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering)
			throw new Error('Seed CreditDefaultAdmin: offering not created')

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditDefaultAdminUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture)
					throw new Error(`Seed CreditDefaultAdmin: fixture for ${u.email}`)
				return [
					db
						.insert(userRoles)
						.values(fixture.roles.map((role) => ({ userId: u.id, role }))),
					...(new Set<string>(fixture.roles).has('agent')
						? [
								db
									.insert(userCompanies)
									.values({ userId: u.id, companyId: company.id }),
							]
						: []),
				]
			}),
		)

		const longOverdueDue = endOfMonthMonthsAgoEodMx(now, 6)
		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		const [appTarget] = await db
			.insert(applications)
			.values({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '24000.00',
				salaryAtApplication: '20000',
				salaryFrequency: creditDefaultAdminCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: longOverdueDue,
				payrollNumber: 'DEFADM001',
			})
			.returning()
		if (!appTarget)
			throw new Error('Seed CreditDefaultAdmin: target application not created')

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicant.id,
			}).map((entry, index) => ({
				applicationId: appTarget.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [creditTarget] = await db
			.insert(credits)
			.values({
				applicationId: appTarget.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '24000.00',
				disbursedByUserId: adminUser.id,
			})
			.returning()
		if (!creditTarget)
			throw new Error('Seed CreditDefaultAdmin: target credit not created')

		const splitT = approximatePrincipalFinancingForPaymentAmount({
			paymentAmount: '12000.00',
			loanPrincipal: 24000,
			annualRate: Number(creditDefaultAdminCompany.rate),
		})
		await db.insert(creditPayments).values([
			{
				creditId: creditTarget.id,
				dueDate: longOverdueDue,
				amount: '12000.00',
				principalAmount: splitT.principalAmount,
				financingAmount: splitT.financingAmount,
				hrConfirmedAt: hrAt(longOverdueDue),
				hrConfirmedByUserId: adminUser.id,
			},
		])

		const [appOther] = await db
			.insert(applications)
			.values({
				applicantId: otherApplicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '12000.00',
				salaryAtApplication: '20000',
				salaryFrequency: creditDefaultAdminCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: longOverdueDue,
				payrollNumber: 'DEFADM002',
			})
			.returning()
		if (!appOther)
			throw new Error('Seed CreditDefaultAdmin: other application not created')

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: otherApplicant.id,
			}).map((entry, index) => ({
				applicationId: appOther.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [creditOther] = await db
			.insert(credits)
			.values({
				applicationId: appOther.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '12000.00',
				disbursedByUserId: adminUser.id,
			})
			.returning()
		if (!creditOther)
			throw new Error('Seed CreditDefaultAdmin: other credit not created')

		const splitO = approximatePrincipalFinancingForPaymentAmount({
			paymentAmount: '12000.00',
			loanPrincipal: 12000,
			annualRate: Number(creditDefaultAdminCompany.rate),
		})
		await db.insert(creditPayments).values([
			{
				creditId: creditOther.id,
				dueDate: longOverdueDue,
				amount: '12000.00',
				principalAmount: splitO.principalAmount,
				financingAmount: splitO.financingAmount,
			},
		])

		return {
			companyId: company.id,
			defaultTargetCreditId: creditTarget.id,
			otherOverdueCreditId: creditOther.id,
			defaultTargetApplicantName: applicant.name,
			otherOverdueApplicantName: otherApplicant.name,
		}
	}

export const cleanupCreditDefaultAdmin = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditDefaultAdminUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, creditDefaultAdminCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
}
