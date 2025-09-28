import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '~/components/ui/button'

const footerLinks = {
	product: [
		{ name: 'Características', href: '#como-funciona' },
		{ name: 'Beneficios', href: '#beneficios' },
		{ name: 'Empresas afiliadas', href: '#empresas' },
		{ name: 'Simulador', href: '/simulador' },
	],
	support: [
		{ name: 'Centro de ayuda', href: '/ayuda' },
		{ name: 'Preguntas frecuentes', href: '/faq' },
		{ name: 'Contacto', href: '/contacto' },
		{ name: 'Estatus de solicitud', href: '/status' },
	],
	legal: [
		{ name: 'Términos y condiciones', href: '/terminos' },
		{ name: 'Política de privacidad', href: '/privacidad' },
		{ name: 'Aviso de privacidad', href: '/aviso-privacidad' },
		{ name: 'CONDUSEF', href: 'https://www.condusef.gob.mx' },
	],
}

const contactInfo = [
	{
		icon: Phone,
		label: 'Teléfono',
		value: '800-TOPCREDIT',
		href: 'tel:800-867-2733',
	},
	{
		icon: Mail,
		label: 'Email',
		value: 'hola@topcredit.mx',
		href: 'mailto:hola@topcredit.mx',
	},
	{
		icon: MapPin,
		label: 'Oficinas',
		value: 'Ciudad de México, México',
		href: '#',
	},
	{
		icon: Clock,
		label: 'Horarios',
		value: 'Lun-Vie 9:00-18:00',
		href: '#',
	},
]

export function Footer() {
	return (
		<footer className="bg-gray-900">
			{/* CTA Section */}
			<div className="border-gray-800 border-b">
				<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
					<div className="text-center">
						<h2 className="font-bold text-3xl text-white sm:text-4xl">
							¿Listo para obtener tu crédito?
						</h2>
						<p className="mx-auto mt-4 max-w-2xl text-gray-300 text-lg">
							Únete a miles de empleados que ya confían en TopCredit para sus
							necesidades financieras.
						</p>
						<div className="mt-8">
							<Button
								asChild
								size="lg"
								className="group h-12 bg-blue-600 px-8 text-base hover:bg-blue-700"
							>
								<Link href="/signup">
									Solicitar crédito ahora
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Main Footer */}
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
				<div className="grid gap-8 lg:grid-cols-4">
					{/* Company Info */}
					<div className="lg:col-span-1">
						<div className="flex items-center">
							<Image
								src="/logo-small.png"
								alt="TopCredit"
								width={120}
								height={32}
								className="h-8 w-auto brightness-0 invert"
							/>
						</div>
						<p className="mt-4 text-gray-400 text-sm leading-relaxed">
							La plataforma de crédito confiable para empleados de empresas
							afiliadas. Proceso digital, tasas preferenciales y aprobación
							rápida.
						</p>

						{/* Contact Info */}
						<div className="mt-6 space-y-3">
							{contactInfo.map((item) => (
								<a
									key={item.label}
									href={item.href}
									className="flex items-center text-gray-400 text-sm transition-colors hover:text-white"
								>
									<item.icon className="mr-3 h-4 w-4" />
									<span>{item.value}</span>
								</a>
							))}
						</div>
					</div>

					{/* Links */}
					<div className="grid gap-8 sm:grid-cols-3 lg:col-span-3">
						<div>
							<h3 className="font-semibold text-white">Producto</h3>
							<ul className="mt-4 space-y-2">
								{footerLinks.product.map((link) => (
									<li key={link.name}>
										<Link
											href={link.href}
											className="text-gray-400 text-sm transition-colors hover:text-white"
										>
											{link.name}
										</Link>
									</li>
								))}
							</ul>
						</div>

						<div>
							<h3 className="font-semibold text-white">Soporte</h3>
							<ul className="mt-4 space-y-2">
								{footerLinks.support.map((link) => (
									<li key={link.name}>
										<Link
											href={link.href}
											className="text-gray-400 text-sm transition-colors hover:text-white"
										>
											{link.name}
										</Link>
									</li>
								))}
							</ul>
						</div>

						<div>
							<h3 className="font-semibold text-white">Legal</h3>
							<ul className="mt-4 space-y-2">
								{footerLinks.legal.map((link) => (
									<li key={link.name}>
										<Link
											href={link.href}
											className="text-gray-400 text-sm transition-colors hover:text-white"
											{...(link.href.startsWith('http') && {
												target: '_blank',
												rel: 'noopener noreferrer',
											})}
										>
											{link.name}
										</Link>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-12 border-gray-800 border-t pt-8">
					<div className="flex flex-col items-center justify-between sm:flex-row">
						<p className="text-gray-400 text-sm">
							© 2024 TopCredit. Todos los derechos reservados.
						</p>
						<div className="mt-4 flex space-x-6 sm:mt-0">
							<span className="text-gray-400 text-xs">
								Regulado por CNBV • Protegido por IPAB
							</span>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}
