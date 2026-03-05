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
	.min(1, 'El nombre es requerido')
	.max(100, 'El nombre no puede exceder 100 caracteres')

const domainSchema = z
	.string()
	.min(1, 'El dominio es requerido')
	.regex(
		domainRegex,
		'El dominio debe tener un formato válido (ej: ejemplo.com)',
	)

const rateSchema = z
	.string()
	.min(1, 'La tasa es requerida')
	.transform((val) => {
		const num = Number.parseFloat(val)
		if (Number.isNaN(num)) throw new Error('La tasa debe ser un número')
		return num
	})
	.pipe(z.number().positive('La tasa debe ser un número positivo'))

const borrowingCapacityRateSchema = z.coerce
	.number()
	.min(0, 'La capacidad de préstamo debe ser mayor o igual a 0')
	.max(100, 'La capacidad de préstamo debe ser menor o igual a 100')
	.optional()
	.nullable()

const employeeSalaryFrequencySchema = z.enum(['monthly', 'bi-monthly'], {
	message: 'La frecuencia debe ser mensual o quincenal',
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
	.min(1, 'El valor es requerido')
	.refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
		message: 'Debe ser un número positivo',
	})

// ---- Application (solicitud) ----

export const createApplicationSchema = z.object({
	termOfferingId: z.coerce.number().int().positive('Selecciona un plazo'),
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
	message: 'Tipo de documento no válido',
})
export const documentStatusSchema = z.enum(DOCUMENT_STATUS_VALUES, {
	message: 'Estado de documento no válido',
})

export const uploadApplicationDocumentSchema = z.object({
	applicationId: z.coerce.number().int().positive('Solicitud no válida'),
	documentType: documentTypeSchema,
})

/** Payload for approving a document (form: documentId). */
export const approveApplicationDocumentSchema = z.object({
	documentId: z.coerce.number().int().positive('applications-document-invalid'),
})

/** Payload for rejecting a document (form: documentId + rejectionReason). */
export const rejectApplicationDocumentSchema = z.object({
	documentId: z.coerce.number().int().positive('applications-document-invalid'),
	rejectionReason: z.string().min(1, 'applications-document-rejection-reason-required'),
})

