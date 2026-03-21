'use server'

import { and, eq, gte, notInArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
	APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES,
	APPLICATION_DOCUMENT_MAX_BYTES,
} from '~/lib/application-document-intake'
import {
	canTransitionToApplicationStatus,
	INACTIVE_APPLICATION_STATUSES,
} from '~/lib/application-rules'
import { ValidationCode } from '~/lib/validation-codes'
import {
	createApplicationWithStatusHistory,
	updateApplicationWithStatusHistory,
} from '~/server/application-status-history'
import {
	cleanupApplicationWithUploadedBlobs,
	uploadAndInsertApplicationDocumentRow,
	validateRequiredInitialDocuments,
} from '~/server/applications/initial-intake-helpers'
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
}

export async function createApplicationWithInitialDocumentsAction(
	_prevState: ApplicationFormState,
	formData: FormData,
): Promise<ApplicationFormState> {
	const user = await getRequiredApplicantUser()
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Application')

	const email = user.email ?? ''
	const company = await getCompanyByEmailDomain(email)
	if (!company) {
		return { message: ValidationCode.CUENTA_APPLICATION_EMAIL_DOMAIN }
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
				eq(applications.companyId, company.id),
				eq(applications.salaryAtApplication, String(salary.toFixed(2))),
				eq(applications.salaryFrequency, applicationData.salaryFrequency),
				eq(applications.rfc, applicationData.rfc),
				eq(applications.payrollNumber, applicationData.payrollNumber),
				gte(applications.createdAt, sixtySecondsAgo),
			),
			columns: { id: true },
		})
		if (duplicate) {
			return { message: ValidationCode.CUENTA_APPLICATION_DUPLICATE_WAIT }
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
				message: ValidationCode.CUENTA_APPLICATION_EXISTING_ACTIVE,
			}
		}

		const validated = await validateRequiredInitialDocuments(formData)
		if ('errors' in validated) {
			return { errors: validated.errors }
		}

		const createdApplication = await createApplicationWithStatusHistory({
			values: {
				applicantId: user.id,
				companyId: company.id,
				termOfferingId: null,
				creditAmount: null,
				salaryAtApplication: String(salary.toFixed(2)),
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
				status: 'new',
				denialReason: null,
			},
			setByUserId: user.id,
		})

		const uploadedBlobKeys: string[] = []

		try {
			requireAbility(
				ability,
				'uploadDocument',
				subject('Application', {
					id: createdApplication.id,
					applicantId: createdApplication.applicantId,
					companyId: createdApplication.companyId,
				}),
			)

			for (const doc of validated.documents) {
				const { storedPathname } = await uploadAndInsertApplicationDocumentRow({
					applicationId: createdApplication.id,
					documentType: doc.documentType,
					file: doc.file,
					mime: doc.mime,
				})
				uploadedBlobKeys.push(storedPathname)
			}
		} catch (uploadError) {
			await cleanupApplicationWithUploadedBlobs({
				applicationId: createdApplication.id,
				uploadedBlobKeys,
			})
			return fromErrorToFormState(uploadError)
		}

		await sendApplicationSubmittedEvent(email, {
			creditAmountFormatted: PENDING_APPLICATION_SUMMARY,
			termLabel: PENDING_APPLICATION_SUMMARY,
		})

		revalidatePath('/cuenta/applications')
		revalidatePath('/cuenta/applications/new')
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/cuenta/applications')
}

export async function uploadApplicationDocumentAction(
	_prevState: UploadDocumentFormState,
	formData: FormData,
): Promise<UploadDocumentFormState> {
	const user = await getRequiredApplicantUser()
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

		await uploadAndInsertApplicationDocumentRow({
			applicationId: data.applicationId,
			documentType: data.documentType,
			file,
			mime: detected.mime,
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

			if (
				!remainingRejectedDocument &&
				canTransitionToApplicationStatus(app.status, 'pending')
			) {
				await updateApplicationWithStatusHistory({
					applicationId: data.applicationId,
					status: 'pending',
					setByUserId: user.id,
					denialReason: null,
				})
			}
		}

		revalidatePath('/cuenta/applications')
		revalidatePath(`/cuenta/applications/${data.applicationId}`)
		revalidatePath('/equipo/applications')
		revalidatePath(`/equipo/applications/${data.applicationId}`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	return { success: true }
}
