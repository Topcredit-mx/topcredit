import { and, desc, eq, inArray, notExists } from 'drizzle-orm'
import { EncryptJWT } from 'jose'
import {
	adminUser as companiesAdminUser,
	companyList as companiesCompanyList,
} from '~/e2e/admin/companies.fixtures'
import {
	adminOverviewAdmin,
	overviewCompanyList,
} from '~/e2e/admin/equipo-admin-overview.fixtures'
import {
	agentOnlyUser,
	applicantOnlyUser,
	userList,
	adminUser as usersAdminUser,
	companyList as usersCompanyList,
} from '~/e2e/admin/users.fixtures'
import {
	applicantB,
	applicantInactiveCompany,
	applicantNoCompany,
	applicantWithCompany,
	applicantWithCompanyWithoutCapacityRate,
	applicantWithCompanyWithoutTermOfferings,
	companyInactive,
	companyWithoutCapacityRate,
	companyWithoutTermOfferings,
	companyWithTerms,
} from '~/e2e/cuenta/applications.fixtures'
import {
	allCreditsUsers,
	creditsApplicant,
	creditsCompany,
	creditsOtherApplicant,
} from '~/e2e/cuenta/credits.fixtures'
import { agentNoAssignments } from '~/e2e/equipo/agent-no-assignments.fixtures'
import {
	adminForReview,
	agentCompanyDomains,
	agentForReview,
	allReviewApplicants,
	allReviewCompanies,
	applicantA2,
	applicantA3,
	applicantA4,
	applicantA5,
	applicantAuthzAdmin,
	applicantAuthzAwaiting,
	applicantAuthzDeny,
	applicantForReview,
	applicantForReviewB,
	applicantPreAuth,
	authorizationsAgentForReview,
	companyForReview,
	companyForReviewD,
	dualQueueAgentForReview,
	preAuthAgentForReview,
	reviewApplicationConfigs,
} from '~/e2e/equipo/applications-review.fixtures'
import {
	agentWithAssignments,
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	switcherCompanyList,
} from '~/e2e/equipo/company-switcher.fixtures'
import {
	allCreditDetailInstallmentScheduleUsers,
	creditDetailHrOnlyAgent,
	creditDetailInstallmentScheduleApplicant,
	creditDetailInstallmentScheduleCompany,
	creditDetailInstallmentsAgent,
} from '~/e2e/equipo/credit-detail-installment-schedule.fixtures'
import {
	allCreditDetailStatesUsers,
	creditDetailStatesApplicant,
	creditDetailStatesCompany,
	creditDetailStatesHrAgent,
} from '~/e2e/equipo/credit-detail-states.fixtures'
import {
	allCreditFinalInstallmentSettleUsers,
	creditFinalInstallmentSettleApplicant,
	creditFinalInstallmentSettleCompany,
	creditFinalInstallmentSettleHrAgent,
	creditFinalInstallmentSettleInstallmentsAgent,
	creditPartialScheduleApplicant,
} from '~/e2e/equipo/credit-final-installment-settles.fixtures'
import {
	allDeductionUsers,
	applicantDeductions,
	applicantDeductions2,
	applicantDeductionsConfirmed,
	applicantDeductionsConfirmedLate,
	applicantDeductionsConfirmedMxEdge,
	applicantDeductionsMultiOverdue,
	applicantDeductionsOverdue,
	applicantDeductionsOverdueRecent,
	deductionsCompany,
	hrAgentDeductions,
} from '~/e2e/equipo/deductions-queue.fixtures'
import {
	allDisbUsers,
	disbCompany,
} from '~/e2e/equipo/disbursement-agents.fixtures'
import { allHrUsers, hrCompany } from '~/e2e/equipo/hr-agents.fixtures'
import {
	allInstallmentsQueueUsers,
	hrAgentInstallmentsQueue,
	installmentAgentQueue,
	installmentsQueueCompany,
} from '~/e2e/equipo/installments-agents.fixtures'
import {
	allInstallmentsBulkQueueUsers,
	installmentsBulkAgent,
	installmentsBulkApplicants,
	installmentsBulkHrAgent,
	installmentsBulkQueueCompany,
} from '~/e2e/equipo/installments-bulk-queue.fixtures'
import {
	allInstallmentsOverdueUsers,
	applicantOverdueHrPending,
	applicantOverdueInstallmentsBlocked,
	hrOverdueInstallmentsAgent,
	installmentsOverdueCompany,
} from '~/e2e/equipo/installments-overdue.fixtures'
import { allNavAgents, navCompany } from '~/e2e/equipo/role-queue-nav.fixtures'
import {
	E2E_PRE_AUTH_INITIAL_INTAKE_APPROVED,
	E2E_PRE_AUTH_PACKAGE_PENDING,
	E2E_PRE_AUTH_PAYROLL_APPROVED_LATEST,
	type E2ePreAuthDocumentSeedRow,
	type SeedPreAuthorizedPackageVariant,
} from '~/e2e/fixtures/pre-authorized-package'
import {
	agentUser as loginAgentUser,
	applicantUser as loginApplicantUser,
	noRoleUser as loginNoRoleUser,
} from '~/e2e/other/login.fixtures'
import { getUpcomingDeductionDate } from '~/lib/first-discount-date'
import { generatePaymentSchedule } from '~/lib/payment-schedule'
import type { Role } from '~/server/auth/session'
import type { ApplicationStatus, DocumentType } from '~/server/db/schema'
import {
	applicationDocuments,
	applicationStatusHistory,
	applications,
	companies,
	creditPayments,
	credits,
	emailOtps,
	termOfferings,
	terms,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import { deleteBlob, isBlobStorageKey } from '~/server/storage'
import { getDb } from './e2e-db'

export type SeedPreAuthorizedPackageDocumentsTaskParams = {
	applicationId: number
	variant: SeedPreAuthorizedPackageVariant
}

async function deleteBlobsForTerm(
	db: Awaited<ReturnType<typeof getDb>>,
	termId: number,
): Promise<void> {
	if (!process.env.BLOB_READ_WRITE_TOKEN) return

	const appIds = await db
		.select({ id: applications.id })
		.from(applications)
		.innerJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.where(eq(termOfferings.termId, termId))

	const ids = appIds.map((r) => r.id)
	if (ids.length === 0) return

	const docs = await db
		.select({
			id: applicationDocuments.id,
			storageKey: applicationDocuments.storageKey,
		})
		.from(applicationDocuments)
		.where(inArray(applicationDocuments.applicationId, ids))

	const toDelete = docs.filter((d) => isBlobStorageKey(d.storageKey))
	await Promise.allSettled(toDelete.map((d) => deleteBlob(d.storageKey)))
}

export type LoginTaskParams = string

export const login = async (email: LoginTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) {
		throw new Error(`User with email ${email} not found`)
	}

	const roles = await db.query.userRoles.findMany({
		where: eq(userRoles.userId, user.id),
	})

	const rolesList = roles.map((r) => r.role)

	const secret = process.env.AUTH_SECRET
	if (!secret) {
		throw new Error('AUTH_SECRET is not defined')
	}

	const encoder = new TextEncoder()
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		'HKDF',
		false,
		['deriveBits'],
	)

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: new Uint8Array(),
			info: encoder.encode('NextAuth.js Generated Encryption Key'),
		},
		keyMaterial,
		256,
	)

	const encryptionKey = new Uint8Array(derivedBits)

	const now = Math.floor(Date.now() / 1000)

	const token = await new EncryptJWT({
		sub: user.id.toString(),
		email: user.email,
		name: user.name,
		picture: user.image,
		roles: rolesList,
		iat: now,
		exp: now + 60 * 60 * 24 * 30,
		jti: crypto.randomUUID(),
	})
		.setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
		.encrypt(encryptionKey)

	return token
}

export type ResetUserTaskParams = {
	name: string
	email: string
	roles?: Role[]
	verified?: boolean
}

export const resetUser = async (params: ResetUserTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const existing = await db.query.users.findFirst({
		where: eq(users.email, params.email),
	})

	let user: typeof users.$inferSelect

	if (existing) {
		const [updated] = await db
			.update(users)
			.set({
				name: params.name,
				emailVerified: params.verified !== false ? new Date() : null,
			})
			.where(eq(users.email, params.email))
			.returning()
		if (!updated) throw new Error('Failed to update user')
		user = updated
	} else {
		const [created] = await db
			.insert(users)
			.values({
				email: params.email,
				name: params.name,
				emailVerified: params.verified !== false ? new Date() : null,
			})
			.returning()
		if (!created) throw new Error('Failed to create user')
		user = created
	}

	await db.delete(userRoles).where(eq(userRoles.userId, user.id))
	if (params.roles && params.roles.length > 0) {
		await db.insert(userRoles).values(
			params.roles.map((role) => ({
				userId: user.id,
				role,
			})),
		)
	}

	return user
}

export type AssignRoleTaskParams = {
	email: string
	role: Role
}

export const assignRole = async (params: AssignRoleTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, params.email),
	})

	if (!user) {
		throw new Error(`User with email ${params.email} not found`)
	}

	await db.insert(userRoles).values({
		userId: user.id,
		role: params.role,
	})

	return null
}

export type RemoveRoleTaskParams = { email: string; role: Role }

export const removeRole = async (params: RemoveRoleTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, params.email),
	})

	if (!user) {
		throw new Error(`User with email ${params.email} not found`)
	}

	await db
		.delete(userRoles)
		.where(and(eq(userRoles.userId, user.id), eq(userRoles.role, params.role)))

	return null
}

export type EnableTotpForUserTaskParams = string

export const enableTotpForUser = async (email: EnableTotpForUserTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})
	if (!user) {
		throw new Error(`User with email ${email} not found`)
	}
	const backupCodes = ['backup1', 'backup2', 'backup3', 'backup4', 'backup5']
	await db
		.update(users)
		.set({
			totpEnabled: true,
			totpSecret: 'test-secret-base32',
			totpBackupCodes: JSON.stringify(backupCodes),
		})
		.where(eq(users.id, user.id))
	return null
}

export type DeleteUsersByEmailTaskParams = string[]

export const deleteUsersByEmail = async (
	emails: DeleteUsersByEmailTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	for (const email of emails) {
		await db.delete(users).where(eq(users.email, email))
	}

	return null
}

export type ResetCompanyTaskParams = {
	name: string
	domain: string
	rate: string
	borrowingCapacityRate?: string | null
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
	active?: boolean
}

export const resetCompany = async (params: ResetCompanyTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const existing = await db.query.companies.findFirst({
		where: eq(companies.domain, params.domain),
	})

	if (existing) {
		const [updated] = await db
			.update(companies)
			.set({
				name: params.name,
				rate: params.rate,
				borrowingCapacityRate: params.borrowingCapacityRate ?? null,
				employeeSalaryFrequency: params.employeeSalaryFrequency,
				active: params.active ?? true,
			})
			.where(eq(companies.domain, params.domain))
			.returning()
		if (!updated) throw new Error('Failed to update company')
		return updated
	}

	const [created] = await db
		.insert(companies)
		.values({
			name: params.name,
			domain: params.domain,
			rate: params.rate,
			borrowingCapacityRate: params.borrowingCapacityRate ?? null,
			employeeSalaryFrequency: params.employeeSalaryFrequency,
			active: params.active ?? true,
		})
		.returning()
	if (!created) throw new Error('Failed to create company')
	return created
}

export type DeleteCompaniesByDomainTaskParams = string[]

export const deleteCompaniesByDomain = async (
	domains: DeleteCompaniesByDomainTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	for (const domain of domains) {
		await db.delete(companies).where(eq(companies.domain, domain))
	}

	return null
}

export type AssignCompanyToUserTaskParams = {
	userEmail: string
	companyDomain: string
}

export const assignCompanyToUser = async (
	params: AssignCompanyToUserTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, params.userEmail),
	})
	if (!user) {
		throw new Error(`User with email ${params.userEmail} not found`)
	}

	const company = await db.query.companies.findFirst({
		where: eq(companies.domain, params.companyDomain),
	})
	if (!company) {
		throw new Error(`Company with domain ${params.companyDomain} not found`)
	}

	const existing = await db.query.userCompanies.findFirst({
		where: (uc, { and }) =>
			and(eq(uc.userId, user.id), eq(uc.companyId, company.id)),
	})

	if (existing) {
		return existing
	}

	const [assignment] = await db
		.insert(userCompanies)
		.values({
			userId: user.id,
			companyId: company.id,
		})
		.returning()

	return assignment
}

export type DeleteUserCompanyAssignmentsByEmailTaskParams = string[]

export const deleteUserCompanyAssignmentsByEmail = async (
	emails: DeleteUserCompanyAssignmentsByEmailTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	for (const email of emails) {
		const user = await db.query.users.findFirst({
			where: eq(users.email, email),
		})

		if (user) {
			await db.delete(userCompanies).where(eq(userCompanies.userId, user.id))
		}
	}

	return null
}

export type DeleteApplicationsByApplicantIdTaskParams = number

export const deleteApplicationsByApplicantId = async (
	applicantId: DeleteApplicationsByApplicantIdTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(applications).where(eq(applications.applicantId, applicantId))
	return null
}

export type InsertApplicationDocumentTaskParams = {
	applicationId: number
	documentType: DocumentType
	fileName: string
	storageKey: string
	status?: 'pending' | 'approved' | 'rejected'
	rejectionReason?: string | null
}

export const insertApplicationDocument = async (
	params: InsertApplicationDocumentTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const status = params.status ?? 'pending'
	if (status === 'rejected' && !params.rejectionReason) {
		throw new Error('Rejected documents require rejectionReason')
	}
	const [doc] = await db
		.insert(applicationDocuments)
		.values({
			applicationId: params.applicationId,
			documentType: params.documentType,
			status,
			fileName: params.fileName,
			storageKey: params.storageKey,
			rejectionReason: status === 'rejected' ? params.rejectionReason : null,
		})
		.returning()
	if (!doc) throw new Error('Failed to insert application document')
	return doc
}

export type UpdateLatestApplicationDocumentByTypeTaskParams = {
	applicationId: number
	documentType: DocumentType
	status: 'pending' | 'approved' | 'rejected'
	rejectionReason?: string | null
}

