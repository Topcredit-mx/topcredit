'use server'

import { and, eq, gte, notInArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { INACTIVE_APPLICATION_STATUSES } from '~/lib/application-rules'
import { ValidationCode } from '~/lib/validation-codes'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { getRequiredApplicantUser } from '~/server/auth/session'
import { db } from '~/server/db'
import { applicationDocuments, applications } from '~/server/db/schema'
import { sendApplicationSubmittedEvent } from '~/server/email'
import { fromErrorToFormState } from '~/server/errors/errors'
import { detectAllowedMime } from '~/server/file-validation'
import { getCompanyByEmailDomain } from '~/server/queries'
import {
	createApplicationSchema,
	uploadApplicationDocumentSchema,
} from '~/server/schemas'
import {
	APPLICATION_DOCUMENTS_PREFIX,
	deleteBlob,
	isBlobStorageKey,
	uploadBlob,
} from '~/server/storage'

const APPLICATION_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024 // 15 MB
const APPLICATION_DOCUMENT_ALLOWED_TYPES = new Set<string>([
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp',
])
const APPLICATION_DOCUMENT_FILE_NAME_MAX_LENGTH = 255
const PENDING_APPLICATION_SUMMARY = 'Por definir'

export type ApplicationFormState = {
	errors?: Record<string, string>
	message?: string
}

export type UploadDocumentFormState = {
	errors?: Record<string, string>
	message?: string
	success?: boolean
}

export async function createApplicationAction(
	_prevState: ApplicationFormState,
	formData: FormData,
): Promise<ApplicationFormState> {
	const user = await getRequiredApplicantUser()
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Application')

	const email = user.email ?? ''
	const company = await getCompanyByEmailDomain(email)
	if (!company) {
		return { message: ValidationCode.DASHBOARD_APPLICATION_EMAIL_DOMAIN }
	}

	try {
		const data = createApplicationSchema.parse({
			salaryAtApplication: formData.get('salaryAtApplication'),
			payrollNumber: formData.get('payrollNumber'),
			rfc: formData.get('rfc'),
			clabe: formData.get('clabe'),
			streetAndNumber: formData.get('streetAndNumber'),
			interiorNumber: formData.get('interiorNumber'),
			city: formData.get('city'),
			state: formData.get('state'),
			country: formData.get('country'),
			postalCode: formData.get('postalCode'),
			phoneNumber: formData.get('phoneNumber'),
		})

		const salary = Number.parseFloat(String(data.salaryAtApplication))

		const sixtySecondsAgo = new Date(Date.now() - 60_000)
		const duplicate = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, user.id),
				eq(applications.companyId, company.id),
				eq(applications.salaryAtApplication, String(salary.toFixed(2))),
				eq(applications.rfc, data.rfc),
				eq(applications.payrollNumber, data.payrollNumber),
				gte(applications.createdAt, sixtySecondsAgo),
			),
			columns: { id: true },
		})
		if (duplicate) {
			return { message: ValidationCode.DASHBOARD_APPLICATION_DUPLICATE_WAIT }
		}

		const existingActive = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, user.id),
				notInArray(applications.status, [...INACTIVE_APPLICATION_STATUSES]),
			),
			columns: { id: true },
		})
		if (existingActive) {
			return {
				message: ValidationCode.DASHBOARD_APPLICATION_EXISTING_ACTIVE,
			}
		}

		await db.insert(applications).values({
			applicantId: user.id,
			companyId: company.id,
			termOfferingId: null,
			creditAmount: null,
			salaryAtApplication: String(salary.toFixed(2)),
			payrollNumber: data.payrollNumber,
			rfc: data.rfc,
			clabe: data.clabe,
			streetAndNumber: data.streetAndNumber,
			interiorNumber: data.interiorNumber?.trim() || null,
			city: data.city,
			state: data.state,
			country: data.country,
			postalCode: data.postalCode,
			phoneNumber: data.phoneNumber,
			status: 'new',
		})

		await sendApplicationSubmittedEvent(email, {
			creditAmountFormatted: PENDING_APPLICATION_SUMMARY,
			termLabel: PENDING_APPLICATION_SUMMARY,
		})

		revalidatePath('/dashboard/applications')
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/dashboard/applications')
}

export async function uploadApplicationDocumentAction(
	_prevState: UploadDocumentFormState,
	formData: FormData,
): Promise<UploadDocumentFormState> {
	await getRequiredApplicantUser()
	const { ability } = await getAbility()

	const file = formData.get('file')
	if (!(file instanceof File) || file.size === 0) {
		return {
			errors: { file: ValidationCode.DASHBOARD_APPLICATION_FILE_REQUIRED },
		}
	}
	if (file.size > APPLICATION_DOCUMENT_MAX_BYTES) {
		return {
			errors: { file: ValidationCode.DASHBOARD_APPLICATION_FILE_MAX_SIZE },
		}
	}
	const detected = await detectAllowedMime(
		file,
		APPLICATION_DOCUMENT_ALLOWED_TYPES,
	)
	if ('error' in detected) {
		return { errors: { file: detected.error } }
	}

	try {
		const data = uploadApplicationDocumentSchema.parse({
			applicationId: formData.get('applicationId'),
			documentType: formData.get('documentType'),
		})

		const app = await db.query.applications.findFirst({
			where: (a, { eq }) => eq(a.id, data.applicationId),
			columns: {
				id: true,
				applicantId: true,
				companyId: true,
				status: true,
			},
		})

		if (!app) {
			return { message: ValidationCode.DASHBOARD_APPLICATION_NOT_FOUND }
		}

		requireAbility(
			ability,
			'uploadDocument',
			subject('Application', {
				id: app.id,
				applicantId: app.applicantId,
				companyId: app.companyId,
			}),
		)

		const existing = await db.query.applicationDocuments.findFirst({
			where: and(
				eq(applicationDocuments.applicationId, data.applicationId),
				eq(applicationDocuments.documentType, data.documentType),
			),
			columns: { id: true, storageKey: true },
		})

		if (existing) {
			if (isBlobStorageKey(existing.storageKey)) {
				await deleteBlob(existing.storageKey)
			}
			await db
				.delete(applicationDocuments)
				.where(eq(applicationDocuments.id, existing.id))
		}

		const rawName =
			file.name.replace(/\0/g, '').replace(/[/\\]/g, '_').trim() || 'document'
		const fileName = rawName.slice(0, APPLICATION_DOCUMENT_FILE_NAME_MAX_LENGTH)
		const pathname = `${APPLICATION_DOCUMENTS_PREFIX}${data.applicationId}/${data.documentType}/${fileName}`

		const { pathname: storedPathname } = await uploadBlob(pathname, file, {
			contentType: detected.mime,
		})

		await db.insert(applicationDocuments).values({
			applicationId: data.applicationId,
			documentType: data.documentType,
			status: 'pending',
			storageKey: storedPathname,
			fileName,
		})

		if (app.status === 'invalid-documentation') {
			const remainingRejectedDocument =
				await db.query.applicationDocuments.findFirst({
					where: and(
						eq(applicationDocuments.applicationId, data.applicationId),
						eq(applicationDocuments.status, 'rejected'),
					),
					columns: { id: true },
				})

			if (!remainingRejectedDocument) {
				await db
					.update(applications)
					.set({
						status: 'pending',
						updatedAt: new Date(),
					})
					.where(eq(applications.id, data.applicationId))
			}
		}

		revalidatePath('/dashboard/applications')
		revalidatePath(`/dashboard/applications/${data.applicationId}`)
		revalidatePath('/app/applications')
		revalidatePath(`/app/applications/${data.applicationId}`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	return { success: true }
}
