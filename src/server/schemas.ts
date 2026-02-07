import { z } from 'zod'

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