export const updateLatestApplicationDocumentByType = async (
	params: UpdateLatestApplicationDocumentByTypeTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	if (
		params.status === 'rejected' &&
		(params.rejectionReason == null || params.rejectionReason.trim() === '')
	) {
		throw new Error('Rejected documents require a non-empty rejectionReason')
	}
	const [latest] = await db
		.select({ id: applicationDocuments.id })
		.from(applicationDocuments)
		.where(
			and(
				eq(applicationDocuments.applicationId, params.applicationId),
				eq(applicationDocuments.documentType, params.documentType),
			),
		)
		.orderBy(desc(applicationDocuments.createdAt))
		.limit(1)
	if (!latest) {
		throw new Error(
			`No document row for application ${params.applicationId} and type ${params.documentType}`,
		)
	}
	await db
		.update(applicationDocuments)
		.set({
			status: params.status,
			rejectionReason:
				params.status === 'rejected' ? params.rejectionReason : null,
			updatedAt: new Date(),
		})
		.where(eq(applicationDocuments.id, latest.id))
	return null
}

export const seedPreAuthorizedPackageDocuments = async (
	params: SeedPreAuthorizedPackageDocumentsTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const { applicationId, variant } = params

	const rows: E2ePreAuthDocumentSeedRow[] = []

	if (variant === 'initialIntakeApprovedOnly') {
		rows.push(...E2E_PRE_AUTH_INITIAL_INTAKE_APPROVED)
	} else {
		rows.push(...E2E_PRE_AUTH_INITIAL_INTAKE_APPROVED)
		rows.push(...E2E_PRE_AUTH_PACKAGE_PENDING)
		if (
			variant === 'initialIntakeApprovedAndPackagePending_payrollLatestApproved'
		) {
			rows.push(E2E_PRE_AUTH_PAYROLL_APPROVED_LATEST)
		}
	}

	for (const row of rows) {
		const storageKey = `application-documents/${applicationId}/${row.documentType}/${row.fileName}`
		await db.insert(applicationDocuments).values({
			applicationId,
			documentType: row.documentType,
			fileName: row.fileName,
			storageKey,
			status: row.status,
			rejectionReason: null,
		})
	}
	return null
}

export const getUserIdByEmail = async (
	email: string,
): Promise<number | null> => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
		columns: { id: true },
	})

	return user?.id ?? null
}

type SeedStatusHistoryStep = {
	status: ApplicationStatus
	setByUserId: number | null
}

function getDefaultSeedStatusHistory(
	finalStatus: ApplicationStatus,
	defaultActorUserId: number | null,
): readonly SeedStatusHistoryStep[] {
	switch (finalStatus) {
		case 'pending':
			return [{ status: 'pending', setByUserId: defaultActorUserId }]
		case 'approved':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
			]
		case 'pre-authorized':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
				{ status: 'pre-authorized', setByUserId: defaultActorUserId },
			]
		case 'awaiting-authorization':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
				{ status: 'pre-authorized', setByUserId: defaultActorUserId },
				{
					status: 'awaiting-authorization',
					setByUserId: defaultActorUserId,
				},
			]
		case 'authorized':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
				{ status: 'pre-authorized', setByUserId: defaultActorUserId },
				{
					status: 'awaiting-authorization',
					setByUserId: defaultActorUserId,
				},
				{ status: 'authorized', setByUserId: defaultActorUserId },
			]
		case 'denied':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'denied', setByUserId: defaultActorUserId },
			]
		case 'disbursed':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
				{ status: 'pre-authorized', setByUserId: defaultActorUserId },
				{
					status: 'awaiting-authorization',
					setByUserId: defaultActorUserId,
				},
				{ status: 'authorized', setByUserId: defaultActorUserId },
				{ status: 'disbursed', setByUserId: defaultActorUserId },
			]
		case 'invalid-documentation':
			throw new Error(
				'invalid-documentation is no longer a supported seed application status',
			)
	}
}

function createOrderedSeedStatusHistory(options: {
	finalStatus: ApplicationStatus
	defaultActorUserId: number | null
	steps?: readonly SeedStatusHistoryStep[]
}): SeedStatusHistoryStep[] {
	const steps =
		options.steps ??
		getDefaultSeedStatusHistory(options.finalStatus, options.defaultActorUserId)
	const lastStep = steps[steps.length - 1]

	if (!lastStep || lastStep.status !== options.finalStatus) {
		throw new Error('Seed status history must end with the current status')
	}

	return [...steps]
}

export type ResetApplicantApplicationTaskParams = {
	applicantId: number
	termOfferingId: number
	creditAmount: string
	salaryAtApplication: string
	salaryFrequency?: 'monthly' | 'bi-monthly'
	statusHistory?: readonly ApplicationStatus[]
	status?:
		| 'pending'
		| 'pre-authorized'
		| 'awaiting-authorization'
		| 'authorized'
		| 'disbursed'
		| 'denied'
	transferReference?: string
	receiptFileName?: string
	phoneNumber?: string
	payrollNumber?: string
	rfc?: string
	clabe?: string
	streetAndNumber?: string
	interiorNumber?: string
	city?: string
	state?: string
	country?: string
	postalCode?: string
}

export const resetApplicantApplication = async (
	params: ResetApplicantApplicationTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const finalStatus = params.status ?? 'pending'
	const offering = await db.query.termOfferings.findFirst({
		where: eq(termOfferings.id, params.termOfferingId),
		columns: { companyId: true },
	})
	if (!offering) throw new Error('Failed to find term offering')
	// Delete blobs for applications we're about to remove (so they don't persist in storage)
	if (process.env.BLOB_READ_WRITE_TOKEN) {
		const appsToRemove = await db
			.select({ id: applications.id })
			.from(applications)
			.where(eq(applications.applicantId, params.applicantId))
		const ids = appsToRemove.map((r) => r.id)
		if (ids.length > 0) {
			const docs = await db
				.select({ storageKey: applicationDocuments.storageKey })
				.from(applicationDocuments)
				.where(inArray(applicationDocuments.applicationId, ids))
			const toDelete = docs.filter((d) => isBlobStorageKey(d.storageKey))
			await Promise.allSettled(toDelete.map((d) => deleteBlob(d.storageKey)))
		}
	}
	await db
		.delete(applications)
		.where(eq(applications.applicantId, params.applicantId))

	const baseTime = new Date()
	const timeline = createOrderedSeedStatusHistory({
		finalStatus,
		defaultActorUserId: params.applicantId,
		steps: params.statusHistory?.map((status) => ({
			status,
			setByUserId: params.applicantId,
		})),
	})

	const [app] = await db
		.insert(applications)
		.values({
			applicantId: params.applicantId,
			companyId: offering.companyId,
			termOfferingId: params.termOfferingId,
			creditAmount: params.creditAmount,
			salaryAtApplication: params.salaryAtApplication,
			salaryFrequency: params.salaryFrequency ?? 'monthly',
			status: finalStatus,
			transferReference: params.transferReference,
			receiptFileName: params.receiptFileName,
			phoneNumber: params.phoneNumber,
			payrollNumber: params.payrollNumber,
			rfc: params.rfc,
			clabe: params.clabe,
			streetAndNumber: params.streetAndNumber,
			interiorNumber: params.interiorNumber,
			city: params.city,
			state: params.state,
			country: params.country,
			postalCode: params.postalCode,
		})
		.returning()
	if (!app) throw new Error('Failed to create application')

	await db.insert(applicationStatusHistory).values(
		timeline.map((entry, index) => ({
			applicationId: app.id,
			status: entry.status,
			setByUserId: entry.setByUserId,
			// Seed in the past so "latest" history items are ordered by `createdAt`
			// and so newly inserted history during the test is always more recent.
			createdAt: new Date(
				baseTime.getTime() - (timeline.length - 1 - index) * 60_000,
			),
		})),
	)

	if (finalStatus === 'disbursed' && app.creditAmount != null) {
		await db.insert(credits).values({
			applicationId: app.id,
			status: 'dispersed',
			disbursementDate: new Date(),
			transferAmount: app.creditAmount,
			disbursedByUserId: params.applicantId,
		})
	}

	return app
}

const LOGIN_DOMAIN = 'example.com'

export type SeedLoginFlowResult = {
	applicantId: number
	termOfferingId: number
	termId: number
}

export const seedLoginFlow = async (): Promise<SeedLoginFlowResult> => {
	const db = getDb(process.env.DATABASE_URL || '')

	const allUsers = [loginApplicantUser, loginAgentUser, loginNoRoleUser]
	await Promise.all(
		allUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, LOGIN_DOMAIN))

	// Delete orphaned terms left by retries (company cascade-deletes
	// term_offerings, but the term row stays).
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)

	const now = new Date()
	const [createdUsers, [company], [term]] = await Promise.all([
		db
			.insert(users)
			.values(
				allUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
		db
			.insert(companies)
			.values({
				name: 'Login E2E Company',
				domain: LOGIN_DOMAIN,
				rate: '0.0250',
				borrowingCapacityRate: '0.30',
				employeeSalaryFrequency: 'monthly' as const,
				active: true,
			})
			.returning(),
		db
			.insert(terms)
			.values({ durationType: 'monthly' as const, duration: 12 })
			.returning(),
	])

	if (!company) throw new Error('Seed: company not created')
	if (!term) throw new Error('Seed: term not created')

	const applicant = createdUsers.find(
		(u) => u.email === loginApplicantUser.email,
	)
	if (!applicant) throw new Error('Seed: applicant not found')

	const [, [offering]] = await Promise.all([
		db.insert(userRoles).values(
			allUsers.flatMap((f) =>
				f.roles.map((role) => {
					const u = createdUsers.find((cu) => cu.email === f.email)
					if (!u) throw new Error(`Seed: user ${f.email} not found`)
					return { userId: u.id, role }
				}),
			),
		),
		db
			.insert(termOfferings)
			.values({ companyId: company.id, termId: term.id, disabled: false })
			.returning(),
	])

	if (!offering) throw new Error('Seed: offering not created')

	const loginHistoryBaseTime = new Date()
	const [loginApplication] = await db
		.insert(applications)
		.values({
			applicantId: applicant.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: '10000',
			salaryAtApplication: '100000',
			salaryFrequency: 'monthly',
			status: 'pending',
		})
		.returning()

	if (!loginApplication) throw new Error('Seed: login application not created')

	await db.insert(applicationStatusHistory).values([
		{
			applicationId: loginApplication.id,
			status: 'pending',
			setByUserId: applicant.id,
			createdAt: loginHistoryBaseTime,
		},
	])

	return {
		applicantId: applicant.id,
		termOfferingId: offering.id,
		termId: term.id,
	}
}

export type CleanupLoginFlowParams = { termId: number }

export const cleanupLoginFlow = async (params: CleanupLoginFlowParams) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const allUsers = [loginApplicantUser, loginAgentUser, loginNoRoleUser]
	const loginEmails = allUsers.map((u) => u.email)
	await Promise.all(
		allUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(emailOtps).where(inArray(emailOtps.email, loginEmails))
	await db.delete(companies).where(eq(companies.domain, LOGIN_DOMAIN))
	await db.delete(terms).where(eq(terms.id, params.termId))
	return null
}

async function wipeCuentaApplicationsE2EFixtureState(
	db: ReturnType<typeof getDb>,
) {
	const allApplicants = [
		applicantWithCompany,
		applicantB,
		applicantNoCompany,
		applicantInactiveCompany,
		applicantWithCompanyWithoutCapacityRate,
		applicantWithCompanyWithoutTermOfferings,
	]
	const allCompanies = [
		companyWithTerms,
		companyInactive,
		companyWithoutCapacityRate,
		companyWithoutTermOfferings,
	]
	const domainList = allCompanies.map((c) => c.domain)

	const termRows = await db
		.selectDistinct({ termId: termOfferings.termId })
		.from(termOfferings)
		.innerJoin(companies, eq(termOfferings.companyId, companies.id))
		.where(inArray(companies.domain, domainList))

	const termIds = [...new Set(termRows.map((r) => r.termId))]
	for (const termId of termIds) {
		await deleteBlobsForTerm(db, termId)
	}

	await Promise.all(
		allApplicants.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await Promise.all(
		allCompanies.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)

	for (const termId of termIds) {
		const stillUsed = await db
			.select({ id: termOfferings.id })
			.from(termOfferings)
			.where(eq(termOfferings.termId, termId))
			.limit(1)
		if (stillUsed.length === 0) {
			await db.delete(terms).where(eq(terms.id, termId))
		}
	}

	// Delete orphaned terms left by retries (company cascade-deletes
	// term_offerings, but the term row stays).
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
}

export type SeedCuentaApplicationsResult = {
	applicantId: number
	applicantBId: number
	termOfferingId: number
	termId: number
}

export const seedCuentaApplications =
	async (): Promise<SeedCuentaApplicationsResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		await wipeCuentaApplicationsE2EFixtureState(db)

		const allApplicants = [
			applicantWithCompany,
			applicantB,
			applicantNoCompany,
			applicantInactiveCompany,
			applicantWithCompanyWithoutCapacityRate,
			applicantWithCompanyWithoutTermOfferings,
		]
		const allCompanies = [
			companyWithTerms,
			companyInactive,
			companyWithoutCapacityRate,
			companyWithoutTermOfferings,
		]

		const now = new Date()
		const [createdUsers, createdCompanies, [term]] = await Promise.all([
			db
				.insert(users)
				.values(
					allApplicants.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
			db
				.insert(companies)
				.values(
					allCompanies.map((c) => ({
						name: c.name,
						domain: c.domain,
						rate: c.rate,
						borrowingCapacityRate: c.borrowingCapacityRate,
						employeeSalaryFrequency: c.employeeSalaryFrequency,
						active: c.active,
					})),
				)
				.returning(),
			db
				.insert(terms)
				.values({ durationType: 'monthly' as const, duration: 12 })
				.returning(),
		])

		if (!term) throw new Error('Seed: term not created')

		function findUser(email: string) {
			const row = createdUsers.find((u) => u.email === email)
			if (!row) throw new Error(`Seed: user ${email} not found`)
			return row
		}

		const mainCompany = createdCompanies.find(
			(c) => c.domain === companyWithTerms.domain,
		)
		if (!mainCompany) throw new Error('Seed: main company not found')

		const [, [offering]] = await Promise.all([
			db.insert(userRoles).values(
				allApplicants.flatMap((f) =>
					f.roles.map((role) => ({
						userId: findUser(f.email).id,
						role,
					})),
				),
			),
			db
				.insert(termOfferings)
				.values({
					companyId: mainCompany.id,
					termId: term.id,
					disabled: false,
				})
				.returning(),
		])

		if (!offering) throw new Error('Seed: offering not created')

		return {
			applicantId: findUser(applicantWithCompany.email).id,
			applicantBId: findUser(applicantB.email).id,
			termOfferingId: offering.id,
			termId: term.id,
		}
	}

export type CleanupCuentaApplicationsParams = { termId: number }

export const cleanupCuentaApplications = async (
	params: CleanupCuentaApplicationsParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	await deleteBlobsForTerm(db, params.termId)
	const allApplicants = [
		applicantWithCompany,
		applicantB,
		applicantNoCompany,
		applicantInactiveCompany,
		applicantWithCompanyWithoutCapacityRate,
		applicantWithCompanyWithoutTermOfferings,
	]
	const allCompanies = [
		companyWithTerms,
		companyInactive,
		companyWithoutCapacityRate,
		companyWithoutTermOfferings,
	]
	await Promise.all(
		allApplicants.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await Promise.all(
		allCompanies.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	const stillUsed = await db
		.select({ id: termOfferings.id })
		.from(termOfferings)
		.where(eq(termOfferings.termId, params.termId))
		.limit(1)
	if (stillUsed.length === 0) {
		await db.delete(terms).where(eq(terms.id, params.termId))
	}
	return null
}

export type SeedCompanySwitcherResult = {
	agentId: number
}

export const seedCompanySwitcher =
	async (): Promise<SeedCompanySwitcherResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		await db.delete(users).where(eq(users.email, agentWithAssignments.email))
		await Promise.all(
			switcherCompanyList.map((c) =>
				db.delete(companies).where(eq(companies.domain, c.domain)),
			),
		)

		const now = new Date()
		const [[agent], createdCompanies] = await Promise.all([
			db
				.insert(users)
				.values({
					email: agentWithAssignments.email,
					name: agentWithAssignments.name,
					emailVerified: now,
				})
				.returning(),
			db
				.insert(companies)
				.values(
					switcherCompanyList.map((c) => ({
						name: c.name,
						domain: c.domain,
						rate: c.rate,
						employeeSalaryFrequency: c.employeeSalaryFrequency,
						active: c.active,
					})),
				)
				.returning(),
		])

		if (!agent) throw new Error('Seed: agent not created')

		function findCompany(domain: string) {
			const row = createdCompanies.find((c) => c.domain === domain)
			if (!row) throw new Error(`Seed: company ${domain} not found`)
			return row
		}

		const assignedDomains = [
			companyAssignedActive.domain,
			companyAssignedActive2.domain,
			companyAssignedInactive.domain,
		]

		await Promise.all([
			db.insert(userRoles).values(
				agentWithAssignments.roles.map((role) => ({
					userId: agent.id,
					role,
				})),
			),
			db.insert(userCompanies).values(
				assignedDomains.map((domain) => ({
					userId: agent.id,
					companyId: findCompany(domain).id,
				})),
			),
		])

		return { agentId: agent.id }
	}

export const cleanupCompanySwitcher = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, agentWithAssignments.email))
	await Promise.all(
		switcherCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	return null
}

