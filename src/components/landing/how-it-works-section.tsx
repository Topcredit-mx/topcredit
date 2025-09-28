import { ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '~/components/ui/button'

const steps = [
	{
		number: '01',
		title: 'Regístrate',
		description:
			'Crea tu cuenta con tu CURP y datos de empleado de empresa afiliada.',
		details: [
			'Verificación automática de empleo',
			'Proceso 100% digital',
			'Sin documentos físicos',
		],
	},
	{
		number: '02',
		title: 'Solicita tu crédito',
		description:
			'Completa la solicitud con la información básica y el monto deseado.',
		details: [
			'Simulador de pagos',
			'Tasas preferenciales',
			'Montos hasta $500,000',
		],
	},
	{
		number: '03',
		title: 'Aprobación inmediata',
		description:
			'Nuestro sistema evalúa tu solicitud usando tu historial laboral.',
		details: [
			'Respuesta en minutos',
			'Sin aval requerido',
			'Basado en tu estabilidad',
		],
	},
	{
		number: '04',
		title: 'Recibe tu dinero',
		description: 'Una vez aprobado, el dinero se deposita directo a tu cuenta.',
		details: [
			'Transferencia inmediata',
			'Sin comisiones ocultas',
			'Disponible 24/7',
		],
	},
]

export function HowItWorksSection() {
	return (
		<section className="bg-gray-50 py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="font-bold text-3xl text-gray-900 tracking-tight sm:text-4xl">
						¿Cómo funciona?
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-gray-600 text-lg">
						Un proceso simple y transparente diseñado para que obtengas tu
						crédito de manera rápida y segura.
					</p>
				</div>

				<div className="mt-16">
					<div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
						{steps.map((step, index) => (
							<div key={step.number} className="relative">
								{/* Connection Line */}
								{index < steps.length - 1 && (
									<div className="absolute top-16 left-8 hidden h-full w-px bg-gradient-to-b from-blue-200 to-transparent lg:block" />
								)}

								<div className="flex">
									{/* Step Number */}
									<div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-lg text-white">
										{step.number}
									</div>

									{/* Content */}
									<div className="ml-6 flex-1">
										<h3 className="mb-2 font-semibold text-gray-900 text-xl">
											{step.title}
										</h3>

										<p className="mb-4 text-gray-600 leading-relaxed">
											{step.description}
										</p>

										<ul className="space-y-2">
											{step.details.map((detail) => (
												<li
													key={detail}
													className="flex items-center text-gray-500 text-sm"
												>
													<CheckCircle className="mr-2 h-4 w-4 text-green-500" />
													{detail}
												</li>
											))}
										</ul>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* CTA */}
				<div className="mt-16 text-center">
					<Button asChild size="lg" className="group h-12 px-8 text-base">
						<Link href="/signup">
							Empezar ahora
							<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Link>
					</Button>
				</div>
			</div>
		</section>
	)
}
