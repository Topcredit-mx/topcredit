import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { authPageTitleClass } from '~/components/auth/auth-form-styles'
import { buttonVariants } from '~/components/ui/button'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { authOptions } from '~/server/auth/config'

function UnauthorizedCtaLink({
	href,
	children,
}: {
	href: string
	children: ReactNode
}) {
	return (
		<Link
			href={href}
			className={cn(
				buttonVariants({ variant: 'brand' }),
				'h-11 w-full no-underline',
			)}
		>
			{children}
		</Link>
	)
}

export default async function UnauthorizedPage() {
	const t = await getTranslations('unauthorized')
	const tAuth = await getTranslations('auth')
	const tDashboard = await getTranslations('dashboard')
	const session = await getServerSession(authOptions)
	const year = new Date().getFullYear()
	const homeHref = '/'
	const loginHref = '/login'

	const secondaryLinkClass =
		'font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand'

	return (
		<div className="flex min-h-screen flex-col bg-slate-50/80">
			<div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
				<div
					className={cn(shell.elevatedCard, 'w-full max-w-md p-8 text-center')}
				>
					<div className="mb-6 flex justify-center">
						<div
							className="flex size-14 items-center justify-center rounded-2xl border border-red-200/80 bg-red-50/70 shadow-sm"
							aria-hidden
						>
							<AlertCircle className="size-7 text-destructive" />
						</div>
					</div>

					<h1 className={cn(authPageTitleClass, 'mb-2')}>{t('title')}</h1>

					<p className="mb-6 text-pretty text-slate-600 leading-relaxed">
						{t('description')}
					</p>

					{session?.user ? (
						<div className="space-y-4">
							<p className="text-pretty text-slate-500 text-sm leading-relaxed">
								{t('contact-admin')}
							</p>
							<UnauthorizedCtaLink href={homeHref}>
								{t('back-home')}
							</UnauthorizedCtaLink>
						</div>
					) : (
						<div className="space-y-4">
							<p className="text-pretty text-slate-500 text-sm leading-relaxed">
								{t('need-login')}
							</p>
							<UnauthorizedCtaLink href={loginHref}>
								{tAuth('login')}
							</UnauthorizedCtaLink>
							<p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-sm">
								<Link href={loginHref} className={secondaryLinkClass}>
									{tAuth('login')}
								</Link>
								<span className="text-slate-300" aria-hidden>
									·
								</span>
								<Link href={homeHref} className={secondaryLinkClass}>
									{t('back-home')}
								</Link>
							</p>
						</div>
					)}
				</div>
			</div>

			<footer className="border-slate-200/80 border-t bg-white px-4 py-8 text-center text-slate-500 text-sm">
				<p>{tDashboard('footer-copyright', { year })}</p>
			</footer>
		</div>
	)
}
