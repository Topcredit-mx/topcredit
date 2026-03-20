import { Quote, Star } from 'lucide-react'

import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

const testimonials = [
	{
		name: 'María González',
		role: 'Empleada en Soriana',
		location: 'Monterrey, NL',
		rating: 5,
		text: 'El proceso fue increíblemente rápido. En menos de 30 minutos tenía mi crédito aprobado y el dinero en mi cuenta. Las tasas son excelentes comparado con otros bancos.',
		avatar: 'MG',
	},
	{
		name: 'Carlos Rodríguez',
		role: 'Empleado en OXXO',
		location: 'Ciudad de México',
		rating: 5,
		text: 'Llevaba años batallando con bancos tradicionales. TopCredit me dio la oportunidad que necesitaba con condiciones justas y un servicio excepcional.',
		avatar: 'CR',
	},
	{
		name: 'Ana Martínez',
		role: 'Empleada en Bimbo',
		location: 'Guadalajara, JAL',
		rating: 5,
		text: 'Lo que más me gustó es la transparencia. No hay sorpresas, todo está claro desde el inicio. El proceso digital es muy fácil de usar.',
		avatar: 'AM',
	},
]

export function TestimonialsSection() {
	return (
		<section className="border-slate-100 border-t bg-white py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="font-semibold text-3xl text-slate-900 tracking-tight sm:text-4xl">
						Lo que dicen nuestros usuarios
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
						Historias reales de empleados que han transformado su situación
						financiera.
					</p>
				</div>

				<div className="mt-16 grid gap-8 lg:grid-cols-3">
					{testimonials.map((testimonial) => (
						<div key={testimonial.name} className="relative">
							<div
								className={cn(
									shell.elevatedCard,
									'h-full p-8 transition-shadow hover:shadow-portfolio-row',
								)}
							>
								<Quote className="size-8 text-brand/80" aria-hidden />

								<div className="mt-4 flex">
									{[...Array(testimonial.rating)].map((_, i) => (
										<Star
											key={`star-${testimonial.name}-${i}`}
											className="size-5 fill-amber-400 text-amber-400"
										/>
									))}
								</div>

								<blockquote className="mt-4 text-slate-700 leading-relaxed">
									&ldquo;{testimonial.text}&rdquo;
								</blockquote>

								<div className="mt-6 flex items-center">
									<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
										{testimonial.avatar}
									</div>
									<div className="ml-4 min-w-0">
										<div className="font-semibold text-slate-900">
											{testimonial.name}
										</div>
										<div className="text-slate-500 text-sm">
											{testimonial.role}
										</div>
										<div className="text-slate-400 text-xs">
											{testimonial.location}
										</div>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="mt-16 text-center">
					<div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-4 py-2 font-medium text-emerald-900 text-sm">
						<Star
							className="size-4 fill-emerald-600 text-emerald-600"
							aria-hidden
						/>
						4.9/5 estrellas basado en 2,847 reseñas
					</div>
				</div>
			</div>
		</section>
	)
}
