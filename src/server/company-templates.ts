import { eq } from 'drizzle-orm'
import type { CompanyTemplateKind } from '~/lib/company-templates'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { buildInlineDisposition } from '~/server/content-disposition'
import { db } from '~/server/db'
import { applications, companies } from '~/server/db/schema'
import { getBlob, isBlobStorageKey } from '~/server/storage'

export type CompanyTemplateStreamResult = {
	stream: ReadableStream<Uint8Array>
	contentType: string
	fileName: string
	disposition: string
}

function pickTemplateColumns(
	row: {
		authorizationTemplateStorageKey: string | null
		authorizationTemplateFileName: string | null
		contractTemplateStorageKey: string | null
		contractTemplateFileName: string | null
	},
	kind: CompanyTemplateKind,
): { storageKey: string | null; fileName: string | null } {
	switch (kind) {
		case 'authorization':
			return {
				storageKey: row.authorizationTemplateStorageKey,
				fileName: row.authorizationTemplateFileName,
			}
		case 'contract':
			return {
				storageKey: row.contractTemplateStorageKey,
				fileName: row.contractTemplateFileName,
			}
		default: {
			const _exhaustive: never = kind
			return _exhaustive
		}
	}
}

export async function getCompanyTemplateStreamForCompanyReader(params: {
	companyId: number
	kind: CompanyTemplateKind
}): Promise<CompanyTemplateStreamResult | null> {
	if (!Number.isInteger(params.companyId) || params.companyId < 1) return null

	const company = await db.query.companies.findFirst({
		where: eq(companies.id, params.companyId),
		columns: {
			id: true,
			authorizationTemplateStorageKey: true,
			authorizationTemplateFileName: true,
			contractTemplateStorageKey: true,
			contractTemplateFileName: true,
		},
	})

	if (!company) return null

	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: company.id }))

	const picked = pickTemplateColumns(company, params.kind)
	const storageKey = picked.storageKey
	const fileName = picked.fileName

	if (storageKey == null || fileName == null) return null
	if (!isBlobStorageKey(storageKey)) return null

	const result = await getBlob(storageKey)
	if (!result || result.statusCode !== 200) return null
	const stream = result.stream
	if (stream == null) return null

	return {
		stream,
		contentType: result.blob.contentType ?? 'application/octet-stream',
		fileName,
		disposition: buildInlineDisposition(fileName),
	}
}

export async function getCompanyTemplateStreamForApplicationReader(params: {
	applicationId: number
	kind: CompanyTemplateKind
}): Promise<CompanyTemplateStreamResult | null> {
	if (!Number.isInteger(params.applicationId) || params.applicationId < 1) {
		return null
	}

	const row = await db
		.select({
			applicationId: applications.id,
			applicantId: applications.applicantId,
			companyId: applications.companyId,
			authorizationTemplateStorageKey:
				companies.authorizationTemplateStorageKey,
			authorizationTemplateFileName: companies.authorizationTemplateFileName,
			contractTemplateStorageKey: companies.contractTemplateStorageKey,
			contractTemplateFileName: companies.contractTemplateFileName,
		})
		.from(applications)
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.where(eq(applications.id, params.applicationId))
		.limit(1)

	const first = row[0]
	if (!first) return null

	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Application', {
			id: first.applicationId,
			applicantId: first.applicantId,
			companyId: first.companyId,
		}),
	)

	const picked = pickTemplateColumns(
		{
			authorizationTemplateStorageKey: first.authorizationTemplateStorageKey,
			authorizationTemplateFileName: first.authorizationTemplateFileName,
			contractTemplateStorageKey: first.contractTemplateStorageKey,
			contractTemplateFileName: first.contractTemplateFileName,
		},
		params.kind,
	)

	const storageKey = picked.storageKey
	const fileName = picked.fileName

	if (storageKey == null || fileName == null) return null
	if (!isBlobStorageKey(storageKey)) return null

	const result = await getBlob(storageKey)
	if (!result || result.statusCode !== 200) return null
	const stream = result.stream
	if (stream == null) return null

	return {
		stream,
		contentType: result.blob.contentType ?? 'application/octet-stream',
		fileName,
		disposition: buildInlineDisposition(fileName),
	}
}
