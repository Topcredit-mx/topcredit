import { z } from 'zod'

import { statusRequiresReason } from '~/lib/application-rules'
import {
	APPLICATION_STATUS_VALUES,
	DOCUMENT_STATUS_VALUES,
	DOCUMENT_TYPE_VALUES,
} from '~/server/db/schema'

const domainRegex =
	/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

const nameSchema = z
	.string()
	.min(1, 'company-name-required')
	.max(100, 'company-name-max')

const domainSchema = z
	.string()
	.min(1, 'company-domain-required')
	.regex(domainRegex, 'company-domain-format')

const rateSchema = z
	.string()
	.min(1, 'company-rate-required')
	.transform((val) => {
		const num = Number.parseFloat(val)
		if (Number.isNaN(num)) throw new Error('company-rate-number')
		return num
	})
	.pipe(z.number().positive('company-rate-positive'))

const borrowingCapacityRateSchema = z.coerce
	.number()
	.min(0, 'company-borrowing-capacity-min')
	.max(100, 'company-borrowing-capacity-max')
	.optional()
	.nullable()

const employeeSalaryFrequencySchema = z.enum(['monthly', 'bi-monthly'], {
	message: 'company-frequency',
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
	.min(1, 'application-value-required')
	.refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
		message: 'application-value-positive',
	})

// ---- Application (solicitud) ----

export const createApplicationSchema = z.object({
	termOfferingId: z.coerce.number().int().positive('application-term-required'),
	creditAmount: positiveNumericString,
	salaryAtApplication: positiveNumericString,
})

/** Payload for updating application status (status + optional reason when required). */
export const updateApplicationStatusSchema = z
	.object({
		status: z.enum(APPLICATION_STATUS_VALUES, {
			message: 'applications-error-generic',
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
		{ message: 'applications-reason-required', path: ['reason'] },
	)

export type UpdateApplicationStatusInput = z.infer<
	typeof updateApplicationStatusSchema
>

export const documentTypeSchema = z.enum(DOCUMENT_TYPE_VALUES, {
	message: 'document-type-invalid',
})
export const documentStatusSchema = z.enum(DOCUMENT_STATUS_VALUES, {
	message: 'document-status-invalid',
})

export const uploadApplicationDocumentSchema = z.object({
	applicationId: z.coerce.number().int().positive('application-invalid'),
	documentType: documentTypeSchema,
})

/** Payload for approving a document (form: documentId). */
export const approveApplicationDocumentSchema = z.object({
	documentId: z.coerce.number().int().positive('applications-document-invalid'),
})

/** Payload for rejecting a document (form: documentId + rejectionReason). */
export const rejectApplicationDocumentSchema = z.object({
	documentId: z.coerce.number().int().positive('applications-document-invalid'),
	rejectionReason: z
		.string()
		.min(1, 'applications-document-rejection-reason-required'),
})