export type SeedAdminUsersResult = {
	adminId: number
}

export const seedAdminUsers = async (): Promise<SeedAdminUsersResult> => {
	const db = getDb(process.env.DATABASE_URL || '')

	const allUserFixtures = [
		usersAdminUser,
		applicantOnlyUser,
		agentOnlyUser,
		...userList,
	]
	const companyDomains = usersCompanyList.map((c) => c.domain)

	await Promise.all(
		allUserFixtures.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await Promise.all(
		companyDomains.map((d) =>
			db.delete(companies).where(eq(companies.domain, d)),
		),
	)

	const now = new Date()
	const [createdUsers] = await Promise.all([
		db
			.insert(users)
			.values(
				allUserFixtures.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
		db.insert(companies).values(
			usersCompanyList.map((c) => ({
				name: c.name,
				domain: c.domain,
				rate: c.rate,
				employeeSalaryFrequency: c.employeeSalaryFrequency,
			})),
		),
	])

	function findUser(email: string) {
		const row = createdUsers.find((u) => u.email === email)
		if (!row) throw new Error(`Seed: user ${email} not found`)
		return row
	}

	await db.insert(userRoles).values(
		allUserFixtures.flatMap((f) =>
			f.roles.map((role) => ({
				userId: findUser(f.email).id,
				role,
			})),
		),
	)

	return { adminId: findUser(usersAdminUser.email).id }
}

export const cleanupAdminUsers = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	const allUserFixtures = [
		usersAdminUser,
		applicantOnlyUser,
		agentOnlyUser,
		...userList,
	]
	await Promise.all(
		allUserFixtures.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await Promise.all(
		usersCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	return null
}

const ALL_E2E_COMPANY_DOMAINS = [
	...companiesCompanyList.map((c) => c.domain),
	...usersCompanyList.map((c) => c.domain),
	...overviewCompanyList.map((c) => c.domain),
	...switcherCompanyList.map((c) => c.domain),
	...allReviewCompanies.map((c) => c.domain),
	'newtest.com',
	'norate.com',
	'edittest.com',
]

export type SeedAdminCompaniesResult = {
	adminId: number
}

export const seedAdminCompanies =
	async (): Promise<SeedAdminCompaniesResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		const companyDomains = companiesCompanyList.map((c) => c.domain)
		await Promise.all(
			companyDomains.map((d) =>
				db.delete(companies).where(eq(companies.domain, d)),
			),
		)
		await db.delete(users).where(eq(users.email, companiesAdminUser.email))

		const now = new Date()
		const [[admin]] = await Promise.all([
			db
				.insert(users)
				.values({
					email: companiesAdminUser.email,
					name: companiesAdminUser.name,
					emailVerified: now,
				})
				.returning(),
			db.insert(companies).values(
				companiesCompanyList.map((c) => ({
					name: c.name,
					domain: c.domain,
					rate: c.rate,
					borrowingCapacityRate: c.borrowingCapacityRate,
					employeeSalaryFrequency: c.employeeSalaryFrequency,
					active: c.active,
				})),
			),
		])

		if (!admin) throw new Error('Seed: admin not created')

		await db.insert(userRoles).values(
			companiesAdminUser.roles.map((role) => ({
				userId: admin.id,
				role,
			})),
		)

		return { adminId: admin.id }
	}

export const cleanupAdminCompanies = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, companiesAdminUser.email))
	await Promise.all(
		ALL_E2E_COMPANY_DOMAINS.map((domain) =>
			db.delete(companies).where(eq(companies.domain, domain)),
		),
	)
	return null
}

export const seedAdminOverview = async () => {
	const db = getDb(process.env.DATABASE_URL || '')

	await db.delete(users).where(eq(users.email, adminOverviewAdmin.email))
	await Promise.all(
		overviewCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)

	const now = new Date()
	const [[admin]] = await Promise.all([
		db
			.insert(users)
			.values({
				email: adminOverviewAdmin.email,
				name: adminOverviewAdmin.name,
				emailVerified: now,
			})
			.returning(),
		db.insert(companies).values(
			overviewCompanyList.map((c) => ({
				name: c.name,
				domain: c.domain,
				rate: c.rate,
				employeeSalaryFrequency: c.employeeSalaryFrequency,
				active: true,
			})),
		),
	])

	if (!admin) throw new Error('Seed: admin not created')

	await db.insert(userRoles).values(
		adminOverviewAdmin.roles.map((role) => ({
			userId: admin.id,
			role,
		})),
	)

	return null
}

export const cleanupAdminOverview = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, adminOverviewAdmin.email))
	await Promise.all(
		overviewCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	return null
}

export const seedAgentNoAssignments = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, agentNoAssignments.email))

	const [agent] = await db
		.insert(users)
		.values({
			email: agentNoAssignments.email,
			name: agentNoAssignments.name,
			emailVerified: new Date(),
		})
		.returning()

	if (!agent) throw new Error('Seed: agent not created')

	await db.insert(userRoles).values(
		agentNoAssignments.roles.map((role) => ({
			userId: agent.id,
			role,
		})),
	)

	return null
}

export const cleanupAgentNoAssignments = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, agentNoAssignments.email))
	return null
}

const TOTP_USER = {
	name: 'TOTP User',
	email: 'totp@example.com',
	roles: ['applicant'] as const,
}

export const seedSecurity = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	const emails = [loginApplicantUser.email, TOTP_USER.email]
	await Promise.all(
		emails.map((e) => db.delete(users).where(eq(users.email, e))),
	)

	const now = new Date()
	const createdUsers = await db
		.insert(users)
		.values([
			{
				email: loginApplicantUser.email,
				name: loginApplicantUser.name,
				emailVerified: now,
			},
			{
				email: TOTP_USER.email,
				name: TOTP_USER.name,
				emailVerified: now,
			},
		])
		.returning()

	await db.insert(userRoles).values(
		createdUsers.flatMap((u) => {
			const fixture =
				u.email === loginApplicantUser.email ? loginApplicantUser : TOTP_USER
			return fixture.roles.map((role) => ({
				userId: u.id,
				role,
			}))
		}),
	)

	return null
}

export const cleanupSecurity = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	const securityEmails = [loginApplicantUser.email, TOTP_USER.email]
	await db.delete(emailOtps).where(inArray(emailOtps.email, securityEmails))
	await Promise.all([
		db.delete(users).where(eq(users.email, loginApplicantUser.email)),
		db.delete(users).where(eq(users.email, TOTP_USER.email)),
	])
	return null
}

export const seedProfile = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, loginApplicantUser.email))

	const [user] = await db
		.insert(users)
		.values({
			email: loginApplicantUser.email,
			name: loginApplicantUser.name,
			emailVerified: new Date(),
		})
		.returning()

	if (!user) throw new Error('Seed: user not created')

	await db.insert(userRoles).values(
		loginApplicantUser.roles.map((role) => ({
			userId: user.id,
			role,
		})),
	)

	return null
}

export const cleanupProfile = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db
		.delete(emailOtps)
		.where(eq(emailOtps.email, loginApplicantUser.email))
	await db.delete(users).where(eq(users.email, loginApplicantUser.email))
	return null
}

export type SeedApplicationsReviewResult = {
	companyId: number
	companyDId: number
	termId: number
	companyBApplicationId: number
	applicationId: number
	applicantA2ApplicationId: number
	applicantA3ApplicationId: number
	applicantA4ApplicationId: number
	applicantA5ApplicationId: number
	preAuthApplicationId: number
	authzApplicationId: number
	authzDenyApplicationId: number
	authzAdminApplicationId: number
}

const OTHER_E2E_APPLICATION_DOMAINS = [
	'example.com',
	'norate.com',
	'noterms.com',
] as const

