import { Award, Building2, TrendingUp, Users } from 'lucide-react'

const stats = [
	{
		icon: Users,
		value: '50,000+',
		label: 'Empleados registrados',
		description: 'Usuarios activos que confían en nuestra plataforma',
	},
	{
		icon: Building2,
		value: '200+',
		label: 'Empresas afiliadas',
		description: 'Compañías que ofrecen beneficios a sus empleados',
	},
	{
		icon: TrendingUp,
		value: '$2.5B+',
		label: 'Créditos otorgados',
		description: 'Monto total en préstamos aprobados',
	},
	{
		icon: Award,
		value: '98%',
		label: 'Satisfacción del cliente',
		description: 'Usuarios que recomendarían nuestro servicio',
	},
]

export function StatsSection() {
	return (
		<section className="bg-blue-600 py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="font-bold text-3xl text-white sm:text-4xl">
						Números que hablan por sí solos
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-blue-100 text-lg">
						Miles de empleados ya han mejorado su situación financiera con
						TopCredit.
					</p>
				</div>

				<div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{stats.map((stat) => (
						<div key={stat.label} className="text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500 text-white">
								<stat.icon className="h-6 w-6" />
							</div>

							<div className="font-bold text-3xl text-white sm:text-4xl">
								{stat.value}
							</div>

							<div className="mt-2 font-medium text-blue-100 text-lg">
								{stat.label}
							</div>

							<p className="mt-1 text-blue-200 text-sm">{stat.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
