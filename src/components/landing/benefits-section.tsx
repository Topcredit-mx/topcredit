import { Calculator, CreditCard, PiggyBank, TrendingUp } from 'lucide-react'

import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

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
		<section
			id="beneficios"
			className="border-slate-100 border-b bg-white py-16 sm:py-24"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="font-semibold text-3xl text-slate-900 tracking-tight sm:text-4xl">
						¿Por qué elegir TopCredit?
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
						Diseñado específicamente para empleados de empresas afiliadas, con
						condiciones preferenciales y un proceso simplificado.
					</p>
				</div>

				<div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{benefits.map((benefit) => (
						<div key={benefit.title} className="group relative">
							<div
								className={cn(
									shell.elevatedCard,
									'h-full p-8 text-center transition-shadow duration-300 hover:shadow-portfolio-row',
								)}
							>
								<div className={cn(shell.portfolioIconWell, 'mx-auto mb-4')}>
									<benefit.icon className="size-6" aria-hidden />
								</div>

								<h3 className="mb-2 font-semibold text-lg text-slate-900">
									{benefit.title}
								</h3>

								<p className="mb-4 text-slate-600 text-sm leading-relaxed">
									{benefit.description}
								</p>

								<div className="inline-flex items-center rounded-full border border-brand/15 bg-brand-soft px-3 py-1 font-medium text-brand text-xs">
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