export const seedApplicationsReview =
	async (): Promise<SeedApplicationsReviewResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		const otherOfferings = await db
			.select({ id: termOfferings.id })
			.from(termOfferings)
			.innerJoin(companies, eq(termOfferings.companyId, companies.id))
			.where(inArray(companies.domain, [...OTHER_E2E_APPLICATION_DOMAINS]))
		if (otherOfferings.length > 0) {
			await db.delete(applications).where(
				inArray(
					applications.termOfferingId,
					otherOfferings.map((o) => o.id),
				),
			)
		}

		const allUserFixtures = [
			agentForReview,
			preAuthAgentForReview,
			authorizationsAgentForReview,
			dualQueueAgentForReview,
			adminForReview,
			...allReviewApplicants,
		]

		await Promise.all(
			allUserFixtures.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await Promise.all(
			allReviewCompanies.map((c) =>
				db.delete(companies).where(eq(companies.domain, c.domain)),
			),
		)

		// Delete orphaned terms left by retries (company cascade-deletes
		// term_offerings, but the term row stays).
		await db
			.delete(terms)
			.where(
				notExists(
					db
						.select({ id: termOfferings.id })
						.from(termOfferings)
						.where(eq(termOfferings.termId, terms.id)),
				),
			)

		const now = new Date()
		const [createdUsers, createdCompanies, createdTerms] = await Promise.all([
			db
				.insert(users)
				.values(
					allUserFixtures.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
			db
				.insert(companies)
				.values(
					allReviewCompanies.map((c) => ({
						name: c.name,
						domain: c.domain,
						rate: c.rate,
						borrowingCapacityRate: c.borrowingCapacityRate,
						employeeSalaryFrequency: c.employeeSalaryFrequency,
						active: c.active,
					})),
				)
				.returning(),
			db
				.insert(terms)
				.values({ durationType: 'monthly' as const, duration: 12 })
				.returning(),
		])

		const term = createdTerms[0]
		if (!term) throw new Error('Seed: term not created')

		function findUser(email: string) {
			const row = createdUsers.find((u) => u.email === email)
			if (!row) throw new Error(`Seed: user ${email} not found`)
			return row
		}

		function findCompany(domain: string) {
			const row = createdCompanies.find((c) => c.domain === domain)
			if (!row) throw new Error(`Seed: company ${domain} not found`)
			return row
		}

		const requestsAgent = findUser(agentForReview.email)
		const preAuthAgent = findUser(preAuthAgentForReview.email)
		const authorizationsAgent = findUser(authorizationsAgentForReview.email)
		const dualQueueAgent = findUser(dualQueueAgentForReview.email)

		const [, offerings] = await Promise.all([
			db.insert(userRoles).values(
				allUserFixtures.flatMap((f) =>
					f.roles.map((role) => ({
						userId: findUser(f.email).id,
						role,
					})),
				),
			),
			db
				.insert(termOfferings)
				.values(
					createdCompanies.map((c) => ({
						companyId: c.id,
						termId: term.id,
						disabled: false,
					})),
				)
				.returning(),
			db.insert(userCompanies).values(
				[
					requestsAgent,
					preAuthAgent,
					authorizationsAgent,
					dualQueueAgent,
				].flatMap((user) =>
					agentCompanyDomains.map((domain) => ({
						userId: user.id,
						companyId: findCompany(domain).id,
					})),
				),
			),
		])

		function findOffering(domain: string) {
			const company = findCompany(domain)
			const row = offerings.find((o) => o.companyId === company.id)
			if (!row) throw new Error(`Seed: offering for ${domain} not found`)
			return row
		}

		const preparedApplications = reviewApplicationConfigs.map((cfg, index) => {
			const applicant = findUser(cfg.applicantEmail)
			const finalStatus = cfg.status ?? 'pending'
			const baseTime = new Date(
				now.getTime() - (reviewApplicationConfigs.length - index) * 10 * 60_000,
			)
			const timeline = createOrderedSeedStatusHistory({
				finalStatus,
				defaultActorUserId: applicant.id,
				steps: cfg.statusHistory?.map((step) => ({
					status: step.status,
					setByUserId:
						step.actorEmail == null ? null : findUser(step.actorEmail).id,
				})),
			})

			return {
				insertValues: {
					applicantId: applicant.id,
					companyId: findCompany(cfg.companyDomain).id,
					termOfferingId:
						cfg.creditAmount == null
							? null
							: findOffering(cfg.companyDomain).id,
					creditAmount: cfg.creditAmount,
					salaryAtApplication: cfg.salaryAtApplication,
					salaryFrequency: cfg.salaryFrequency ?? 'monthly',
					status: finalStatus,
				},
				baseTime,
				timeline,
			}
		})

		const apps = await db
			.insert(applications)
			.values(preparedApplications.map((item) => item.insertValues))
			.returning()

		function appForApplicantEmail(email: string) {
			const applicant = findUser(email)
			const app = apps.find((a) => a.applicantId === applicant.id)
			if (!app) {
				throw new Error(
					`Seed: application row for applicant ${email} not found`,
				)
			}
			return app
		}

		await db.insert(applicationStatusHistory).values(
			preparedApplications.flatMap((prepared, index) => {
				const cfg = reviewApplicationConfigs[index]
				if (!cfg) {
					throw new Error('Seed: missing review application config')
				}
				const app = appForApplicantEmail(cfg.applicantEmail)

				return prepared.timeline.map((entry, entryIndex) => ({
					applicationId: app.id,
					status: entry.status,
					setByUserId: entry.setByUserId,
					createdAt: new Date(
						prepared.baseTime.getTime() + entryIndex * 60_000,
					),
				}))
			}),
		)

		const preAuthApp = appForApplicantEmail(applicantPreAuth.email)
		await db.insert(applicationDocuments).values([
			{
				applicationId: preAuthApp.id,
				documentType: 'official-id',
				status: 'approved',
				fileName: 'seed-ine.pdf',
				storageKey: `application-documents/${preAuthApp.id}/official-id/seed-ine.pdf`,
			},
			{
				applicationId: preAuthApp.id,
				documentType: 'proof-of-address',
				status: 'approved',
				fileName: 'seed-address.pdf',
				storageKey: `application-documents/${preAuthApp.id}/proof-of-address/seed-address.pdf`,
			},
			{
				applicationId: preAuthApp.id,
				documentType: 'bank-statement',
				status: 'approved',
				fileName: 'seed-bank.pdf',
				storageKey: `application-documents/${preAuthApp.id}/bank-statement/seed-bank.pdf`,
			},
		])

		const authzAwaitingApplicants = [
			applicantAuthzAwaiting,
			applicantAuthzDeny,
			applicantAuthzAdmin,
		] as const
		let authzAppForDocs: (typeof apps)[number] | undefined
		let authzDenyAppForDocs: (typeof apps)[number] | undefined
		let authzAdminAppForDocs: (typeof apps)[number] | undefined
		for (const applicant of authzAwaitingApplicants) {
			const appRow = appForApplicantEmail(applicant.email)
			if (applicant.email === applicantAuthzAwaiting.email)
				authzAppForDocs = appRow
			if (applicant.email === applicantAuthzDeny.email)
				authzDenyAppForDocs = appRow
			if (applicant.email === applicantAuthzAdmin.email)
				authzAdminAppForDocs = appRow
			const id = appRow.id
			const approvedInitialIntake = [
				{
					applicationId: id,
					documentType: 'official-id' as const,
					status: 'approved' as const,
					fileName: `seed-intake-ine-authz-${id}.pdf`,
					storageKey: `application-documents/${id}/official-id/seed-intake-ine-authz-${id}.pdf`,
				},
				{
					applicationId: id,
					documentType: 'proof-of-address' as const,
					status: 'approved' as const,
					fileName: `seed-intake-address-authz-${id}.pdf`,
					storageKey: `application-documents/${id}/proof-of-address/seed-intake-address-authz-${id}.pdf`,
				},
				{
					applicationId: id,
					documentType: 'bank-statement' as const,
					status: 'approved' as const,
					fileName: `seed-intake-bank-authz-${id}.pdf`,
					storageKey: `application-documents/${id}/bank-statement/seed-intake-bank-authz-${id}.pdf`,
				},
			] as const
			const packagePending =
				applicant.email !== applicantAuthzAdmin.email
					? ([
							{
								applicationId: id,
								documentType: 'payroll-receipt' as const,
								status: 'pending' as const,
								fileName: `seed-payroll-authz-${id}.pdf`,
								storageKey: `application-documents/${id}/payroll-receipt/seed-payroll-authz-${id}.pdf`,
							},
							{
								applicationId: id,
								documentType: 'contract' as const,
								status: 'pending' as const,
								fileName: `seed-contract-authz-${id}.pdf`,
								storageKey: `application-documents/${id}/contract/seed-contract-authz-${id}.pdf`,
							},
							{
								applicationId: id,
								documentType: 'authorization' as const,
								status: 'pending' as const,
								fileName: `seed-authorization-authz-${id}.pdf`,
								storageKey: `application-documents/${id}/authorization/seed-authorization-authz-${id}.pdf`,
							},
						] as const)
					: ([
							{
								applicationId: id,
								documentType: 'payroll-receipt' as const,
								status: 'approved' as const,
								fileName: `seed-payroll-authz-admin-${id}.pdf`,
								storageKey: `application-documents/${id}/payroll-receipt/seed-payroll-authz-admin-${id}.pdf`,
							},
							{
								applicationId: id,
								documentType: 'contract' as const,
								status: 'approved' as const,
								fileName: `seed-contract-authz-admin-${id}.pdf`,
								storageKey: `application-documents/${id}/contract/seed-contract-authz-admin-${id}.pdf`,
							},
							{
								applicationId: id,
								documentType: 'authorization' as const,
								status: 'approved' as const,
								fileName: `seed-authorization-authz-admin-${id}.pdf`,
								storageKey: `application-documents/${id}/authorization/seed-authorization-authz-admin-${id}.pdf`,
							},
						] as const)
			await db
				.insert(applicationDocuments)
				.values([...approvedInitialIntake, ...packagePending])
		}
		if (
			authzAppForDocs == null ||
			authzDenyAppForDocs == null ||
			authzAdminAppForDocs == null
		) {
			throw new Error('Seed: authz awaiting applications missing after insert')
		}

		const companyBApp = appForApplicantEmail(applicantForReviewB.email)
		const applicationForReviewApp = appForApplicantEmail(
			applicantForReview.email,
		)
		const applicantA2App = appForApplicantEmail(applicantA2.email)
		const applicantA3App = appForApplicantEmail(applicantA3.email)
		const applicantA4App = appForApplicantEmail(applicantA4.email)
		const applicantA5App = appForApplicantEmail(applicantA5.email)

		return {
			companyId: findCompany(companyForReview.domain).id,
			companyDId: findCompany(companyForReviewD.domain).id,
			termId: term.id,
			companyBApplicationId: companyBApp.id,
			applicationId: applicationForReviewApp.id,
			applicantA2ApplicationId: applicantA2App.id,
			applicantA3ApplicationId: applicantA3App.id,
			applicantA4ApplicationId: applicantA4App.id,
			applicantA5ApplicationId: applicantA5App.id,
			preAuthApplicationId: preAuthApp.id,
			authzApplicationId: authzAppForDocs.id,
			authzDenyApplicationId: authzDenyAppForDocs.id,
			authzAdminApplicationId: authzAdminAppForDocs.id,
		}
	}

export type CleanupApplicationsReviewParams = {
	termId: number
}

export const cleanupApplicationsReview = async (
	params: CleanupApplicationsReviewParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	await deleteBlobsForTerm(db, params.termId)
	const allUserFixtures = [
		agentForReview,
		preAuthAgentForReview,
		authorizationsAgentForReview,
		dualQueueAgentForReview,
		adminForReview,
		...allReviewApplicants,
	]

	await Promise.all(
		allUserFixtures.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await Promise.all(
		allReviewCompanies.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	await db.delete(terms).where(eq(terms.id, params.termId))

	return null
}

export type SeedRoleQueueNavResult = {
	companyId: number
}

export const seedRoleQueueNav = async (): Promise<SeedRoleQueueNavResult> => {
	const db = getDb(process.env.DATABASE_URL || '')

	await Promise.all(
		allNavAgents.map((a) => db.delete(users).where(eq(users.email, a.email))),
	)
	await db.delete(companies).where(eq(companies.domain, navCompany.domain))

	const now = new Date()
	const [[company], createdAgents] = await Promise.all([
		db
			.insert(companies)
			.values({
				name: navCompany.name,
				domain: navCompany.domain,
				rate: navCompany.rate,
				employeeSalaryFrequency: navCompany.employeeSalaryFrequency,
				active: navCompany.active,
			})
			.returning(),
		db
			.insert(users)
			.values(
				allNavAgents.map((a) => ({
					email: a.email,
					name: a.name,
					emailVerified: now,
				})),
			)
			.returning(),
	])

	if (!company) throw new Error('Seed: nav company not created')

	await Promise.all(
		createdAgents.flatMap((agent) => {
			const fixture = allNavAgents.find((a) => a.email === agent.email)
			if (!fixture)
				throw new Error(`Seed: fixture not found for ${agent.email}`)
			return [
				db.insert(userRoles).values(
					fixture.roles.map((role) => ({
						userId: agent.id,
						role,
					})),
				),
				db.insert(userCompanies).values({
					userId: agent.id,
					companyId: company.id,
				}),
			]
		}),
	)

	return { companyId: company.id }
}

export const cleanupRoleQueueNav = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allNavAgents.map((a) => db.delete(users).where(eq(users.email, a.email))),
	)
	await db.delete(companies).where(eq(companies.domain, navCompany.domain))
	return null
}

// ──────────────────────────────────────────────────────────────────────────────
// HR agents
// ──────────────────────────────────────────────────────────────────────────────

export type SeedHrReviewResult = {
	companyId: number
	applicationId: number
	adminApplicationId: number
	differentDateApplicationId: number
	termId: number
}

export const seedHrReview = async (): Promise<SeedHrReviewResult> => {
	const db = getDb(process.env.DATABASE_URL || '')

	// Cleanup first
	await Promise.all(
		allHrUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, hrCompany.domain))

	const now = new Date()

	// Create company, users, and term in parallel
	const [[company], createdUsers] = await Promise.all([
		db
			.insert(companies)
			.values({
				name: hrCompany.name,
				domain: hrCompany.domain,
				rate: hrCompany.rate,
				employeeSalaryFrequency: hrCompany.employeeSalaryFrequency,
				active: hrCompany.active,
			})
			.returning(),
		db
			.insert(users)
			.values(
				allHrUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
	])

	if (!company) throw new Error('Seed HR: company not created')

	const findUser = (email: string) => {
		const u = createdUsers.find((r) => r.email === email)
		if (!u) throw new Error(`Seed HR: user ${email} not found`)
		return u
	}

	// Create term + offering
	const [term] = await db
		.insert(terms)
		.values({
			durationType: 'monthly',
			duration: 12,
		})
		.returning()

	if (!term) throw new Error('Seed HR: term not created')

	const [offering] = await db
		.insert(termOfferings)
		.values({
			termId: term.id,
			companyId: company.id,
		})
		.returning()

	if (!offering) throw new Error('Seed HR: offering not created')

	// Assign roles and company associations
	await Promise.all(
		createdUsers.flatMap((agent) => {
			const fixture = allHrUsers.find((u) => u.email === agent.email)
			if (!fixture)
				throw new Error(`Seed HR: fixture not found for ${agent.email}`)
			return [
				db.insert(userRoles).values(
					fixture.roles.map((role) => ({
						userId: agent.id,
						role,
					})),
				),
				...(new Set<string>(fixture.roles).has('agent')
					? [
							db.insert(userCompanies).values({
								userId: agent.id,
								companyId: company.id,
							}),
						]
					: []),
			]
		}),
	)

	const applicant = findUser('applicant@hrcompany.com')

	// Create 3 authorized applications (firstDiscountDate = null → HR pending)
	const appValues = [
		{ creditAmount: '50000.00', salaryAtApplication: '40000' },
		{ creditAmount: '60000.00', salaryAtApplication: '45000' },
		{ creditAmount: '70000.00', salaryAtApplication: '50000' },
	]
	const createdApps = await db
		.insert(applications)
		.values(
			appValues.map((v) => ({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: v.creditAmount,
				salaryAtApplication: v.salaryAtApplication,
				salaryFrequency: hrCompany.employeeSalaryFrequency,
				status: 'authorized' as const,
			})),
		)
		.returning()

	if (createdApps.length !== 3)
		throw new Error('Seed HR: expected 3 applications')
	const [app, adminApp, differentDateApp] = createdApps
	if (!app || !adminApp || !differentDateApp)
		throw new Error('Seed HR: applications not created')

	// Status history + documents for all 3 apps
	const docTypes = [
		'official-id',
		'proof-of-address',
		'bank-statement',
		'payroll-receipt',
		'contract',
		'authorization',
	] as const

	const timeline = createOrderedSeedStatusHistory({
		finalStatus: 'authorized',
		defaultActorUserId: applicant.id,
	})
	const baseTime = new Date(now.getTime() - 60 * 60_000)

	for (const a of createdApps) {
		await db.insert(applicationStatusHistory).values(
			timeline.map((entry, index) => ({
				applicationId: a.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(baseTime.getTime() + index * 60_000),
			})),
		)
		await db.insert(applicationDocuments).values(
			docTypes.map((docType) => ({
				applicationId: a.id,
				documentType: docType,
				status: 'approved' as const,
				fileName: `hr-seed-${docType}-${a.id}.pdf`,
				storageKey: `application-documents/${a.id}/${docType}/hr-seed-${docType}-${a.id}.pdf`,
			})),
		)
	}

	return {
		companyId: company.id,
		applicationId: app.id,
		adminApplicationId: adminApp.id,
		differentDateApplicationId: differentDateApp.id,
		termId: term.id,
	}
}

export const cleanupHrReview = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allHrUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, hrCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

export type SeedDisbursementReviewResult = {
	companyId: number
	applicationId: number
	secondApplicationId: number
	hrPendingApplicantName: string
	termId: number
}

export const seedDisbursementReview =
	async (): Promise<SeedDisbursementReviewResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		await Promise.all(
			allDisbUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
		)
		await db.delete(companies).where(eq(companies.domain, disbCompany.domain))

		const now = new Date()

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: disbCompany.name,
					domain: disbCompany.domain,
					rate: disbCompany.rate,
					employeeSalaryFrequency: disbCompany.employeeSalaryFrequency,
					active: disbCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allDisbUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company) throw new Error('Seed Disb: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u) throw new Error(`Seed Disb: user ${email} not found`)
			return u
		}

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 12 })
			.returning()

		if (!term) throw new Error('Seed Disb: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering) throw new Error('Seed Disb: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allDisbUsers.find((u) => u.email === agent.email)
				if (!fixture)
					throw new Error(`Seed Disb: fixture not found for ${agent.email}`)
				return [
					db.insert(userRoles).values(
						fixture.roles.map((role) => ({
							userId: agent.id,
							role,
						})),
					),
					...(new Set<string>(fixture.roles).has('agent')
						? [
								db.insert(userCompanies).values({
									userId: agent.id,
									companyId: company.id,
								}),
							]
						: []),
				]
			}),
		)

		const applicant = findUser('applicant@disbcompany.com')
		const hrPendingApplicantUser = findUser(
			'hr.pending.applicant@disbcompany.com',
		)

		const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60_000)

		const createdApps = await db
			.insert(applications)
			.values([
				{
					applicantId: applicant.id,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount: '50000.00',
					salaryAtApplication: '40000',
					salaryFrequency: disbCompany.employeeSalaryFrequency,
					status: 'authorized' as const,
					firstDiscountDate: futureDate,
				},
				{
					applicantId: applicant.id,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount: '60000.00',
					salaryAtApplication: '45000',
					salaryFrequency: disbCompany.employeeSalaryFrequency,
					status: 'authorized' as const,
					firstDiscountDate: futureDate,
				},
				{
					applicantId: hrPendingApplicantUser.id,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount: '70000.00',
					salaryAtApplication: '50000',
					salaryFrequency: disbCompany.employeeSalaryFrequency,
					status: 'authorized' as const,
				},
			])
			.returning()

		if (createdApps.length !== 3)
			throw new Error('Seed Disb: expected 3 applications')
		const [app1, app2, hrPendingApp] = createdApps
		if (!app1 || !app2 || !hrPendingApp)
			throw new Error('Seed Disb: applications not created')

		const docTypes = [
			'official-id',
			'proof-of-address',
			'bank-statement',
			'payroll-receipt',
			'contract',
			'authorization',
		] as const

		const timeline = createOrderedSeedStatusHistory({
			finalStatus: 'authorized',
			defaultActorUserId: applicant.id,
		})
		const baseTime = new Date(now.getTime() - 60 * 60_000)

		for (const a of createdApps) {
			await db.insert(applicationStatusHistory).values(
				timeline.map((entry, index) => ({
					applicationId: a.id,
					status: entry.status,
					setByUserId: entry.setByUserId,
					createdAt: new Date(baseTime.getTime() + index * 60_000),
				})),
			)
			await db.insert(applicationDocuments).values(
				docTypes.map((docType) => ({
					applicationId: a.id,
					documentType: docType,
					status: 'approved' as const,
					fileName: `disb-seed-${docType}-${a.id}.pdf`,
					storageKey: `application-documents/${a.id}/${docType}/disb-seed-${docType}-${a.id}.pdf`,
				})),
			)
		}

		return {
			companyId: company.id,
			applicationId: app1.id,
			secondApplicationId: app2.id,
			hrPendingApplicantName: hrPendingApplicantUser.name,
			termId: term.id,
		}
	}

