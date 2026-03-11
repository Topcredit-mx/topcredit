import { NeonDbError } from '@neondatabase/serverless'
import { ZodError } from 'zod'
import { ValidationCode } from '~/lib/validation-codes'

/**
 * Converts various error types to a form-friendly state object.
 * Used with useActionState to display errors in forms.
 *
 * @param error - The error to convert (ZodError, NeonDbError, Error, or unknown)
 * @returns An object with errors (field-specific) and/or message (general) properties
 */
export function fromErrorToFormState(error: unknown): {
	errors?: Record<string, string>
	message?: string
} {
	// Handle Zod validation errors
	if (error instanceof ZodError) {
		// Zod v4 uses .issues instead of .errors
		if (error.issues && error.issues.length > 0) {
			// Map Zod issues to field-specific errors
			// Zod issues have a path array (e.g., ['name'], ['domain'], ['rate'])
			const fieldErrors: Record<string, string> = {}
			for (const issue of error.issues) {
				// Get the field name from the path (first element)
				const fieldName = issue.path?.[0] as string | undefined
				if (fieldName) {
					// Use the first error message for each field
					if (!fieldErrors[fieldName]) {
						fieldErrors[fieldName] = issue.message
					}
				}
			}
			// Return field-specific errors if we have any
			if (Object.keys(fieldErrors).length > 0) {
				return { errors: fieldErrors }
			}
			// Fallback to general message if no field paths found
			return { message: error.issues[0]?.message || 'Validation error' }
		}
		return { message: 'Validation error' }
	}

	// Handle Neon database errors
	if (error instanceof NeonDbError) {
		switch (error.code) {
			case '23505': // Unique constraint violation
				// Map specific constraint violations to user-friendly messages
				if (error.constraint?.includes('domain')) {
					return {
						errors: {
							domain: ValidationCode.COMPANY_DOMAIN_DUPLICATE,
						},
					}
				}
				if (error.constraint?.includes('email')) {
					return {
						errors: {
							email: 'Este correo electrónico ya está registrado.',
						},
					}
				}
				// Generic unique constraint message
				return {
					message: `Este ${error.table || 'item'} ya existe. Debe ser único.`,
				}

			case '23514': // Check constraint violation
				return {
					message:
						'Los datos proporcionados no cumplen con las restricciones requeridas.',
				}

			case '23503': // Foreign key constraint violation
				return {
					message:
						'No se puede realizar esta operación debido a referencias existentes.',
				}

			case '23502': // Not null constraint violation
				return {
					message: 'Faltan campos requeridos.',
				}

			default:
				// Return the database error message if available
				return { message: error.message || 'Error de base de datos' }
		}
	}

	// Handle generic Error instances
	if (error instanceof Error) {
		return { message: error.message }
	}

	// Fallback for unknown error types
	return {
		message: 'Ha ocurrido un error desconocido. Por favor intenta de nuevo.',
	}
}
