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
		<section id="como-funciona" className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="font-semibold text-3xl text-slate-900 tracking-tight sm:text-4xl">
						¿Cómo funciona?
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
						Un proceso simple y transparente diseñado para que obtengas tu
						crédito de manera rápida y segura.
					</p>
				</div>

				<div className="mt-16">
					<div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
						{steps.map((step, index) => (
							<div key={step.number} className="relative">
								{index < steps.length - 1 ? (
									<div className="absolute top-16 left-8 hidden h-full w-px bg-gradient-to-b from-brand/25 to-transparent lg:block" />
								) : null}

								<div className="flex">
									<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-lg text-white shadow-sm">
										{step.number}
									</div>

									<div className="ml-6 flex-1">
										<h3 className="mb-2 font-semibold text-slate-900 text-xl">
											{step.title}
										</h3>

										<p className="mb-4 text-slate-600 leading-relaxed">
											{step.description}
										</p>

										<ul className="space-y-2">
											{step.details.map((detail) => (
												<li
													key={detail}
													className="flex items-center gap-2 text-slate-500 text-sm"
												>
													<CheckCircle
														className="size-4 shrink-0 text-emerald-600"
														aria-hidden
													/>
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

				<div className="mt-16 text-center">
					<Button
						asChild
						variant="brand"
						size="lg"
						className="group h-12 px-8 text-base"
					>
						<Link href="/signup">
							Empezar ahora
							<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
						</Link>
					</Button>
				</div>
			</div>
		</section>
	)
}