export const cleanupDisbursementReview = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allDisbUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, disbCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

// --- Cuenta Credits ---

export type SeedCuentaCreditsResult = {
	companyId: number
	applicationId: number
	creditAmount: string
	creditId: number | null
	settledCreditId: number | null
	settledCreditAmount: string | null
	confirmedPaymentRowIndex: number
	processingPaymentRowIndex: number
	pendingPaymentRowIndex: number
}

async function seedCuentaCreditsBase(
	withCredit: boolean,
): Promise<SeedCuentaCreditsResult> {
	const db = getDb(process.env.DATABASE_URL || '')
	const now = new Date()

	await Promise.all(
		allCreditsUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db.delete(companies).where(eq(companies.domain, creditsCompany.domain))

	const [[company], createdUsers] = await Promise.all([
		db
			.insert(companies)
			.values({
				name: creditsCompany.name,
				domain: creditsCompany.domain,
				rate: creditsCompany.rate,
				employeeSalaryFrequency: creditsCompany.employeeSalaryFrequency,
				active: creditsCompany.active,
			})
			.returning(),
		db
			.insert(users)
			.values(
				allCreditsUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
	])

	if (!company) throw new Error('Seed Credits: company not created')

	const applicantUser = createdUsers.find(
		(u) => u.email === creditsApplicant.email,
	)
	if (!applicantUser) throw new Error('Seed Credits: applicant user not found')

	const otherApplicantUser = createdUsers.find(
		(u) => u.email === creditsOtherApplicant.email,
	)
	if (!otherApplicantUser)
		throw new Error('Seed Credits: other applicant user not found')

	await db.insert(userRoles).values([
		...creditsApplicant.roles.map((role) => ({
			userId: applicantUser.id,
			role,
		})),
		...creditsOtherApplicant.roles.map((role) => ({
			userId: otherApplicantUser.id,
			role,
		})),
	])

	const [term] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 12 })
		.returning()
	if (!term) throw new Error('Seed Credits: term not created')

	const [offering] = await db
		.insert(termOfferings)
		.values({ termId: term.id, companyId: company.id })
		.returning()
	if (!offering) throw new Error('Seed Credits: offering not created')

	const creditAmount = '50000.00'
	const status = withCredit ? ('disbursed' as const) : ('authorized' as const)

	const [app] = await db
		.insert(applications)
		.values({
			applicantId: applicantUser.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount,
			salaryAtApplication: '40000',
			salaryFrequency: creditsCompany.employeeSalaryFrequency,
			status,
			firstDiscountDate: new Date(now.getTime() + 30 * 24 * 60 * 60_000),
			transferReference: withCredit ? 'REF-DISPersed-SEED' : null,
			receiptFileName: withCredit ? 'recibo-dispersado.pdf' : null,
		})
		.returning()
	if (!app) throw new Error('Seed Credits: application not created')

	const timeline = createOrderedSeedStatusHistory({
		finalStatus: status,
		defaultActorUserId: applicantUser.id,
	})
	const baseTime = new Date(now.getTime() - 60 * 60_000)
	await db.insert(applicationStatusHistory).values(
		timeline.map((entry, index) => ({
			applicationId: app.id,
			status: entry.status,
			setByUserId: entry.setByUserId,
			createdAt: new Date(baseTime.getTime() + index * 60_000),
		})),
	)

	let creditId: number | null = null
	let settledCreditId: number | null = null
	const settledCreditAmount = '30000.00'
	if (withCredit) {
		const [credit] = await db
			.insert(credits)
			.values({
				applicationId: app.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmount,
				disbursedByUserId: applicantUser.id,
			})
			.returning()
		if (!credit) throw new Error('Seed Credits: credit not created')
		creditId = credit.id

		const firstDiscountDate = new Date(now.getTime() + 30 * 24 * 60 * 60_000)
		const schedule = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount),
			rate: Number(creditsCompany.rate),
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate,
		})

		// Rows 0–1: Fully confirmed ("Confirmado")
		// Row 2: HR confirmed only ("En proceso" to applicant)
		// Rows 3–11: Pending
		await db.insert(creditPayments).values(
			schedule.map((entry, index) => ({
				creditId: credit.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt:
					index <= 2 ? new Date(now.getTime() - 10 * 24 * 60 * 60_000) : null,
				installmentConfirmedAt:
					index <= 1 ? new Date(now.getTime() - 5 * 24 * 60 * 60_000) : null,
			})),
		)

		const settledStatus = 'disbursed' as const
		const [appSettled] = await db
			.insert(applications)
			.values({
				applicantId: applicantUser.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: settledCreditAmount,
				salaryAtApplication: '40000',
				salaryFrequency: creditsCompany.employeeSalaryFrequency,
				status: settledStatus,
				firstDiscountDate: new Date(now.getTime() - 60 * 24 * 60 * 60_000),
				transferReference: 'REF-SETTLED-SEED',
				receiptFileName: 'comprobante-settled.pdf',
			})
			.returning()
		if (!appSettled)
			throw new Error('Seed Credits: settled application not created')

		const settledTimeline = createOrderedSeedStatusHistory({
			finalStatus: settledStatus,
			defaultActorUserId: applicantUser.id,
		})
		const settledBaseTime = new Date(now.getTime() - 120 * 60 * 60_000)
		await db.insert(applicationStatusHistory).values(
			settledTimeline.map((entry, index) => ({
				applicationId: appSettled.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(settledBaseTime.getTime() + index * 60_000),
			})),
		)

		const settledDisbursement = new Date(now.getTime() - 90 * 24 * 60 * 60_000)
		const [creditSettled] = await db
			.insert(credits)
			.values({
				applicationId: appSettled.id,
				status: 'settled',
				disbursementDate: settledDisbursement,
				transferAmount: settledCreditAmount,
				disbursedByUserId: applicantUser.id,
			})
			.returning()
		if (!creditSettled)
			throw new Error('Seed Credits: settled credit not created')
		settledCreditId = creditSettled.id

		const settledFirstDiscount = new Date(
			settledDisbursement.getTime() + 30 * 24 * 60 * 60_000,
		)
		const scheduleSettled = generatePaymentSchedule({
			loanPrincipal: Number(settledCreditAmount),
			rate: Number(creditsCompany.rate),
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: settledFirstDiscount,
		})

		const confirmTs = new Date(now.getTime() - 20 * 24 * 60 * 60_000)
		await db.insert(creditPayments).values(
			scheduleSettled.map((entry) => ({
				creditId: creditSettled.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: confirmTs,
				installmentConfirmedAt: confirmTs,
			})),
		)
	}

	return {
		companyId: company.id,
		applicationId: app.id,
		creditAmount,
		creditId,
		settledCreditId,
		settledCreditAmount: withCredit ? settledCreditAmount : null,
		confirmedPaymentRowIndex: 0,
		processingPaymentRowIndex: 2,
		pendingPaymentRowIndex: 3,
	}
}

export const seedCuentaCredits = async (): Promise<SeedCuentaCreditsResult> => {
	return seedCuentaCreditsBase(true)
}

export const seedCuentaCreditsEmpty =
	async (): Promise<SeedCuentaCreditsResult> => {
		return seedCuentaCreditsBase(false)
	}

