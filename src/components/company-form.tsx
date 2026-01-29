'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	type CreateCompanyParams,
	createCompany,
	type UpdateCompanyParams,
	updateCompany,
} from '~/server/company/mutations'
import type { Company } from '~/server/company/queries'

interface CompanyFormProps {
	company?: Company
}

// Helper to format percentage without trailing zeros
function formatPercentage(value: string, decimals: number = 2): string {
	const num = Number.parseFloat(value) * 100
	// Format with specified decimals, then remove trailing zeros
	return num.toFixed(decimals).replace(/\.?0+$/, '')
}

export function CompanyForm({ company }: CompanyFormProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const [touched, setTouched] = useState<Record<string, boolean>>({})
	const nameId = useId()
	const domainId = useId()
	const rateId = useId()
	const borrowingCapacityRateId = useId()
	const employeeSalaryFrequencyId = useId()
	const activeId = useId()

	const [formData, setFormData] = useState({
		name: company?.name || '',
		domain: company?.domain || '',
		rate: company ? formatPercentage(company.rate, 2) : '',
		borrowingCapacityRate: company?.borrowingCapacityRate
			? formatPercentage(company.borrowingCapacityRate, 2)
			: '',
		employeeSalaryFrequency: company?.employeeSalaryFrequency || 'monthly',
		active: company?.active ?? true,
	})

	const validateField = (name: string, value: string) => {
		const errors: Record<string, string> = {}
		
		if (name === 'name' && !value.trim()) {
			errors.name = 'El nombre es requerido'
		}
		
		if (name === 'domain') {
			if (!value.trim()) {
				errors.domain = 'El dominio es requerido'
			} else if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(value)) {
				errors.domain = 'El dominio debe tener un formato válido (ej: ejemplo.com)'
			}
		}
		
		if (name === 'rate') {
			if (!value.trim()) {
				errors.rate = 'La tasa es requerida'
			} else {
				const numRate = Number.parseFloat(value)
				if (Number.isNaN(numRate) || numRate <= 0) {
					errors.rate = 'La tasa debe ser un número positivo'
				}
			}
		}
		
		if (name === 'borrowingCapacityRate' && value) {
			const numRate = Number.parseFloat(value)
			if (Number.isNaN(numRate) || numRate < 0 || numRate > 100) {
				errors.borrowingCapacityRate = 'Debe ser un valor entre 0 y 100%'
			}
		}
		
		setFieldErrors((prev) => ({ ...prev, ...errors }))
		return Object.keys(errors).length === 0
	}

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		e.stopPropagation()
		setError(null)
		setFieldErrors({})

		// Mark all fields as touched to show errors
		setTouched({
			name: true,
			domain: true,
			rate: true,
			borrowingCapacityRate: true,
		})

		// Validate all required fields
		const nameValid = validateField('name', formData.name)
		const domainValid = validateField('domain', formData.domain)
		const rateValid = validateField('rate', formData.rate)
		const borrowingValid = formData.borrowingCapacityRate
			? validateField('borrowingCapacityRate', formData.borrowingCapacityRate)
			: true

		if (!nameValid || !domainValid || !rateValid || !borrowingValid) {
			return
		}

		startTransition(async () => {
			// Convert percentage inputs back to decimals
			const rateDecimal = (Number.parseFloat(formData.rate) / 100).toFixed(4)
			const borrowingCapacityRateDecimal = formData.borrowingCapacityRate
				? (Number.parseFloat(formData.borrowingCapacityRate) / 100).toFixed(2)
				: null

			if (company) {
				// Update existing company
				const params: UpdateCompanyParams = {
					id: company.id,
					name: formData.name,
					domain: formData.domain,
					rate: rateDecimal,
					borrowingCapacityRate: borrowingCapacityRateDecimal,
					employeeSalaryFrequency: formData.employeeSalaryFrequency as
						'bi-monthly' | 'monthly',
					active: formData.active,
				}

				const result = await updateCompany(params)
				if (result.success) {
					router.push('/app/admin/companies')
					router.refresh()
				} else {
					setError(result.error || 'Error al actualizar la empresa')
				}
			} else {
				// Create new company
				const params: CreateCompanyParams = {
					name: formData.name,
					domain: formData.domain,
					rate: rateDecimal,
					borrowingCapacityRate: borrowingCapacityRateDecimal,
					employeeSalaryFrequency: formData.employeeSalaryFrequency as
						'bi-monthly' | 'monthly',
					active: formData.active,
				}

				const result = await createCompany(params)
				if (result.success) {
					router.push('/app/admin/companies')
					router.refresh()
				} else {
					setError(result.error || 'Error al crear la empresa')
				}
			}
		})
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6" noValidate>
			{error && (
				<div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
					{error}
				</div>
			)}

			<Field data-invalid={touched.name && !!fieldErrors.name}>
				<FieldLabel htmlFor={nameId}>
					Nombre <span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					id={nameId}
					name="name"
					placeholder="Ej: Acme Corporation"
					value={formData.name}
					onChange={(e) => {
						setFormData({ ...formData, name: e.target.value })
						if (touched.name) validateField('name', e.target.value)
					}}
					onBlur={() => {
						setTouched((prev) => ({ ...prev, name: true }))
						validateField('name', formData.name)
					}}
					aria-invalid={touched.name && !!fieldErrors.name}
					aria-required="true"
				/>
				{touched.name && fieldErrors.name && (
					<FieldError>{fieldErrors.name}</FieldError>
				)}
			</Field>

			<Field data-invalid={touched.domain && !!fieldErrors.domain}>
				<FieldLabel htmlFor={domainId}>
					Dominio <span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					id={domainId}
					name="domain"
					placeholder="ejemplo.com"
					value={formData.domain}
					onChange={(e) => {
						setFormData({ ...formData, domain: e.target.value })
						if (touched.domain) validateField('domain', e.target.value)
					}}
					onBlur={() => {
						setTouched((prev) => ({ ...prev, domain: true }))
						validateField('domain', formData.domain)
					}}
					disabled={!!company}
					aria-invalid={touched.domain && !!fieldErrors.domain}
					aria-required="true"
				/>
				<FieldDescription>
					{company
						? 'El dominio no puede ser modificado después de la creación'
						: 'Dominio de email de la empresa (debe ser único)'}
				</FieldDescription>
				{touched.domain && fieldErrors.domain && (
					<FieldError>{fieldErrors.domain}</FieldError>
				)}
			</Field>

			<Field data-invalid={touched.rate && !!fieldErrors.rate}>
				<FieldLabel htmlFor={rateId}>
					Tasa de Interés (%) <span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					id={rateId}
					name="rate"
					type="number"
					step="0.01"
					placeholder="2.50"
					value={formData.rate}
					onChange={(e) => {
						setFormData({ ...formData, rate: e.target.value })
						if (touched.rate) validateField('rate', e.target.value)
					}}
					onBlur={() => {
						setTouched((prev) => ({ ...prev, rate: true }))
						validateField('rate', formData.rate)
					}}
					aria-invalid={touched.rate && !!fieldErrors.rate}
					aria-required="true"
				/>
				<FieldDescription>
					Tasa de interés anual (ej: 2.50 para 2.5%)
				</FieldDescription>
				{touched.rate && fieldErrors.rate && (
					<FieldError>{fieldErrors.rate}</FieldError>
				)}
			</Field>

			<Field
				data-invalid={
					touched.borrowingCapacityRate && !!fieldErrors.borrowingCapacityRate
				}
			>
				<FieldLabel htmlFor={borrowingCapacityRateId}>
					Capacidad de Préstamo (%)
				</FieldLabel>
				<Input
					id={borrowingCapacityRateId}
					name="borrowingCapacityRate"
					type="number"
					step="1"
					placeholder="30"
					value={formData.borrowingCapacityRate}
					onChange={(e) => {
						setFormData({ ...formData, borrowingCapacityRate: e.target.value })
						if (touched.borrowingCapacityRate)
							validateField('borrowingCapacityRate', e.target.value)
					}}
					onBlur={() => {
						setTouched((prev) => ({ ...prev, borrowingCapacityRate: true }))
						if (formData.borrowingCapacityRate) {
							validateField('borrowingCapacityRate', formData.borrowingCapacityRate)
						}
					}}
					aria-invalid={
						touched.borrowingCapacityRate && !!fieldErrors.borrowingCapacityRate
					}
				/>
				<FieldDescription>
					Porcentaje del salario que puede usarse para capacidad de deuda
					(0-100%). Opcional.
				</FieldDescription>
				{touched.borrowingCapacityRate && fieldErrors.borrowingCapacityRate && (
					<FieldError>{fieldErrors.borrowingCapacityRate}</FieldError>
				)}
			</Field>

			<Field>
				<FieldLabel htmlFor={employeeSalaryFrequencyId}>
					Frecuencia de Pago <span className="text-destructive">*</span>
				</FieldLabel>
				<Select
					value={formData.employeeSalaryFrequency}
					onValueChange={(value: 'monthly' | 'bi-monthly') =>
						setFormData({ ...formData, employeeSalaryFrequency: value })
					}
				>
					<SelectTrigger
						id={employeeSalaryFrequencyId}
						name="employeeSalaryFrequency"
					>
						<SelectValue placeholder="Selecciona la frecuencia" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="monthly">Mensual</SelectItem>
						<SelectItem value="bi-monthly">Quincenal</SelectItem>
					</SelectContent>
				</Select>
			</Field>

			<div className="flex items-center space-x-2">
				<Checkbox
					id={activeId}
					name="active"
					checked={formData.active}
					onCheckedChange={(checked) =>
						setFormData({ ...formData, active: checked === true })
					}
				/>
				<Label htmlFor={activeId} className="cursor-pointer">
					Activa
				</Label>
			</div>
			<p className="text-muted-foreground text-sm">
				Las empresas inactivas no aparecerán en las listas por defecto
			</p>

			<div className="flex gap-4">
				<Button type="submit" disabled={isPending}>
					{isPending
						? 'Guardando...'
						: company
							? 'Guardar Cambios'
							: 'Crear Empresa'}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push('/app/admin/companies')}
					disabled={isPending}
				>
					Cancelar
				</Button>
			</div>
		</form>
	)
}
