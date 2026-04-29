import { NeonDbError } from '@neondatabase/serverless'
import { ZodError } from 'zod'
import { ValidationCode } from '~/lib/validation-codes'

function isObjectWithCause(value: unknown): value is { cause: unknown } {
	return typeof value === 'object' && value !== null && 'cause' in value
}

export function getNeonDbCause(error: unknown): NeonDbError | undefined {
	if (error instanceof NeonDbError) {
		return error
	}
	if (isObjectWithCause(error)) {
		const c = error.cause
		if (c instanceof NeonDbError) {
			return c
		}
	}
	return undefined
}

export function fromErrorToFormState(error: unknown): {
	errors?: Record<string, string>
	message?: string
} {
	if (error instanceof ZodError) {
		if (error.issues && error.issues.length > 0) {
			const fieldErrors: Record<string, string> = {}
			for (const issue of error.issues) {
				const fieldName = issue.path?.[0] as string | undefined
				if (fieldName) {
					if (!fieldErrors[fieldName]) {
						fieldErrors[fieldName] = issue.message
					}
				}
			}
			if (Object.keys(fieldErrors).length > 0) {
				return { errors: fieldErrors }
			}
			return { message: error.issues[0]?.message || 'Validation error' }
		}
		return { message: 'Validation error' }
	}

	const neon = getNeonDbCause(error)
	if (neon !== undefined) {
		switch (neon.code) {
			case '23505':
				if (neon.constraint?.includes('domain')) {
					return {
						errors: {
							domain: ValidationCode.COMPANY_DOMAIN_DUPLICATE,
						},
					}
				}
				if (neon.constraint?.includes('email')) {
					return {
						errors: {
							email: ValidationCode.AUTH_EMAIL_ALREADY_REGISTERED,
						},
					}
				}
				if (
					neon.constraint?.includes('term_offerings_company_id_term_id') ||
					neon.constraint?.includes('terms_duration_type_duration')
				) {
					return {
						message: ValidationCode.COMPANY_TERM_ALREADY_ASSIGNED,
					}
				}
				return {
					message: `Este ${neon.table || 'item'} ya existe. Debe ser único.`,
				}

			case '23514':
				return {
					message:
						'Los datos proporcionados no cumplen con las restricciones requeridas.',
				}

			case '23503':
				return {
					message:
						'No se puede realizar esta operación debido a referencias existentes.',
				}

			case '23502':
				return {
					message: 'Faltan campos requeridos.',
				}

			default:
				return { message: neon.message || 'Error de base de datos' }
		}
	}

	if (error instanceof Error) {
		return { message: error.message }
	}

	return {
		message: 'Ha ocurrido un error desconocido. Por favor intenta de nuevo.',
	}
}