export const cleanupCuentaCredits = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditsUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db.delete(companies).where(eq(companies.domain, creditsCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Deductions queue (HR confirms deductions)
// ──────────────────────────────────────────────────────────────────────────────

export type SeedDeductionsQueueResult = {
	companyId: number
	credit1Id: number
	credit2Id: number
	application1Id: number
	expectedRowCount: number
	applicant1Name: string
	applicant2Name: string
	overdueApplicantName: string
	overdueRecentApplicantName: string
	confirmedApplicantName: string
	confirmedApplicationId: number
	confirmedByName: string
	lateConfirmedApplicantName: string
	/** Shown as on-time in history under Mexico City rules while UTC dates would mark late. */
	mxEdgeOnTimeApplicantName: string
	nextDeductionDateISO: string
	firstInstallmentForCsv: {
		payrollNumber: string
		amount: string
		dueDateISO: string
	}
	multiOverdueApplicantName?: string
}

export const seedDeductionsQueue = async (
	options: { withOverdue?: boolean; withMultipleOverdue?: boolean } | null,
): Promise<SeedDeductionsQueueResult> => {
	const withOverdue = options?.withOverdue ?? false
	const withMultipleOverdue = options?.withMultipleOverdue ?? false
	const db = getDb(process.env.DATABASE_URL || '')
	const now = new Date()

	await Promise.all(
		allDeductionUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, deductionsCompany.domain))

	const [[company], createdUsers] = await Promise.all([
		db
			.insert(companies)
			.values({
				name: deductionsCompany.name,
				domain: deductionsCompany.domain,
				rate: deductionsCompany.rate,
				employeeSalaryFrequency: deductionsCompany.employeeSalaryFrequency,
				active: deductionsCompany.active,
			})
			.returning(),
		db
			.insert(users)
			.values(
				allDeductionUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
	])

	if (!company) throw new Error('Seed Deductions: company not created')

	const findUser = (email: string) => {
		const u = createdUsers.find((r) => r.email === email)
		if (!u) throw new Error(`Seed Deductions: user ${email} not found`)
		return u
	}

	const [term] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 4 })
		.returning()

	if (!term) throw new Error('Seed Deductions: term not created')

	const [offering] = await db
		.insert(termOfferings)
		.values({ termId: term.id, companyId: company.id })
		.returning()

	if (!offering) throw new Error('Seed Deductions: offering not created')

	await Promise.all(
		createdUsers.flatMap((agent) => {
			const fixture = allDeductionUsers.find((u) => u.email === agent.email)
			if (!fixture)
				throw new Error(`Seed Deductions: fixture not found for ${agent.email}`)
			const roleInserts = fixture.roles.map((role) => ({
				userId: agent.id,
				role,
			}))
			const hasAgent = new Set<string>(fixture.roles).has('agent')
			return [
				db.insert(userRoles).values(roleInserts),
				...(hasAgent
					? [
							db.insert(userCompanies).values({
								userId: agent.id,
								companyId: company.id,
							}),
						]
					: []),
			]
		}),
	)

	const applicant1 = findUser(applicantDeductions.email)
	const applicant2 = findUser(applicantDeductions2.email)
	const applicantOverdue = findUser(applicantDeductionsOverdue.email)
	const applicantOverdueRecent = findUser(
		applicantDeductionsOverdueRecent.email,
	)
	const applicantMultiOverdue = findUser(applicantDeductionsMultiOverdue.email)
	const applicantConfirmed = findUser(applicantDeductionsConfirmed.email)
	const applicantConfirmedLate = findUser(
		applicantDeductionsConfirmedLate.email,
	)
	const applicantConfirmedMxEdge = findUser(
		applicantDeductionsConfirmedMxEdge.email,
	)

	// Compute next deduction date from the company's salary frequency — same
	// logic as getUpcomingDeductionDate used on the page.
	const nextDeductionDate = getUpcomingDeductionDate(
		deductionsCompany.employeeSalaryFrequency,
		now,
	)
	const nextDeductionDateISO = nextDeductionDate.toISOString()

	const creditAmount1 = '40000.00'
	const creditAmount2 = '30000.00'
	const creditAmountOverdue = '20000.00'

	// Credit 1: upcoming installment on nextDeductionDate (should appear)
	const [app1] = await db
		.insert(applications)
		.values({
			applicantId: applicant1.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmount1,
			salaryAtApplication: '30000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: nextDeductionDate,
			payrollNumber: 'DEDUCT001',
		})
		.returning()

	if (!app1) throw new Error('Seed Deductions: application 1 not created')

	const [credit1] = await db
		.insert(credits)
		.values({
			applicationId: app1.id,
			status: 'dispersed',
			disbursementDate: now,
			transferAmount: creditAmount1,
			disbursedByUserId: applicant1.id,
		})
		.returning()

	if (!credit1) throw new Error('Seed Deductions: credit 1 not created')

	// Credit 2: upcoming installment on nextDeductionDate (should appear)
	const [app2] = await db
		.insert(applications)
		.values({
			applicantId: applicant2.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmount2,
			salaryAtApplication: '25000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: nextDeductionDate,
			payrollNumber: 'DEDUCT002',
		})
		.returning()

	if (!app2) throw new Error('Seed Deductions: application 2 not created')

	const [credit2] = await db
		.insert(credits)
		.values({
			applicationId: app2.id,
			status: 'dispersed',
			disbursementDate: now,
			transferAmount: creditAmount2,
			disbursedByUserId: applicant2.id,
		})
		.returning()

	if (!credit2) throw new Error('Seed Deductions: credit 2 not created')

	const pastDate = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 28),
	)

	// Credit 3: overdue credit — first installment is in the past and unconfirmed.
	// Only seeded when withOverdue is true so the overdue badge doesn't appear in unrelated tests.
	// 2 installments for credit1 on the upcoming period
	const schedule1 = generatePaymentSchedule({
		loanPrincipal: Number(creditAmount1),
		rate: Number(deductionsCompany.rate),
		totalPayments: 2,
		frequency: deductionsCompany.employeeSalaryFrequency,
		firstDiscountDate: nextDeductionDate,
	})
	await db.insert(creditPayments).values(
		schedule1.map((entry) => ({
			creditId: credit1.id,
			dueDate: entry.dueDate,
			amount: entry.amount,
		})),
	)

	// 2 installments for credit2 on the upcoming period
	const schedule2 = generatePaymentSchedule({
		loanPrincipal: Number(creditAmount2),
		rate: Number(deductionsCompany.rate),
		totalPayments: 2,
		frequency: deductionsCompany.employeeSalaryFrequency,
		firstDiscountDate: nextDeductionDate,
	})
	await db.insert(creditPayments).values(
		schedule2.map((entry) => ({
			creditId: credit2.id,
			dueDate: entry.dueDate,
			amount: entry.amount,
		})),
	)

	// Credit 3: overdue credit — first installment is in the past and unconfirmed.
	// Only seeded when withOverdue is true so the overdue badge doesn't appear in unrelated tests.
	if (withOverdue) {
		const [app3] = await db
			.insert(applications)
			.values({
				applicantId: applicantOverdue.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmountOverdue,
				salaryAtApplication: '20000',
				salaryFrequency: deductionsCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: pastDate,
				payrollNumber: 'DEDUCT003',
			})
			.returning()

		if (!app3) throw new Error('Seed Deductions: application 3 not created')

		const [credit3] = await db
			.insert(credits)
			.values({
				applicationId: app3.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmountOverdue,
				disbursedByUserId: applicantOverdue.id,
			})
			.returning()

		if (!credit3) throw new Error('Seed Deductions: credit 3 not created')

		// 1 overdue installment for credit3 (past due, unconfirmed)
		await db.insert(creditPayments).values([
			{
				creditId: credit3.id,
				dueDate: pastDate,
				amount: '20500.00',
			},
		])

		// Credit 7: recently overdue credit — due 3 days ago (< 7 days).
		// Appears in the current overdue snapshot but NOT in the 7-day-ago snapshot,
		// so the overview cards show a measurable week-over-week change.
		const recentPastDate = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 3),
		)
		const creditAmountOverdueRecent = '8500.00'
		const [app7] = await db
			.insert(applications)
			.values({
				applicantId: applicantOverdueRecent.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmountOverdueRecent,
				salaryAtApplication: '18000',
				salaryFrequency: deductionsCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: recentPastDate,
				payrollNumber: 'DEDUCT007',
			})
			.returning()

		if (!app7) throw new Error('Seed Deductions: application 7 not created')

		const [credit7] = await db
			.insert(credits)
			.values({
				applicationId: app7.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmountOverdueRecent,
				disbursedByUserId: applicantOverdueRecent.id,
			})
			.returning()

		if (!credit7) throw new Error('Seed Deductions: credit 7 not created')

		await db.insert(creditPayments).values([
			{
				creditId: credit7.id,
				dueDate: recentPastDate,
				amount: '8713.00',
			},
		])
	}

	// Credit 6: credit with 2 overdue installments — used to test bulk-confirm of multiple payments.
	if (withMultipleOverdue) {
		const pastDate2 = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 28),
		)
		const creditAmountMultiOverdue = '18000.00'
		const [app6] = await db
			.insert(applications)
			.values({
				applicantId: applicantMultiOverdue.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmountMultiOverdue,
				salaryAtApplication: '18000',
				salaryFrequency: deductionsCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: pastDate2,
				payrollNumber: 'DEDUCT006',
			})
			.returning()

		if (!app6) throw new Error('Seed Deductions: application 6 not created')

		const [credit6] = await db
			.insert(credits)
			.values({
				applicationId: app6.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmountMultiOverdue,
				disbursedByUserId: applicantMultiOverdue.id,
			})
			.returning()

		if (!credit6) throw new Error('Seed Deductions: credit 6 not created')

		// 2 overdue installments for credit6 (both past due, both unconfirmed)
		await db.insert(creditPayments).values([
			{
				creditId: credit6.id,
				dueDate: pastDate2,
				amount: '9300.00',
			},
			{
				creditId: credit6.id,
				dueDate: pastDate,
				amount: '9300.00',
			},
		])
	}

	// Credit 4: upcoming installment already HR-confirmed — should NOT appear in
	// the deductions queue because hr_confirmed_at IS NOT NULL.
	const hrAgent = findUser(hrAgentDeductions.email)
	const creditAmountConfirmed = '15000.00'
	const [app4] = await db
		.insert(applications)
		.values({
			applicantId: applicantConfirmed.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmountConfirmed,
			salaryAtApplication: '15000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: nextDeductionDate,
			payrollNumber: 'DEDUCT004',
		})
		.returning()

	if (!app4) throw new Error('Seed Deductions: application 4 not created')

	const [credit4] = await db
		.insert(credits)
		.values({
			applicationId: app4.id,
			status: 'dispersed',
			disbursementDate: now,
			transferAmount: creditAmountConfirmed,
			disbursedByUserId: applicantConfirmed.id,
		})
		.returning()

	if (!credit4) throw new Error('Seed Deductions: credit 4 not created')

	// On-time history row: due must be after confirmation in America/Mexico_City
	// calendar. Using nextDeductionDate as due + hr at now-2m can mark the row
	// late on month-end (UTC end-of-month vs CDMX). Due = now + 10y keeps "a tiempo" stable.
	const credit4HistoryDue = new Date(now)
	credit4HistoryDue.setUTCFullYear(credit4HistoryDue.getUTCFullYear() + 10)
	// credit4 confirmed recently (more recent than credit5) → appears first in history
	const credit4ConfirmedAt = new Date(now.getTime() - 2 * 60_000)
	await db.insert(creditPayments).values([
		{
			creditId: credit4.id,
			dueDate: credit4HistoryDue,
			amount: '15375.00',
			hrConfirmedAt: credit4ConfirmedAt,
			hrConfirmedByUserId: hrAgent.id,
		},
	])

	// Credit 5: past-due installment confirmed after its due date → "late" confirmation
	const creditAmountLate = '12000.00'
	const [app5] = await db
		.insert(applications)
		.values({
			applicantId: applicantConfirmedLate.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmountLate,
			salaryAtApplication: '12000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: pastDate,
			payrollNumber: 'DEDUCT005',
		})
		.returning()

	if (!app5) throw new Error('Seed Deductions: application 5 not created')

	const [credit5] = await db
		.insert(credits)
		.values({
			applicationId: app5.id,
			status: 'dispersed',
			disbursementDate: now,
			transferAmount: creditAmountLate,
			disbursedByUserId: applicantConfirmedLate.id,
		})
		.returning()

	if (!credit5) throw new Error('Seed Deductions: credit 5 not created')

	// confirmed at an older timestamp than credit4 → should appear second in history
	const credit5ConfirmedAt = new Date(now.getTime() - 10 * 60_000)
	await db.insert(creditPayments).values([
		{
			creditId: credit5.id,
			dueDate: pastDate,
			amount: '12300.00',
			hrConfirmedAt: credit5ConfirmedAt,
			hrConfirmedByUserId: hrAgent.id,
		},
	])

	// Credit 8: RH confirmed "next UTC day" but same Mexico City calendar day as due
	// (aligns with resolveCreditDetailDeductionStatus Mexico City edge case).
	const creditAmountMxEdge = '11000.00'
	const [app8] = await db
		.insert(applications)
		.values({
			applicantId: applicantConfirmedMxEdge.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmountMxEdge,
			salaryAtApplication: '11000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: new Date('2022-11-30T12:00:00.000Z'),
			payrollNumber: 'DEDUCT008',
		})
		.returning()

	if (!app8) throw new Error('Seed Deductions: application 8 not created')

	const [credit8] = await db
		.insert(credits)
		.values({
			applicationId: app8.id,
			status: 'dispersed',
			disbursementDate: now,
			transferAmount: creditAmountMxEdge,
			disbursedByUserId: applicantConfirmedMxEdge.id,
		})
		.returning()

	if (!credit8) throw new Error('Seed Deductions: credit 8 not created')

	await db.insert(creditPayments).values([
		{
			creditId: credit8.id,
			dueDate: new Date('2022-11-30T12:00:00.000Z'),
			amount: '11275.00',
			hrConfirmedAt: new Date('2022-12-01T05:00:00.000Z'),
			hrConfirmedByUserId: hrAgent.id,
		},
	])

	const firstPayment = schedule1[0]
	if (!firstPayment) throw new Error('Seed Deductions: schedule1 empty')

	return {
		companyId: company.id,
		credit1Id: credit1.id,
		credit2Id: credit2.id,
		application1Id: app1.id,
		// Only credit1 and credit2 have upcoming installments → 2 rows
		// credit4 is excluded because hr_confirmed_at IS NOT NULL
		expectedRowCount: 2,
		applicant1Name: applicant1.name,
		applicant2Name: applicant2.name,
		overdueApplicantName: applicantOverdue.name,
		overdueRecentApplicantName: applicantOverdueRecent.name,
		confirmedApplicantName: applicantConfirmed.name,
		confirmedApplicationId: app4.id,
		confirmedByName: hrAgent.name,
		lateConfirmedApplicantName: applicantConfirmedLate.name,
		mxEdgeOnTimeApplicantName: applicantConfirmedMxEdge.name,
		nextDeductionDateISO,
		firstInstallmentForCsv: {
			payrollNumber: 'DEDUCT001',
			amount: firstPayment.amount,
			dueDateISO: firstPayment.dueDate.toISOString().slice(0, 10),
		},
		multiOverdueApplicantName: applicantMultiOverdue.name,
	}
}

export const cleanupDeductionsQueue = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allDeductionUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, deductionsCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Installments queue (installments role confirms credit_payment installments)
// ──────────────────────────────────────────────────────────────────────────────

function endOfCurrentMonthUTC(now: Date): Date {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
}

export type SeedInstallmentsQueueResult = {
	companyId: number
	expectedRowCount: number
	/** Queue rows after confirming the first CSV-matched installment (credit may leave the pay-period window). */
	expectedRowCountAfterConfirmingFirstCsvMatch: number
	applicant1Name: string
	applicant2Name: string
	/** Application id for on-time installment confirmation (credit1 / applicant1). */
	onTimeInstallmentApplicationId: number
	/** Application id for late installment confirmation (synthetic row / applicant2). */
	lateInstallmentApplicationId: number
	installmentConfirmedByUserName: string
	firstInstallmentForCsv: {
		payrollNumber: string
		amount: string
		dueDateISO: string
	}
	alreadyReceivedInstallmentForCsv: {
		payrollNumber: string
		amount: string
		dueDateISO: string
	}
	notHrConfirmedInstallmentForCsv: {
		payrollNumber: string
		amount: string
		dueDateISO: string
	}
}

