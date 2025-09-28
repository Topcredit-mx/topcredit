import { Calculator, CreditCard, PiggyBank, TrendingUp } from 'lucide-react'

const benefits = [
	{
		icon: Calculator,
		title: 'Tasas Preferenciales',
		description:
			'Obtén las mejores tasas del mercado gracias a tu estabilidad laboral y relación con empresas afiliadas.',
		highlight: 'Desde 12% anual',
	},
	{
		icon: CreditCard,
		title: 'Proceso Digital',
		description:
			'Sin papeleo, sin filas, sin complicaciones. Todo desde tu celular o computadora.',
		highlight: '100% en línea',
	},
	{
		icon: TrendingUp,
		title: 'Aprobación Rápida',
		description:
			'Respuesta inmediata gracias a nuestra tecnología y tu historial como empleado.',
		highlight: 'En minutos',
	},
	{
		icon: PiggyBank,
		title: 'Montos Competitivos',
		description:
			'Accede a montos importantes basados en tu capacidad de pago y estabilidad laboral.',
		highlight: 'Hasta $500,000',
	},
]

export function BenefitsSection() {
	return (
		<section className="bg-white py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="font-bold text-3xl text-gray-900 tracking-tight sm:text-4xl">
						¿Por qué elegir TopCredit?
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-gray-600 text-lg">
						Diseñado específicamente para empleados de empresas afiliadas, con
						condiciones preferenciales y un proceso simplificado.
					</p>
				</div>

				<div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{benefits.map((benefit) => (
						<div key={benefit.title} className="group relative">
							<div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center transition-all duration-300 hover:shadow-blue-100 hover:shadow-lg">
								<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200">
									<benefit.icon className="h-6 w-6" />
								</div>

								<h3 className="mb-2 font-semibold text-gray-900 text-lg">
									{benefit.title}
								</h3>

								<p className="mb-4 text-gray-600 text-sm leading-relaxed">
									{benefit.description}
								</p>

								<div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800 text-xs">
									{benefit.highlight}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
