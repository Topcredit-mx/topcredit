import { z } from 'zod'

import { statusRequiresReason } from '~/lib/application-rules'
import { ValidationCode } from '~/lib/validation-codes'
import {
	APPLICATION_STATUS_VALUES,
	DOCUMENT_STATUS_VALUES,
	DOCUMENT_TYPE_VALUES,
} from '~/server/db/schema'

const domainRegex =
	/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

const nameSchema = z
	.string()
	.min(1, ValidationCode.COMPANY_NAME_REQUIRED)
	.max(100, ValidationCode.COMPANY_NAME_MAX)

const domainSchema = z
	.string()
	.min(1, ValidationCode.COMPANY_DOMAIN_REQUIRED)
	.regex(domainRegex, ValidationCode.COMPANY_DOMAIN_FORMAT)

const rateSchema = z
	.string()
	.min(1, ValidationCode.COMPANY_RATE_REQUIRED)
	.transform((val) => {
		const num = Number.parseFloat(val)
		if (Number.isNaN(num)) throw new Error(ValidationCode.COMPANY_RATE_NUMBER)
		return num
	})
	.pipe(z.number().positive(ValidationCode.COMPANY_RATE_POSITIVE))

const borrowingCapacityRateSchema = z.coerce
	.number()
	.min(0, ValidationCode.COMPANY_BORROWING_CAPACITY_MIN)
	.max(100, ValidationCode.COMPANY_BORROWING_CAPACITY_MAX)
	.optional()
	.nullable()

const employeeSalaryFrequencySchema = z.enum(['monthly', 'bi-monthly'], {
	message: ValidationCode.COMPANY_FREQUENCY,
})

export const createCompanySchema = z.object({
	name: nameSchema,
	domain: domainSchema,
	rate: rateSchema,
	borrowingCapacityRate: borrowingCapacityRateSchema,
	employeeSalaryFrequency: employeeSalaryFrequencySchema,
	active: z.boolean().default(true),
})

export const updateCompanySchema = createCompanySchema
	.partial()
	.omit({ domain: true })

const positiveNumericString = z
	.string()
	.min(1, ValidationCode.APPLICATION_VALUE_REQUIRED)
	.refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
		message: ValidationCode.APPLICATION_VALUE_POSITIVE,
	})

// ---- Application (solicitud) ----

export const createApplicationSchema = z.object({
	termOfferingId: z.coerce
		.number()
		.int()
		.positive(ValidationCode.APPLICATION_TERM_REQUIRED),
	creditAmount: positiveNumericString,
	salaryAtApplication: positiveNumericString,
})

/** Payload for updating application status (status + optional reason when required). */
export const updateApplicationStatusSchema = z
	.object({
		status: z.enum(APPLICATION_STATUS_VALUES, {
			message: ValidationCode.APPLICATIONS_ERROR_GENERIC,
		}),
		reason: z.string().max(1000).optional(),
	})
	.refine(
		(data) => {
			if (statusRequiresReason(data.status)) {
				return (data.reason?.trim().length ?? 0) > 0
			}
			return true
		},
		{ message: ValidationCode.APPLICATIONS_REASON_REQUIRED, path: ['reason'] },
	)

export type UpdateApplicationStatusInput = z.infer<
	typeof updateApplicationStatusSchema
>

export const documentTypeSchema = z.enum(DOCUMENT_TYPE_VALUES, {
	message: ValidationCode.DOCUMENT_TYPE_INVALID,
})
export const documentStatusSchema = z.enum(DOCUMENT_STATUS_VALUES, {
	message: ValidationCode.DOCUMENT_STATUS_INVALID,
})

export const uploadApplicationDocumentSchema = z.object({
	applicationId: z.coerce
		.number()
		.int()
		.positive(ValidationCode.APPLICATION_INVALID),
	documentType: documentTypeSchema,
})

/** Payload for approving a document (form: documentId). */
export const approveApplicationDocumentSchema = z.object({
	documentId: z.coerce
		.number()
		.int()
		.positive(ValidationCode.APPLICATIONS_DOCUMENT_INVALID),
})

/** Payload for rejecting a document (form: documentId + rejectionReason). */
export const rejectApplicationDocumentSchema = z.object({
	documentId: z.coerce
		.number()
		.int()
		.positive(ValidationCode.APPLICATIONS_DOCUMENT_INVALID),
	rejectionReason: z
		.string()
		.min(1, ValidationCode.APPLICATIONS_DOCUMENT_REJECTION_REASON_REQUIRED),
})