export const seedInstallmentsQueue =
	async (): Promise<SeedInstallmentsQueueResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allInstallmentsQueueUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, installmentsQueueCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: installmentsQueueCompany.name,
					domain: installmentsQueueCompany.domain,
					rate: installmentsQueueCompany.rate,
					employeeSalaryFrequency:
						installmentsQueueCompany.employeeSalaryFrequency,
					active: installmentsQueueCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allInstallmentsQueueUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed Installments Queue: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed Installments Queue: user ${email} not found`)
			return u
		}

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 4 })
			.returning()

		if (!term) throw new Error('Seed Installments Queue: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering)
			throw new Error('Seed Installments Queue: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allInstallmentsQueueUsers.find(
					(u) => u.email === agent.email,
				)
				if (!fixture)
					throw new Error(
						`Seed Installments Queue: fixture not found for ${agent.email}`,
					)
				const roleInserts = fixture.roles.map((role) => ({
					userId: agent.id,
					role,
				}))
				const hasAgent = new Set<string>(fixture.roles).has('agent')
				return [
					db.insert(userRoles).values(roleInserts),
					...(hasAgent
						? [
								db.insert(userCompanies).values({
									userId: agent.id,
									companyId: company.id,
								}),
							]
						: []),
				]
			}),
		)

		const applicant1 = findUser('applicant@installmentsqueue.e2e')
		const applicant2 = findUser('applicant2@installmentsqueue.e2e')
		const firstDiscountDate = endOfCurrentMonthUTC(now)
		// Credit 1: schedule must place the HR-pending installment in the *current* pay
		// period (same cutoff as getInstallmentsForQueue + upcomingDeductionDate).
		const firstDiscountDateCredit1 = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0),
		)
		const creditAmount1 = '40000.00'
		const creditAmount2 = '30000.00'

		// Credit 1: belongs to applicant1 — has HR-confirmed, installment-pending rows
		const [app1] = await db
			.insert(applications)
			.values({
				applicantId: applicant1.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmount1,
				salaryAtApplication: '30000',
				salaryFrequency: installmentsQueueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: firstDiscountDateCredit1,
				payrollNumber: 'INST001',
			})
			.returning()

		if (!app1)
			throw new Error('Seed Installments Queue: application 1 not created')

		const [credit1] = await db
			.insert(credits)
			.values({
				applicationId: app1.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmount1,
				disbursedByUserId: applicant1.id,
			})
			.returning()

		if (!credit1)
			throw new Error('Seed Installments Queue: credit 1 not created')

		// Credit 2: belongs to applicant2 — also has HR-confirmed, installment-pending rows
		const [app2] = await db
			.insert(applications)
			.values({
				applicantId: applicant2.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmount2,
				salaryAtApplication: '25000',
				salaryFrequency: installmentsQueueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
				payrollNumber: 'INST002',
			})
			.returning()

		if (!app2)
			throw new Error('Seed Installments Queue: application 2 not created')

		const [credit2] = await db
			.insert(credits)
			.values({
				applicationId: app2.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmount2,
				disbursedByUserId: applicant2.id,
			})
			.returning()

		if (!credit2)
			throw new Error('Seed Installments Queue: credit 2 not created')

		const installmentQueueAgent = findUser(installmentAgentQueue.email)
		const hrQueueAgent = findUser(hrAgentInstallmentsQueue.email)

		// credit1: first installment fully confirmed; second still pending HR (visible on installments queue, not actionable for installment confirm)
		const schedule1 = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount1),
			rate: Number(installmentsQueueCompany.rate),
			totalPayments: 2,
			frequency: installmentsQueueCompany.employeeSalaryFrequency,
			firstDiscountDate: firstDiscountDateCredit1,
		})
		await db.insert(creditPayments).values(
			schedule1.map((entry, index) => {
				if (index === 0) {
					const dueY = entry.dueDate.getUTCFullYear()
					const dueM = entry.dueDate.getUTCMonth()
					const dueD = entry.dueDate.getUTCDate()
					return {
						creditId: credit1.id,
						dueDate: entry.dueDate,
						amount: entry.amount,
						hrConfirmedAt: new Date(now.getTime() - 10 * 24 * 60 * 60_000),
						hrConfirmedByUserId: hrQueueAgent.id,
						installmentConfirmedAt: new Date(
							Date.UTC(dueY, dueM, dueD, 12, 0, 0),
						),
						installmentConfirmedByUserId: installmentQueueAgent.id,
					}
				}
				return {
					creditId: credit1.id,
					dueDate: entry.dueDate,
					amount: entry.amount,
					hrConfirmedAt: null,
				}
			}),
		)

		// credit2: both installments HR-confirmed + installment-pending (shows in installments queue)
		const schedule2 = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount2),
			rate: Number(installmentsQueueCompany.rate),
			totalPayments: 2,
			frequency: installmentsQueueCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})
		await db.insert(creditPayments).values(
			schedule2.map((entry) => ({
				creditId: credit2.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: new Date(now.getTime() - 5 * 24 * 60 * 60_000),
			})),
		)

		// Extra installment on credit2: installment confirmed after due date (history: late badge)
		await db.insert(creditPayments).values({
			creditId: credit2.id,
			dueDate: new Date(Date.UTC(2019, 5, 1)),
			amount: '100.00',
			hrConfirmedAt: new Date(Date.UTC(2019, 5, 1)),
			hrConfirmedByUserId: hrQueueAgent.id,
			installmentConfirmedAt: new Date(Date.UTC(2019, 6, 15)),
			installmentConfirmedByUserId: installmentQueueAgent.id,
		})

		// Credit 3: second dispersed credit for applicant2 — installment-pending (bulk E2E with credit2)
		const [app3] = await db
			.insert(applications)
			.values({
				applicantId: applicant2.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmount2,
				salaryAtApplication: '25000',
				salaryFrequency: installmentsQueueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
				payrollNumber: 'INST003',
			})
			.returning()

		if (!app3)
			throw new Error('Seed Installments Queue: application 3 not created')

		const [credit3] = await db
			.insert(credits)
			.values({
				applicationId: app3.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmount2,
				disbursedByUserId: applicant2.id,
			})
			.returning()

		if (!credit3)
			throw new Error('Seed Installments Queue: credit 3 not created')

		const schedule3 = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount2),
			rate: Number(installmentsQueueCompany.rate),
			totalPayments: 2,
			frequency: installmentsQueueCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})
		await db.insert(creditPayments).values(
			schedule3.map((entry) => ({
				creditId: credit3.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: new Date(now.getTime() - 4 * 24 * 60 * 60_000),
			})),
		)

		const s1First = schedule1[0]
		const s1Second = schedule1[1]
		const s2First = schedule2[0]
		if (!s1First || !s1Second || !s2First) {
			throw new Error('Seed Installments Queue: schedule entry missing')
		}

		return {
			companyId: company.id,
			expectedRowCount: 3,
			expectedRowCountAfterConfirmingFirstCsvMatch: 2,
			applicant1Name: applicant1.name,
			applicant2Name: applicant2.name,
			onTimeInstallmentApplicationId: app1.id,
			lateInstallmentApplicationId: app2.id,
			installmentConfirmedByUserName: installmentQueueAgent.name ?? '',
			firstInstallmentForCsv: {
				payrollNumber: 'INST002',
				amount: s2First.amount,
				dueDateISO: s2First.dueDate.toISOString().slice(0, 10),
			},
			alreadyReceivedInstallmentForCsv: {
				payrollNumber: 'INST001',
				amount: s1First.amount,
				dueDateISO: s1First.dueDate.toISOString().slice(0, 10),
			},
			notHrConfirmedInstallmentForCsv: {
				payrollNumber: 'INST001',
				amount: s1Second.amount,
				dueDateISO: s1Second.dueDate.toISOString().slice(0, 10),
			},
		}
	}

export const cleanupInstallmentsQueue = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allInstallmentsQueueUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, installmentsQueueCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

export type SeedInstallmentsOverdueResult = {
	companyId: number
	applicantInstallmentsBlockedName: string
	applicantHrBlockedName: string
	payrollInstallmentsBlocked: string
	payrollHrBlocked: string
	totalOverdueRowCount: number
	installmentsBulkConfirmableCount: number
}

export const seedInstallmentsOverdue =
	async (): Promise<SeedInstallmentsOverdueResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allInstallmentsOverdueUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, installmentsOverdueCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: installmentsOverdueCompany.name,
					domain: installmentsOverdueCompany.domain,
					rate: installmentsOverdueCompany.rate,
					employeeSalaryFrequency:
						installmentsOverdueCompany.employeeSalaryFrequency,
					active: installmentsOverdueCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allInstallmentsOverdueUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed Installments Overdue: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed Installments Overdue: user ${email} not found`)
			return u
		}

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 4 })
			.returning()

		if (!term) throw new Error('Seed Installments Overdue: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering)
			throw new Error('Seed Installments Overdue: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allInstallmentsOverdueUsers.find(
					(u) => u.email === agent.email,
				)
				if (!fixture)
					throw new Error(
						`Seed Installments Overdue: fixture not found for ${agent.email}`,
					)
				const roleInserts = fixture.roles.map((role) => ({
					userId: agent.id,
					role,
				}))
				const hasAgent = new Set<string>(fixture.roles).has('agent')
				return [
					db.insert(userRoles).values(roleInserts),
					...(hasAgent
						? [
								db.insert(userCompanies).values({
									userId: agent.id,
									companyId: company.id,
								}),
							]
						: []),
				]
			}),
		)

		const applicantInstallmentsBlocked = findUser(
			applicantOverdueInstallmentsBlocked.email,
		)
		const applicantHrPending = findUser(applicantOverdueHrPending.email)
		const hrAgent = findUser(hrOverdueInstallmentsAgent.email)
		const firstDiscountDate = new Date(Date.UTC(2019, 0, 31))
		const creditAmount = '20000.00'

		const [appInstallmentsBlocked] = await db
			.insert(applications)
			.values({
				applicantId: applicantInstallmentsBlocked.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount,
				salaryAtApplication: '25000',
				salaryFrequency: installmentsOverdueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
				payrollNumber: 'OVERDUE-INST-01',
			})
			.returning()

		if (!appInstallmentsBlocked)
			throw new Error(
				'Seed Installments Overdue: application (installments blocked) not created',
			)

		const [creditInstallmentsBlocked] = await db
			.insert(credits)
			.values({
				applicationId: appInstallmentsBlocked.id,
				status: 'dispersed',
				disbursementDate: new Date(Date.UTC(2019, 0, 1)),
				transferAmount: creditAmount,
				disbursedByUserId: applicantInstallmentsBlocked.id,
			})
			.returning()

		if (!creditInstallmentsBlocked)
			throw new Error(
				'Seed Installments Overdue: credit (installments blocked) not created',
			)

		const scheduleInstallmentsBlocked = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount),
			rate: Number(installmentsOverdueCompany.rate),
			totalPayments: 2,
			frequency: installmentsOverdueCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})

		const hrAt = new Date(Date.UTC(2019, 1, 5))
		await db.insert(creditPayments).values(
			scheduleInstallmentsBlocked.map((entry) => ({
				creditId: creditInstallmentsBlocked.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: hrAt,
				hrConfirmedByUserId: hrAgent.id,
			})),
		)

		const [appHr] = await db
			.insert(applications)
			.values({
				applicantId: applicantHrPending.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount,
				salaryAtApplication: '24000',
				salaryFrequency: installmentsOverdueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
				payrollNumber: 'OVERDUE-HR-01',
			})
			.returning()

		if (!appHr)
			throw new Error(
				'Seed Installments Overdue: application (hr pending) not created',
			)

		const [creditHrBlocked] = await db
			.insert(credits)
			.values({
				applicationId: appHr.id,
				status: 'dispersed',
				disbursementDate: new Date(Date.UTC(2019, 0, 1)),
				transferAmount: creditAmount,
				disbursedByUserId: applicantHrPending.id,
			})
			.returning()

		if (!creditHrBlocked)
			throw new Error(
				'Seed Installments Overdue: credit (hr pending) not created',
			)

		const scheduleHr = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount),
			rate: Number(installmentsOverdueCompany.rate),
			totalPayments: 2,
			frequency: installmentsOverdueCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})

		await db.insert(creditPayments).values(
			scheduleHr.map((entry) => ({
				creditId: creditHrBlocked.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
			})),
		)

		return {
			companyId: company.id,
			applicantInstallmentsBlockedName: applicantInstallmentsBlocked.name ?? '',
			applicantHrBlockedName: applicantHrPending.name ?? '',
			payrollInstallmentsBlocked: 'OVERDUE-INST-01',
			payrollHrBlocked: 'OVERDUE-HR-01',
			totalOverdueRowCount: 2,
			installmentsBulkConfirmableCount: scheduleInstallmentsBlocked.length,
		}
	}

export const cleanupInstallmentsOverdue = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allInstallmentsOverdueUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, installmentsOverdueCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Installments queue — 20 credits with one HR-confirmed / installment-pending row each
// ──────────────────────────────────────────────────────────────────────────────

export type SeedInstallmentsQueueTwentyPendingResult = {
	companyId: number
	expectedQueueRowCount: number
	installmentConfirmedByUserName: string
}

