'use server'

import { and, eq, gte, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
	APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES,
	APPLICATION_DOCUMENT_MAX_BYTES,
} from '~/lib/application-document-intake'
import { Decimal } from '~/lib/decimal'
import { ValidationCode } from '~/lib/validation-codes'
import { uploadAndInsertApplicationDocumentRow } from '~/server/applications/initial-intake-helpers'
import {
	allRequiredInitialDocumentsPresent,
	getIntakeApplicationDraftForApplicant,
	getMissingRequiredInitialDocumentFieldErrors,
} from '~/server/applications/intake-draft'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { getRequiredApplicantUser } from '~/server/auth/session'
import { db } from '~/server/db'
import { applicationDocuments, applications } from '~/server/db/schema'
import { sendApplicationSubmittedEvent } from '~/server/email'
import { fromErrorToFormState } from '~/server/errors/errors'
import { detectAllowedMime } from '~/server/file-validation'
import { submitApplicationForAuthorizationReview } from '~/server/mutations'
import type { ApplicationDocumentForList } from '~/server/queries'
import {
	createApplicationSchema,
	uploadApplicationDocumentSchema,
} from '~/server/schemas'
import { deleteBlob, isBlobStorageKey } from '~/server/storage'

const APPLICATION_DOCUMENT_ALLOWED_TYPES = new Set<string>(
	APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES,
)
const PENDING_APPLICATION_SUMMARY = 'Por definir'

export type ApplicationFormState = {
	errors?: Record<string, string>
	message?: string
}

export type UploadDocumentFormState = {
	errors?: Record<string, string>
	message?: string
	success?: boolean
	uploadedDocument?: ApplicationDocumentForList
}

export type SubmitAuthorizationPackageFormState = {
	error?: string
	success?: boolean
}

export async function submitAuthorizationPackageAction(
	_prevState: SubmitAuthorizationPackageFormState,
	formData: FormData,
): Promise<SubmitAuthorizationPackageFormState> {
	const rawId = formData.get('applicationId')
	const applicationId =
		typeof rawId === 'string' ? Number.parseInt(rawId, 10) : Number.NaN
	if (!Number.isInteger(applicationId) || applicationId < 1) {
		return { error: ValidationCode.APPLICATION_INVALID }
	}
	const result = await submitApplicationForAuthorizationReview(applicationId)
	if (result.error) {
		return { error: result.error }
	}
	return { success: true }
}

export async function createApplicationWithInitialDocumentsAction(
	_prevState: ApplicationFormState,
	formData: FormData,
): Promise<ApplicationFormState> {
	const user = await getRequiredApplicantUser()
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Application')

	const rawApplicationId = formData.get('applicationId')
	const applicationId =
		typeof rawApplicationId === 'string'
			? Number.parseInt(rawApplicationId, 10)
			: Number.NaN
	if (!Number.isInteger(applicationId) || applicationId < 1) {
		return { message: ValidationCode.APPLICATION_INVALID }
	}

	const draft = await getIntakeApplicationDraftForApplicant(
		applicationId,
		user.id,
	)
	if (draft == null) {
		return { message: ValidationCode.CUENTA_APPLICATION_NOT_FOUND }
	}

	try {
		const applicationData = createApplicationSchema.parse({
			salaryAtApplication: formData.get('salaryAtApplication'),
			salaryFrequency: formData.get('salaryFrequency'),
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

		const salary = Number.parseFloat(
			String(applicationData.salaryAtApplication),
		)
		const sixtySecondsAgo = new Date(Date.now() - 60_000)

		const duplicate = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, user.id),
				eq(applications.companyId, draft.companyId),
				eq(applications.salaryAtApplication, new Decimal(salary).toFixed(2)),
				eq(applications.salaryFrequency, applicationData.salaryFrequency),
				eq(applications.rfc, applicationData.rfc),
				eq(applications.payrollNumber, applicationData.payrollNumber),
				gte(applications.createdAt, sixtySecondsAgo),
				ne(applications.id, applicationId),
			),
			columns: { id: true },
		})
		if (duplicate) {
			return { message: ValidationCode.CUENTA_APPLICATION_DUPLICATE_WAIT }
		}

		const documentErrors =
			await getMissingRequiredInitialDocumentFieldErrors(applicationId)
		if (!allRequiredInitialDocumentsPresent(documentErrors)) {
			return { errors: documentErrors }
		}

		await db
			.update(applications)
			.set({
				salaryAtApplication: new Decimal(salary).toFixed(2),
				salaryFrequency: applicationData.salaryFrequency,
				payrollNumber: applicationData.payrollNumber,
				rfc: applicationData.rfc,
				clabe: applicationData.clabe,
				streetAndNumber: applicationData.streetAndNumber,
				interiorNumber: applicationData.interiorNumber?.trim() || null,
				city: applicationData.city,
				state: applicationData.state,
				country: applicationData.country,
				postalCode: applicationData.postalCode,
				phoneNumber: applicationData.phoneNumber,
				updatedAt: new Date(),
			})
			.where(eq(applications.id, applicationId))

		const email = user.email ?? ''
		await sendApplicationSubmittedEvent(email, {
			creditAmountFormatted: PENDING_APPLICATION_SUMMARY,
			termLabel: PENDING_APPLICATION_SUMMARY,
		})

		revalidatePath('/cuenta/applications')
		revalidatePath('/cuenta/applications/new')
		revalidatePath(`/cuenta/applications/${applicationId}`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/cuenta/applications')
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
			errors: { file: ValidationCode.CUENTA_APPLICATION_FILE_REQUIRED },
		}
	}
	if (file.size > APPLICATION_DOCUMENT_MAX_BYTES) {
		return {
			errors: { file: ValidationCode.CUENTA_APPLICATION_FILE_MAX_SIZE },
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
			return { message: ValidationCode.CUENTA_APPLICATION_NOT_FOUND }
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

		const inserted = await uploadAndInsertApplicationDocumentRow({
			applicationId: data.applicationId,
			documentType: data.documentType,
			file,
			mime: detected.mime,
		})

		revalidatePath('/cuenta/applications')
		revalidatePath(`/cuenta/applications/${data.applicationId}`)
		revalidatePath('/cuenta/applications/new')
		revalidatePath(
			`/cuenta/applications/${data.applicationId}/pre-authorized`,
			'page',
		)
		revalidatePath('/equipo/applications')
		revalidatePath(`/equipo/applications/${data.applicationId}`)

		const uploadedDocument: ApplicationDocumentForList = {
			id: inserted.id,
			applicationId: data.applicationId,
			documentType: data.documentType,
			status: 'pending',
			fileName: inserted.fileName,
			url: `/api/application-documents/${inserted.id}/file`,
			hasBlobContent: isBlobStorageKey(inserted.storedPathname),
			createdAt: inserted.createdAt,
			rejectionReason: null,
		}

		return { success: true, uploadedDocument }
	} catch (error) {
		return fromErrorToFormState(error)
	}
}
