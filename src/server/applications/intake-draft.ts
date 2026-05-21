import { and, eq, isNull, notInArray } from 'drizzle-orm'
import {
	getRequiredInitialDocumentFieldName,
	INITIAL_APPLICATION_DOCUMENT_TYPES,
	REQUIRED_INITIAL_APPLICATION_DOCUMENTS,
	type RequiredInitialDocumentFieldName,
} from '~/lib/application-document-intake'
import { INACTIVE_APPLICATION_STATUSES } from '~/lib/application-rules'
import { ValidationCode } from '~/lib/validation-codes'
import { createApplicationWithStatusHistory } from '~/server/application-status-history'
import { db } from '~/server/db'
import { applicationDocuments, applications } from '~/server/db/schema'

const INTAKE_DRAFT_SALARY_PLACEHOLDER = '1.00'

export async function findIntakeApplicationDraft(applicantId: number) {
	return db.query.applications.findFirst({
		where: and(
			eq(applications.applicantId, applicantId),
			eq(applications.status, 'pending'),
			isNull(applications.creditAmount),
			isNull(applications.termOfferingId),
		),
		columns: { id: true },
	})
}

export async function getOrCreateIntakeApplicationDraft(params: {
	applicantId: number
	companyId: number
	setByUserId: number
}) {
	const existing = await findIntakeApplicationDraft(params.applicantId)
	if (existing) {
		return existing
	}

	const blocking = await db.query.applications.findFirst({
		where: and(
			eq(applications.applicantId, params.applicantId),
			notInArray(applications.status, [...INACTIVE_APPLICATION_STATUSES]),
		),
		columns: { id: true },
	})

	if (blocking != null) {
		return null
	}

	const created = await createApplicationWithStatusHistory({
		values: {
			applicantId: params.applicantId,
			companyId: params.companyId,
			termOfferingId: null,
			creditAmount: null,
			salaryAtApplication: INTAKE_DRAFT_SALARY_PLACEHOLDER,
			salaryFrequency: 'monthly',
			payrollNumber: null,
			rfc: null,
			clabe: null,
			streetAndNumber: null,
			interiorNumber: null,
			city: null,
			state: null,
			country: null,
			postalCode: null,
			phoneNumber: null,
			status: 'pending',
			denialReason: null,
		},
		setByUserId: params.setByUserId,
	})

	return { id: created.id }
}

export async function getIntakeApplicationDraftForApplicant(
	applicationId: number,
	applicantId: number,
) {
	return db.query.applications.findFirst({
		where: and(
			eq(applications.id, applicationId),
			eq(applications.applicantId, applicantId),
			eq(applications.status, 'pending'),
			isNull(applications.creditAmount),
			isNull(applications.termOfferingId),
		),
		columns: { id: true, companyId: true, applicantId: true },
	})
}

export async function getMissingRequiredInitialDocumentFieldErrors(
	applicationId: number,
): Promise<Partial<Record<RequiredInitialDocumentFieldName, string>>> {
	const rows = await db
		.select({ documentType: applicationDocuments.documentType })
		.from(applicationDocuments)
		.where(eq(applicationDocuments.applicationId, applicationId))

	const uploadedTypes = new Set(rows.map((row) => row.documentType))
	const errors: Partial<Record<RequiredInitialDocumentFieldName, string>> = {}

	for (const documentType of INITIAL_APPLICATION_DOCUMENT_TYPES) {
		if (uploadedTypes.has(documentType)) {
			continue
		}
		const fieldName = getRequiredInitialDocumentFieldName(documentType)
		errors[fieldName] = ValidationCode.CUENTA_APPLICATION_FILE_REQUIRED
	}

	return errors
}

export function allRequiredInitialDocumentsPresent(
	errors: Partial<Record<RequiredInitialDocumentFieldName, string>>,
): boolean {
	return REQUIRED_INITIAL_APPLICATION_DOCUMENTS.every(
		({ fieldName }) => errors[fieldName] == null,
	)
}
