'use server'

import { and, eq, gte, notInArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { formatCurrencyMxn } from '~/lib/utils'
import { ValidationCode } from '~/lib/validation-codes'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { getRequiredApplicantUser } from '~/server/auth/session'
import { db } from '~/server/db'
import { applicationDocuments, applications } from '~/server/db/schema'
import { sendApplicationSubmittedEvent } from '~/server/email'
import { fromErrorToFormState } from '~/server/errors/errors'
import { detectAllowedMime } from '~/server/file-validation'
import {
	getCompanyByEmailDomain,
	getTermOfferingsForCompany,
} from '~/server/queries'
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

	const borrowingCapacityRate = company.borrowingCapacityRate
	if (!borrowingCapacityRate || Number(borrowingCapacityRate) <= 0) {
		return { message: ValidationCode.DASHBOARD_APPLICATION_COMPANY_NO_RATE }
	}

	const offerings = await getTermOfferingsForCompany(company.id)
	if (offerings.length === 0) {
		return { message: ValidationCode.DASHBOARD_APPLICATION_COMPANY_NO_TERMS }
	}

	try {
		const data = createApplicationSchema.parse({
			termOfferingId: formData.get('termOfferingId'),
			creditAmount: formData.get('creditAmount'),
			salaryAtApplication: formData.get('salaryAtApplication'),
		})

		const offering = offerings.find((o) => o.id === data.termOfferingId)
		if (!offering || offering.disabled) {
			return {
				errors: {
					termOfferingId:
						ValidationCode.DASHBOARD_APPLICATION_TERM_NOT_AVAILABLE,
				},
			}
		}

		const salary = Number.parseFloat(String(data.salaryAtApplication))
		const rate = Number.parseFloat(String(borrowingCapacityRate))
		const maxLoanAmount = salary * rate
		const amount = Number.parseFloat(String(data.creditAmount))
		if (amount > maxLoanAmount) {
			return {
				errors: {
					creditAmount: `El monto no puede superar el máximo permitido (${formatCurrencyMxn(maxLoanAmount)}).`,
				},
			}
		}

		const sixtySecondsAgo = new Date(Date.now() - 60_000)
		const duplicate = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, user.id),
				eq(applications.termOfferingId, data.termOfferingId),
				eq(applications.creditAmount, String(amount.toFixed(2))),
				eq(applications.salaryAtApplication, String(salary.toFixed(2))),
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
				notInArray(applications.status, ['authorized', 'denied']),
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
			termOfferingId: data.termOfferingId,
			creditAmount: String(amount.toFixed(2)),
			salaryAtApplication: String(salary.toFixed(2)),
			status: 'new',
		})

		const termLabel =
			offering.durationType === 'monthly'
				? `${offering.duration} meses`
				: `${offering.duration} quincenas`
		const creditAmountFormatted = formatCurrencyMxn(amount)
		await sendApplicationSubmittedEvent(email, {
			creditAmountFormatted,
			termLabel,
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
			columns: { id: true, applicantId: true, termOfferingId: true },
			with: {
				termOffering: { columns: { companyId: true } },
			},
		})

		if (!app?.termOffering) {
			return { message: ValidationCode.DASHBOARD_APPLICATION_NOT_FOUND }
		}

		requireAbility(
			ability,
			'uploadDocument',
			subject('Application', {
				id: app.id,
				applicantId: app.applicantId,
				companyId: app.termOffering.companyId,
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

		revalidatePath('/dashboard/applications')
		revalidatePath(`/dashboard/applications/${data.applicationId}`)
		revalidatePath('/app/applications')
		revalidatePath(`/app/applications/${data.applicationId}`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	return { success: true }
}
