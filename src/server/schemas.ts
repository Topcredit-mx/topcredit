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

export const updateApplicationStatusSchema = z
	.object({
		status: z.enum(APPLICATION_STATUS_VALUES, {
			message: 'Estado no válido',
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
		{
			message:
				'El motivo es obligatorio al rechazar o marcar documentación inválida',
			path: ['reason'],
		},
	)

export type UpdateApplicationStatusInput = z.infer<
	typeof updateApplicationStatusSchema
>

const UPDATE_STATUS_ERROR_KEYS = [
	'applications-reason-required',
	'applications-error-generic',
] as const

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

/** Payload for updating a single application document status (e.g. approve). Plan 2 will extend with rejected + rejectionReason. */
export const updateApplicationDocumentStatusSchema = z.object({
	documentId: z.coerce.number().int().positive('Documento no válido'),
	status: z.literal('approved'),
})

export type UpdateApplicationDocumentStatusInput = z.infer<
	typeof updateApplicationDocumentStatusSchema
>

/** Parse and validate update-status payload. Single place for validation and error-key mapping. */
export function parseUpdateApplicationStatusPayload(
	payload: unknown,
):
	| { data: UpdateApplicationStatusInput }
	| { error: (typeof UPDATE_STATUS_ERROR_KEYS)[number] } {
	const parsed = updateApplicationStatusSchema.safeParse(payload)
	if (parsed.success) return { data: parsed.data }
	const first = parsed.error.issues[0]
	const isReasonRequired =
		first?.path?.length === 1 && first.path[0] === 'reason'
	return {
		error: isReasonRequired
			? 'applications-reason-required'
			: 'applications-error-generic',
	}
}