export const seedInstallmentsQueueTwentyPending =
	async (): Promise<SeedInstallmentsQueueTwentyPendingResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allInstallmentsBulkQueueUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, installmentsBulkQueueCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: installmentsBulkQueueCompany.name,
					domain: installmentsBulkQueueCompany.domain,
					rate: installmentsBulkQueueCompany.rate,
					employeeSalaryFrequency:
						installmentsBulkQueueCompany.employeeSalaryFrequency,
					active: installmentsBulkQueueCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allInstallmentsBulkQueueUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed Installments Bulk Queue: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed Installments Bulk Queue: user ${email} not found`)
			return u
		}

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 4 })
			.returning()

		if (!term) throw new Error('Seed Installments Bulk Queue: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering)
			throw new Error('Seed Installments Bulk Queue: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allInstallmentsBulkQueueUsers.find(
					(u) => u.email === agent.email,
				)
				if (!fixture)
					throw new Error(
						`Seed Installments Bulk Queue: fixture not found for ${agent.email}`,
					)
				const roleInserts = fixture.roles.map((role) => ({
					userId: agent.id,
					role,
				}))
				const hasAgent = new Set<string>(fixture.roles).has('agent')
				return [
					db.insert(userRoles).values(roleInserts),
					...(hasAgent
						? [
								db.insert(userCompanies).values({
									userId: agent.id,
									companyId: company.id,
								}),
							]
						: []),
				]
			}),
		)

		const installmentAgent = findUser(installmentsBulkAgent.email)
		const hrAgent = findUser(installmentsBulkHrAgent.email)

		const firstDiscountDate = endOfCurrentMonthUTC(now)
		const creditAmount = '12000.00'

		for (let i = 0; i < installmentsBulkApplicants.length; i++) {
			const applicantFixture = installmentsBulkApplicants[i]
			if (!applicantFixture) {
				throw new Error(
					'Seed Installments Bulk Queue: applicant fixture missing',
				)
			}
			const applicant = findUser(applicantFixture.email)
			const payrollNumber = `BULK${String(i + 1).padStart(3, '0')}`

			const [app] = await db
				.insert(applications)
				.values({
					applicantId: applicant.id,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount,
					salaryAtApplication: '30000',
					salaryFrequency: installmentsBulkQueueCompany.employeeSalaryFrequency,
					status: 'disbursed' as const,
					firstDiscountDate,
					payrollNumber,
				})
				.returning()

			if (!app)
				throw new Error('Seed Installments Bulk Queue: application not created')

			const [credit] = await db
				.insert(credits)
				.values({
					applicationId: app.id,
					status: 'dispersed',
					disbursementDate: now,
					transferAmount: creditAmount,
					disbursedByUserId: applicant.id,
				})
				.returning()

			if (!credit)
				throw new Error('Seed Installments Bulk Queue: credit not created')

			const [scheduleEntry] = generatePaymentSchedule({
				loanPrincipal: Number(creditAmount),
				rate: Number(installmentsBulkQueueCompany.rate),
				totalPayments: 1,
				frequency: installmentsBulkQueueCompany.employeeSalaryFrequency,
				firstDiscountDate,
			})

			if (!scheduleEntry) {
				throw new Error('Seed Installments Bulk Queue: schedule entry missing')
			}

			await db.insert(creditPayments).values({
				creditId: credit.id,
				dueDate: scheduleEntry.dueDate,
				amount: scheduleEntry.amount,
				hrConfirmedAt: new Date(now.getTime() - (i + 1) * 60 * 60_000),
				hrConfirmedByUserId: hrAgent.id,
			})
		}

		return {
			companyId: company.id,
			expectedQueueRowCount: installmentsBulkApplicants.length,
			installmentConfirmedByUserName: installmentAgent.name ?? '',
		}
	}

export const cleanupInstallmentsBulkQueue = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allInstallmentsBulkQueueUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, installmentsBulkQueueCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Credit detail — mixed payment states (button visibility test)
// ──────────────────────────────────────────────────────────────────────────────

export type SeedCreditDetailPaymentStatesResult = {
	companyId: number
	creditId: number
}

export const seedCreditDetailPaymentStates =
	async (): Promise<SeedCreditDetailPaymentStatesResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditDetailStatesUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, creditDetailStatesCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditDetailStatesCompany.name,
					domain: creditDetailStatesCompany.domain,
					rate: creditDetailStatesCompany.rate,
					employeeSalaryFrequency:
						creditDetailStatesCompany.employeeSalaryFrequency,
					active: creditDetailStatesCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditDetailStatesUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed CreditDetailStates: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed CreditDetailStates: user ${email} not found`)
			return u
		}

		const hrAgent = findUser(creditDetailStatesHrAgent.email)
		const applicant = findUser(creditDetailStatesApplicant.email)

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 5 })
			.returning()
		if (!term) throw new Error('Seed CreditDetailStates: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering)
			throw new Error('Seed CreditDetailStates: offering not created')

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditDetailStatesUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture)
					throw new Error(
						`Seed CreditDetailStates: fixture not found for ${u.email}`,
					)
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

		// Static dates anchored to the frozen clock date used in E2E tests
		// (cy.clock(new Date('2023-01-05'))). This makes badge states and button
		// visibility deterministic regardless of when the test suite runs.
		//   confirmed past : Nov 30 2022  (2 months before frozen date)
		//   overdue        : Dec 31 2022  (1 month before frozen date, unconfirmed)
		//   upcoming period: Jan 31 2023  (last day of frozen month → getUpcomingDeductionDate result)
		//   future 1       : Feb 28 2023
		//   future 2       : Mar 31 2023
		const confirmedPastDate = new Date(Date.UTC(2022, 10, 30))
		const overdueDate = new Date(Date.UTC(2022, 11, 31))
		const upcomingDate = new Date(Date.UTC(2023, 0, 31))
		const future1Date = new Date(Date.UTC(2023, 1, 28))
		const future2Date = new Date(Date.UTC(2023, 2, 31))

		const [app] = await db
			.insert(applications)
			.values({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency: creditDetailStatesCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: upcomingDate,
			})
			.returning()
		if (!app)
			throw new Error('Seed CreditDetailStates: application not created')

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicant.id,
			}).map((entry, index) => ({
				applicationId: app.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [credit] = await db
			.insert(credits)
			.values({
				applicationId: app.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicant.id,
			})
			.returning()
		if (!credit) throw new Error('Seed CreditDetailStates: credit not created')

		// Payment 1: confirmed (past due, hrConfirmedAt set) → no button
		// Payment 2: overdue/delayed (past due, unconfirmed) → button
		// Payment 3: upcoming period (dueDate = nextDeductionDate, unconfirmed) → button
		// Payment 4: future beyond period → no button
		// Payment 5: further future → no button
		await db.insert(creditPayments).values([
			{
				creditId: credit.id,
				dueDate: confirmedPastDate,
				amount: '10250.00',
				hrConfirmedAt: new Date(confirmedPastDate.getTime() + 24 * 60 * 60_000),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: overdueDate,
				amount: '10250.00',
			},
			{
				creditId: credit.id,
				dueDate: upcomingDate,
				amount: '10250.00',
			},
			{
				creditId: credit.id,
				dueDate: future1Date,
				amount: '10250.00',
			},
			{
				creditId: credit.id,
				dueDate: future2Date,
				amount: '10250.00',
			},
		])

		return {
			companyId: company.id,
			creditId: credit.id,
		}
	}

export const cleanupCreditDetailPaymentStates = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditDetailStatesUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, creditDetailStatesCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

export type SeedCreditDetailInstallmentScheduleResult = {
	companyId: number
	creditId: number
}

export const seedCreditDetailInstallmentSchedule =
	async (): Promise<SeedCreditDetailInstallmentScheduleResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditDetailInstallmentScheduleUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(
				eq(companies.domain, creditDetailInstallmentScheduleCompany.domain),
			)

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditDetailInstallmentScheduleCompany.name,
					domain: creditDetailInstallmentScheduleCompany.domain,
					rate: creditDetailInstallmentScheduleCompany.rate,
					employeeSalaryFrequency:
						creditDetailInstallmentScheduleCompany.employeeSalaryFrequency,
					active: creditDetailInstallmentScheduleCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditDetailInstallmentScheduleUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: company not created',
			)

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(
					`Seed CreditDetailInstallmentSchedule: user ${email} not found`,
				)
			return u
		}

		const hrAgent = findUser(creditDetailHrOnlyAgent.email)
		const installmentAgent = findUser(creditDetailInstallmentsAgent.email)
		const applicant = findUser(creditDetailInstallmentScheduleApplicant.email)

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 5 })
			.returning()
		if (!term)
			throw new Error('Seed CreditDetailInstallmentSchedule: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering)
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: offering not created',
			)

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditDetailInstallmentScheduleUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture)
					throw new Error(
						`Seed CreditDetailInstallmentSchedule: fixture not found for ${u.email}`,
					)
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

		const confirmedPastDate = new Date(Date.UTC(2022, 10, 30))
		const overdueDate = new Date(Date.UTC(2022, 11, 31))
		const upcomingDate = new Date(Date.UTC(2023, 0, 31))
		const future1Date = new Date(Date.UTC(2023, 1, 28))
		const future2Date = new Date(Date.UTC(2023, 2, 31))

		const [app] = await db
			.insert(applications)
			.values({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency:
					creditDetailInstallmentScheduleCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: upcomingDate,
			})
			.returning()
		if (!app)
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: application not created',
			)

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicant.id,
			}).map((entry, index) => ({
				applicationId: app.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [credit] = await db
			.insert(credits)
			.values({
				applicationId: app.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicant.id,
			})
			.returning()
		if (!credit)
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: credit not created',
			)

		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		await db.insert(creditPayments).values([
			{
				creditId: credit.id,
				dueDate: confirmedPastDate,
				amount: '10250.00',
				hrConfirmedAt: hrAt(confirmedPastDate),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(confirmedPastDate),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: overdueDate,
				amount: '10250.00',
				hrConfirmedAt: hrAt(overdueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: upcomingDate,
				amount: '10250.00',
				hrConfirmedAt: hrAt(upcomingDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: future1Date,
				amount: '10250.00',
				hrConfirmedAt: hrAt(future1Date),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: future2Date,
				amount: '10250.00',
				hrConfirmedAt: hrAt(future2Date),
				hrConfirmedByUserId: hrAgent.id,
			},
		])

		return {
			companyId: company.id,
			creditId: credit.id,
		}
	}

export const cleanupCreditDetailInstallmentSchedule = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditDetailInstallmentScheduleUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, creditDetailInstallmentScheduleCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}

export type SeedCreditFinalInstallmentSettlesResult = {
	companyId: number
	creditId: number
	lastScheduleRowIndex: number
}

export const seedCreditFinalInstallmentSettles =
	async (): Promise<SeedCreditFinalInstallmentSettlesResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditFinalInstallmentSettleUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, creditFinalInstallmentSettleCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditFinalInstallmentSettleCompany.name,
					domain: creditFinalInstallmentSettleCompany.domain,
					rate: creditFinalInstallmentSettleCompany.rate,
					employeeSalaryFrequency:
						creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
					active: creditFinalInstallmentSettleCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditFinalInstallmentSettleUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company) {
			throw new Error('Seed CreditFinalInstallmentSettles: company not created')
		}

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u) {
				throw new Error(
					`Seed CreditFinalInstallmentSettles: user ${email} not found`,
				)
			}
			return u
		}

		const hrAgent = findUser(creditFinalInstallmentSettleHrAgent.email)
		const installmentAgent = findUser(
			creditFinalInstallmentSettleInstallmentsAgent.email,
		)
		const applicant = findUser(creditFinalInstallmentSettleApplicant.email)

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 3 })
			.returning()
		if (!term) {
			throw new Error('Seed CreditFinalInstallmentSettles: term not created')
		}

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering) {
			throw new Error(
				'Seed CreditFinalInstallmentSettles: offering not created',
			)
		}

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditFinalInstallmentSettleUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture) {
					throw new Error(
						`Seed CreditFinalInstallmentSettles: fixture not found for ${u.email}`,
					)
				}
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

		// Use dates relative to seed time so the final payment stays in the *upcoming*
		// installments queue: SQL uses CURRENT_DATE, which ignores Playwright's clock.
		const dayMs = 86_400_000
		const todayUtc = Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate(),
		)
		const row0Date = new Date(todayUtc - 90 * dayMs)
		const row1Date = new Date(todayUtc - 60 * dayMs)
		// Last day of current UTC month: matches `getUpcomingDeductionDate('monthly', now)` so
		// the credit-detail confirm button is eligible, and `due_date >= CURRENT_DATE` keeps the
		// row in the upcoming installments queue (not overdue).
		const row2Date = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
		)

		const [app] = await db
			.insert(applications)
			.values({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency:
					creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: row2Date,
			})
			.returning()
		if (!app) {
			throw new Error(
				'Seed CreditFinalInstallmentSettles: application not created',
			)
		}

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicant.id,
			}).map((entry, index) => ({
				applicationId: app.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [credit] = await db
			.insert(credits)
			.values({
				applicationId: app.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicant.id,
			})
			.returning()
		if (!credit) {
			throw new Error('Seed CreditFinalInstallmentSettles: credit not created')
		}

		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		await db.insert(creditPayments).values([
			{
				creditId: credit.id,
				dueDate: row0Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row0Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row0Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: row1Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row1Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row1Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: row2Date,
				amount: '16666.66',
				hrConfirmedAt: hrAt(row2Date),
				hrConfirmedByUserId: hrAgent.id,
			},
		])

		return {
			companyId: company.id,
			creditId: credit.id,
			lastScheduleRowIndex: 2,
		}
	}

export type SeedInstallmentsQueueMixedSettlementAndPartialResult = {
	companyId: number
	creditSettlingId: number
	creditPartialId: number
}

/** One credit whose queue row is the last installment; one credit whose queue row is mid-schedule. */
export const seedInstallmentsQueueMixedSettlementAndPartial =
	async (): Promise<SeedInstallmentsQueueMixedSettlementAndPartialResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditFinalInstallmentSettleUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, creditFinalInstallmentSettleCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditFinalInstallmentSettleCompany.name,
					domain: creditFinalInstallmentSettleCompany.domain,
					rate: creditFinalInstallmentSettleCompany.rate,
					employeeSalaryFrequency:
						creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
					active: creditFinalInstallmentSettleCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditFinalInstallmentSettleUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company) {
			throw new Error('Seed InstallmentsQueueMixed: company not created')
		}

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u) {
				throw new Error(`Seed InstallmentsQueueMixed: user ${email} not found`)
			}
			return u
		}

		const hrAgent = findUser(creditFinalInstallmentSettleHrAgent.email)
		const installmentAgent = findUser(
			creditFinalInstallmentSettleInstallmentsAgent.email,
		)
		const applicantFinal = findUser(creditFinalInstallmentSettleApplicant.email)
		const applicantPartial = findUser(creditPartialScheduleApplicant.email)

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 3 })
			.returning()
		if (!term) {
			throw new Error('Seed InstallmentsQueueMixed: term not created')
		}

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering) {
			throw new Error('Seed InstallmentsQueueMixed: offering not created')
		}

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditFinalInstallmentSettleUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture) {
					throw new Error(
						`Seed InstallmentsQueueMixed: fixture not found for ${u.email}`,
					)
				}
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

		const dayMs = 86_400_000
		const todayUtc = Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate(),
		)
		const row0Date = new Date(todayUtc - 90 * dayMs)
		const row1Date = new Date(todayUtc - 60 * dayMs)
		const dueThisMonthEnd = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
		)
		const dueNextMonthEnd = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0),
		)

		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		const [appFinal] = await db
			.insert(applications)
			.values({
				applicantId: applicantFinal.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency:
					creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: dueThisMonthEnd,
			})
			.returning()
		if (!appFinal) {
			throw new Error(
				'Seed InstallmentsQueueMixed: final application not created',
			)
		}

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicantFinal.id,
			}).map((entry, index) => ({
				applicationId: appFinal.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (12 - index) * 60_000),
			})),
		)

		const [creditFinal] = await db
			.insert(credits)
			.values({
				applicationId: appFinal.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicantFinal.id,
			})
			.returning()
		if (!creditFinal) {
			throw new Error('Seed InstallmentsQueueMixed: final credit not created')
		}

		await db.insert(creditPayments).values([
			{
				creditId: creditFinal.id,
				dueDate: row0Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row0Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row0Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditFinal.id,
				dueDate: row1Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row1Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row1Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditFinal.id,
				dueDate: dueThisMonthEnd,
				amount: '16666.66',
				hrConfirmedAt: hrAt(dueThisMonthEnd),
				hrConfirmedByUserId: hrAgent.id,
			},
		])

		const [appPartial] = await db
			.insert(applications)
			.values({
				applicantId: applicantPartial.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency:
					creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: dueThisMonthEnd,
			})
			.returning()
		if (!appPartial) {
			throw new Error(
				'Seed InstallmentsQueueMixed: partial application not created',
			)
		}

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicantPartial.id,
			}).map((entry, index) => ({
				applicationId: appPartial.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [creditPartial] = await db
			.insert(credits)
			.values({
				applicationId: appPartial.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicantPartial.id,
			})
			.returning()
		if (!creditPartial) {
			throw new Error('Seed InstallmentsQueueMixed: partial credit not created')
		}

		await db.insert(creditPayments).values([
			{
				creditId: creditPartial.id,
				dueDate: row0Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row0Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row0Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditPartial.id,
				dueDate: dueThisMonthEnd,
				amount: '16666.67',
				hrConfirmedAt: hrAt(dueThisMonthEnd),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: creditPartial.id,
				dueDate: dueNextMonthEnd,
				amount: '16666.66',
			},
		])

		return {
			companyId: company.id,
			creditSettlingId: creditFinal.id,
			creditPartialId: creditPartial.id,
		}
	}

export const cleanupCreditFinalInstallmentSettles = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditFinalInstallmentSettleUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, creditFinalInstallmentSettleCompany.domain))
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
	return null
}
