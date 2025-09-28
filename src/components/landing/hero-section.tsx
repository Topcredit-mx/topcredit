'use client'

import { ArrowRight, CheckCircle, Shield, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '~/components/ui/button'

export function HeroSection() {
	const { data: session } = useSession()

	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
			{/* Background Pattern */}
			<div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />

			<div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
				<div className="text-center">
					{/* Logo */}
					<div className="mb-8">
						<Image
							src="/logo.png"
							alt="TopCredit"
							width={200}
							height={60}
							className="mx-auto h-12 w-auto sm:h-16"
							priority
						/>
					</div>

					{/* Badge */}
					<div className="mx-auto mb-6 inline-flex items-center rounded-full bg-blue-100 px-4 py-2 font-medium text-blue-800 text-sm">
						<Shield className="mr-2 h-4 w-4" />
						Anunciando nuestro colaborador más reciente Soriana
						<ArrowRight className="ml-2 h-4 w-4" />
					</div>

					{/* Main Headline */}
					<h1 className="mx-auto max-w-4xl font-bold text-4xl text-gray-900 tracking-tight sm:text-5xl lg:text-6xl">
						Nunca a sido tan{' '}
						<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
							fácil
						</span>{' '}
						conseguir un crédito
					</h1>

					{/* Subtitle */}
					<p className="mx-auto mt-6 max-w-2xl text-gray-600 text-lg leading-8 sm:text-xl">
						Créditos nominales confiables para empleados de empresas afiliadas.
						Proceso 100% digital, aprobación rápida y las mejores tasas del
						mercado.
					</p>

					{/* Trust Indicators */}
					<div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm">
						<div className="flex items-center">
							<CheckCircle className="mr-2 h-4 w-4 text-green-500" />
							Proceso 100% digital
						</div>
						<div className="flex items-center">
							<CheckCircle className="mr-2 h-4 w-4 text-green-500" />
							Aprobación en minutos
						</div>
						<div className="flex items-center">
							<CheckCircle className="mr-2 h-4 w-4 text-green-500" />
							Tasas preferenciales
						</div>
					</div>

					{/* CTA Buttons */}
					<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
						{session ? (
							<Button asChild size="lg" className="group h-12 px-8 text-base">
								<Link href="/settings">
									<Zap className="mr-2 h-5 w-5" />
									Ir a Mi Cuenta
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
						) : (
							<Button asChild size="lg" className="group h-12 px-8 text-base">
								<Link href="/signup">
									Inicia ahora
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
						)}

						<Button variant="outline" size="lg" className="h-12 px-8 text-base">
							<Link href="#como-funciona">Conoce más</Link>
						</Button>
					</div>

					{/* Social Proof */}
					<div className="mt-16">
						<p className="text-center font-medium text-gray-500 text-sm">
							Empresas que confían en nosotros
						</p>
						<div className="mx-auto mt-8 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-12 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
							<div className="col-span-2 max-h-12 w-full object-contain lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="font-bold text-2xl text-gray-400 tracking-tight">
										Soriana
									</span>
								</div>
							</div>
							<div className="col-span-2 max-h-12 w-full object-contain lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="font-bold text-2xl text-gray-400 tracking-tight">
										OXXO
									</span>
								</div>
							</div>
							<div className="col-span-2 max-h-12 w-full object-contain lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="font-bold text-2xl text-gray-400 tracking-tight">
										Bimbo
									</span>
								</div>
							</div>
							<div className="col-span-2 max-h-12 w-full object-contain sm:col-start-2 lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="font-bold text-2xl text-gray-400 tracking-tight">
										Cemex
									</span>
								</div>
							</div>
							<div className="col-span-2 col-start-2 max-h-12 w-full object-contain sm:col-start-auto lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="font-bold text-2xl text-gray-400 tracking-tight">
										Walmart
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
