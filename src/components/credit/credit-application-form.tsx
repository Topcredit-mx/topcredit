'use client'

import { Building2, Calculator, DollarSign, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export function CreditApplicationForm() {
	const router = useRouter()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [formData, setFormData] = useState({
		requestedAmount: '',
		monthlyIncome: '',
		employerName: '',
		employeeId: '',
		employmentStartDate: '',
		applicationNotes: '',
	})

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)

		try {
			// TODO: Implement API call to submit credit application
			console.log('Submitting application:', formData)

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 2000))

			// Redirect to application status page after submission
			router.push('/application-status')
		} catch (error) {
			console.error('Error submitting application:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const formatCurrency = (value: string) => {
		const number = parseFloat(value.replace(/[^0-9.]/g, ''))
		if (Number.isNaN(number)) return ''
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN',
			minimumFractionDigits: 0,
		}).format(number)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			{/* Progress Indicator */}
			<div className="mb-8">
				<div className="flex items-center justify-between font-medium text-gray-500 text-sm">
					<span className="text-blue-600">Paso 1</span>
					<span>Información Básica</span>
					<span>Paso 2</span>
				</div>
				<div className="mt-2 h-2 rounded-full bg-gray-200">
					<div
						className="h-2 rounded-full bg-blue-600"
						style={{ width: '50%' }}
					></div>
				</div>
			</div>

			{/* Loan Amount Section */}
			<Card className="p-6">
				<div className="mb-4 flex items-center">
					<DollarSign className="mr-3 h-6 w-6 text-blue-600" />
					<h2 className="font-semibold text-gray-900 text-xl">
						Monto Solicitado
					</h2>
				</div>

				<div className="space-y-4">
					<div>
						<Label htmlFor="requestedAmount">¿Cuánto necesitas?</Label>
						<Input
							name="requestedAmount"
							type="text"
							placeholder="$50,000"
							value={formData.requestedAmount}
							onChange={(e) =>
								handleInputChange('requestedAmount', e.target.value)
							}
							onBlur={(e) => {
								const formatted = formatCurrency(e.target.value)
								handleInputChange('requestedAmount', formatted)
							}}
							className="font-medium text-lg"
							required
						/>
						<p className="mt-1 text-gray-500 text-sm">
							Monto mínimo: $10,000 • Monto máximo: $500,000
						</p>
					</div>

					{/* Quick Amount Buttons */}
					<div className="grid grid-cols-3 gap-3">
						{['$50,000', '$100,000', '$200,000'].map((amount) => (
							<Button
								key={amount}
								type="button"
								variant="outline"
								onClick={() => handleInputChange('requestedAmount', amount)}
								className="h-12"
							>
								{amount}
							</Button>
						))}
					</div>
				</div>
			</Card>

			{/* Employment Information */}
			<Card className="p-6">
				<div className="mb-4 flex items-center">
					<Building2 className="mr-3 h-6 w-6 text-blue-600" />
					<h2 className="font-semibold text-gray-900 text-xl">
						Información Laboral
					</h2>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="employerName">Empresa donde trabajas</Label>
						<Input
							name="employerName"
							type="text"
							placeholder="Soriana, OXXO, Bimbo, etc."
							value={formData.employerName}
							onChange={(e) =>
								handleInputChange('employerName', e.target.value)
							}
							required
						/>
					</div>

					<div>
						<Label htmlFor="employeeId">Número de empleado</Label>
						<Input
							name="employeeId"
							type="text"
							placeholder="Tu número de empleado"
							value={formData.employeeId}
							onChange={(e) => handleInputChange('employeeId', e.target.value)}
							required
						/>
					</div>

					<div>
						<Label htmlFor="monthlyIncome">Ingreso mensual</Label>
						<Input
							name="monthlyIncome"
							type="text"
							placeholder="$25,000"
							value={formData.monthlyIncome}
							onChange={(e) =>
								handleInputChange('monthlyIncome', e.target.value)
							}
							onBlur={(e) => {
								const formatted = formatCurrency(e.target.value)
								handleInputChange('monthlyIncome', formatted)
							}}
							required
						/>
					</div>

					<div>
						<Label htmlFor="employmentStartDate">Fecha de ingreso</Label>
						<Input
							name="employmentStartDate"
							type="date"
							value={formData.employmentStartDate}
							onChange={(e) =>
								handleInputChange('employmentStartDate', e.target.value)
							}
							required
						/>
					</div>
				</div>
			</Card>

			{/* Application Notes */}
			<Card className="p-6">
				<div className="mb-4 flex items-center">
					<FileText className="mr-3 h-6 w-6 text-blue-600" />
					<h2 className="font-semibold text-gray-900 text-xl">
						Información Adicional
					</h2>
				</div>

				<div>
					<Label htmlFor="applicationNotes">
						¿Para qué necesitas el crédito? (Opcional)
					</Label>
					<textarea
						name="applicationNotes"
						rows={4}
						className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						placeholder="Ej: Gastos médicos, educación, mejoras del hogar, etc."
						value={formData.applicationNotes}
						onChange={(e) =>
							handleInputChange('applicationNotes', e.target.value)
						}
					/>
				</div>
			</Card>

			{/* Estimated Terms Preview */}
			<Card className="border-blue-200 bg-blue-50 p-6">
				<div className="mb-4 flex items-center">
					<Calculator className="mr-3 h-6 w-6 text-blue-600" />
					<h2 className="font-semibold text-gray-900 text-xl">
						Estimación Preliminar
					</h2>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div className="text-center">
						<div className="font-bold text-2xl text-blue-600">12.5%</div>
						<div className="text-gray-600 text-sm">
							Tasa de interés estimada
						</div>
					</div>
					<div className="text-center">
						<div className="font-bold text-2xl text-blue-600">24 meses</div>
						<div className="text-gray-600 text-sm">Plazo recomendado</div>
					</div>
					<div className="text-center">
						<div className="font-bold text-2xl text-blue-600">~$2,500</div>
						<div className="text-gray-600 text-sm">Pago mensual aprox.</div>
					</div>
				</div>

				<p className="mt-4 text-center text-gray-500 text-xs">
					*Esta es una estimación preliminar. Los términos finales se
					determinarán después de la revisión de tu solicitud.
				</p>
			</Card>

			{/* Submit Button */}
			<div className="flex justify-end space-x-4">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push('/dashboard')}
				>
					Cancelar
				</Button>

				<Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
					{isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
				</Button>
			</div>
		</form>
	)
}
