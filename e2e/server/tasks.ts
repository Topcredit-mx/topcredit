import { execSync } from 'node:child_process'
import { webcrypto } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { and, desc, eq } from 'drizzle-orm'
import { EncryptJWT } from 'jose'
import type { SeedPreAuthorizedPackageVariant } from '~/e2e/fixtures/pre-authorized-package'
import { sanitizeApplicationDocumentFileName } from '~/lib/application-document-intake'
import { COMPANY_TEMPLATE_KIND_VALUES } from '~/lib/company-templates'
import type { Role } from '~/server/auth/session'
import type { DocumentType } from '~/server/db/schema'
import {
	applicationDocuments,
	applications,
	companies,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import { deleteOrphanTermsWithoutOfferings } from '~/server/delete-orphan-terms'
import { COMPANY_DOCUMENT_TEMPLATES_PREFIX, uploadBlob } from '~/server/storage'
import { getDb } from './e2e-db'

export type SeedPreAuthorizedPackageDocumentsTaskParams = {
	applicationId: number
	variant: SeedPreAuthorizedPackageVariant
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

	const subtle = webcrypto.subtle
	const encoder = new TextEncoder()
	const keyMaterial = await subtle.importKey(
		'raw',
		encoder.encode(secret),
		'HKDF',
		false,
		['deriveBits'],
	)

	const derivedBits = await subtle.deriveBits(
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
		jti: webcrypto.randomUUID(),
	})
		.setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
		.encrypt(encryptionKey)

	return token
}

export const nukeMigrateDb = async () => {
	execSync('pnpm db:nuke:migrate', {
		cwd: process.cwd(),
		stdio: 'pipe',
		env: process.env,
	})
	return null
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
				authorizationTemplateStorageKey: null,
				authorizationTemplateFileName: null,
				contractTemplateStorageKey: null,
				contractTemplateFileName: null,
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
	await deleteOrphanTermsWithoutOfferings()

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

export type SeedCompanyDocumentTemplatesTaskParams = {
	domain: string
}

export const seedCompanyDocumentTemplates = async (
	params: SeedCompanyDocumentTemplatesTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const company = await db.query.companies.findFirst({
		where: eq(companies.domain, params.domain),
	})
	if (!company) {
		throw new Error(`Company with domain ${params.domain} not found`)
	}

	const rawFileName = 'sample-document.webp'
	const storedFileName = sanitizeApplicationDocumentFileName(rawFileName)
	const bytes = await readFile(join(process.cwd(), 'e2e/fixtures', rawFileName))

	let authorizationTemplateStorageKey: string | undefined
	let authorizationTemplateFileName: string | undefined
	let contractTemplateStorageKey: string | undefined
	let contractTemplateFileName: string | undefined

	for (const kind of COMPANY_TEMPLATE_KIND_VALUES) {
		const pathname = `${COMPANY_DOCUMENT_TEMPLATES_PREFIX}${company.id}/${kind}/${storedFileName}`
		const { pathname: storedPathname } = await uploadBlob(pathname, bytes, {
			contentType: 'image/webp',
		})

		if (kind === 'authorization') {
			authorizationTemplateStorageKey = storedPathname
			authorizationTemplateFileName = storedFileName
		} else {
			contractTemplateStorageKey = storedPathname
			contractTemplateFileName = storedFileName
		}
	}

	if (
		authorizationTemplateStorageKey === undefined ||
		authorizationTemplateFileName === undefined ||
		contractTemplateStorageKey === undefined ||
		contractTemplateFileName === undefined
	) {
		throw new Error('seedCompanyDocumentTemplates: missing template fields')
	}

	await db
		.update(companies)
		.set({
			authorizationTemplateStorageKey,
			authorizationTemplateFileName,
			contractTemplateStorageKey,
			contractTemplateFileName,
			updatedAt: new Date(),
		})
		.where(eq(companies.id, company.id))

	return null
}

export * from './seeds/index'
