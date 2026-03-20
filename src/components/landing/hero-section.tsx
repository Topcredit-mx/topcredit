'use client'

import { ArrowRight, CheckCircle, Shield, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '~/components/ui/button'
export function HeroSection() {
	const { data: session } = useSession()

	return (
		<section className="relative overflow-hidden border-slate-100 border-b bg-white">
			<div
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,var(--color-brand-soft),transparent)] opacity-90"
				aria-hidden
			/>

			<div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
				<div className="text-center">
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

					<div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/90 px-4 py-2 font-medium text-slate-700 text-sm">
						<Shield className="size-4 shrink-0 text-brand" aria-hidden />
						<span>Anunciando nuestro colaborador más reciente Soriana</span>
						<ArrowRight className="size-4 shrink-0 text-brand" aria-hidden />
					</div>

					<h1 className="mx-auto max-w-4xl font-semibold text-4xl text-slate-900 tracking-tight sm:text-5xl lg:text-6xl">
						Nunca a sido tan{' '}
						<span className="bg-gradient-to-r from-brand to-brand-deep bg-clip-text text-transparent">
							fácil
						</span>{' '}
						conseguir un crédito
					</h1>

					<p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-8 sm:text-xl">
						Créditos nominales confiables para empleados de empresas afiliadas.
						Proceso 100% digital, aprobación rápida y las mejores tasas del
						mercado.
					</p>

					<div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm">
						<div className="flex items-center gap-2">
							<CheckCircle className="size-4 shrink-0 text-emerald-600" />
							Proceso 100% digital
						</div>
						<div className="flex items-center gap-2">
							<CheckCircle className="size-4 shrink-0 text-emerald-600" />
							Aprobación en minutos
						</div>
						<div className="flex items-center gap-2">
							<CheckCircle className="size-4 shrink-0 text-emerald-600" />
							Tasas preferenciales
						</div>
					</div>

					<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
						{session ? (
							<Button
								asChild
								variant="brand"
								size="lg"
								className="group h-12 px-8 text-base"
							>
								<Link href="/cuenta">
									<Zap className="size-5" />
									Ir a Mi Cuenta
									<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
						) : (
							<Button
								asChild
								variant="brand"
								size="lg"
								className="group h-12 px-8 text-base"
							>
								<Link href="/signup">
									Inicia ahora
									<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
						)}

						<Button
							variant="outline"
							size="lg"
							className="h-12 border-slate-200 bg-white px-8 text-base shadow-xs hover:bg-slate-50"
							asChild
						>
							<Link href="#como-funciona">Conoce más</Link>
						</Button>
					</div>

					<div className="mt-16" id="empresas">
						<p className="text-center font-medium text-slate-500 text-sm">
							Empresas que confían en nosotros
						</p>
						<div className="mx-auto mt-8 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-12 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
							<div className="col-span-2 max-h-12 w-full object-contain lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-2 font-semibold text-slate-500 text-xl tracking-tight">
										Soriana
									</span>
								</div>
							</div>
							<div className="col-span-2 max-h-12 w-full object-contain lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-2 font-semibold text-slate-500 text-xl tracking-tight">
										OXXO
									</span>
								</div>
							</div>
							<div className="col-span-2 max-h-12 w-full object-contain lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-2 font-semibold text-slate-500 text-xl tracking-tight">
										Bimbo
									</span>
								</div>
							</div>
							<div className="col-span-2 max-h-12 w-full object-contain sm:col-start-2 lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-2 font-semibold text-slate-500 text-xl tracking-tight">
										Cemex
									</span>
								</div>
							</div>
							<div className="col-span-2 col-start-2 max-h-12 w-full object-contain sm:col-start-auto lg:col-span-1">
								<div className="flex h-12 items-center justify-center">
									<span className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-2 font-semibold text-slate-500 text-xl tracking-tight">
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
