import { Quote, Star } from 'lucide-react'

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
		<section className="bg-gray-50 py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="font-bold text-3xl text-gray-900 tracking-tight sm:text-4xl">
						Lo que dicen nuestros usuarios
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-gray-600 text-lg">
						Historias reales de empleados que han transformado su situación
						financiera.
					</p>
				</div>

				<div className="mt-16 grid gap-8 lg:grid-cols-3">
					{testimonials.map((testimonial) => (
						<div key={testimonial.name} className="relative">
							<div className="h-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
								{/* Quote Icon */}
								<Quote className="h-8 w-8 text-blue-500" />

								{/* Rating */}
								<div className="mt-4 flex">
									{[...Array(testimonial.rating)].map((_, i) => (
										<Star
											key={`star-${testimonial.name}-${i}`}
											className="h-5 w-5 fill-yellow-400 text-yellow-400"
										/>
									))}
								</div>

								{/* Testimonial Text */}
								<blockquote className="mt-4 text-gray-700 leading-relaxed">
									"{testimonial.text}"
								</blockquote>

								{/* Author */}
								<div className="mt-6 flex items-center">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
										{testimonial.avatar}
									</div>
									<div className="ml-4">
										<div className="font-semibold text-gray-900">
											{testimonial.name}
										</div>
										<div className="text-gray-500 text-sm">
											{testimonial.role}
										</div>
										<div className="text-gray-400 text-xs">
											{testimonial.location}
										</div>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Trust Badge */}
				<div className="mt-16 text-center">
					<div className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 font-medium text-green-800 text-sm">
						<Star className="mr-2 h-4 w-4 fill-green-600 text-green-600" />
						4.9/5 estrellas basado en 2,847 reseñas
					</div>
				</div>
			</div>
		</section>
	)
}
