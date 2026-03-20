import { FileQuestion } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { authPageTitleClass } from '~/components/auth/auth-form-styles'
import { buttonVariants } from '~/components/ui/button'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

export type NotFoundScope = 'public' | 'app' | 'dashboard' | 'settings'

function NotFoundCtaLink({
	href,
	variant,
	children,
}: {
	href: string
	variant: 'brand' | 'outline'
	children: ReactNode
}) {
	return (
		<Link
			href={href}
			className={cn(
				buttonVariants({ variant }),
				'h-11 w-full border-slate-200 no-underline',
				variant === 'outline' &&
					'bg-white font-medium text-slate-800 shadow-sm',
			)}
		>
			{children}
		</Link>
	)
}

async function NotFoundCard({ scope }: { scope: NotFoundScope }) {
	const t = await getTranslations('notFound')
	const tAuth = await getTranslations('auth')

	const primary =
		scope === 'app'
			? { href: '/app', label: t('cta-app-panel') }
			: scope === 'dashboard'
				? { href: '/dashboard', label: t('cta-dashboard') }
				: scope === 'settings'
					? { href: '/settings/profile', label: t('cta-settings') }
					: { href: '/', label: t('cta-home') }

	const secondary =
		scope === 'public'
			? { href: '/login', label: tAuth('login') }
			: scope === 'dashboard'
				? { href: '/dashboard/applications', label: t('cta-applications') }
				: scope === 'settings'
					? { href: '/', label: t('cta-home') }
					: null

	return (
		<div
			className={cn(
				shell.elevatedCard,
				'w-full max-w-md p-8 text-center md:p-10',
			)}
		>
			<div className="mb-6 flex justify-center">
				<div
					className={cn(shell.applicantDocumentTileIconWell, 'mb-0')}
					aria-hidden
				>
					<FileQuestion className="size-6" />
				</div>
			</div>

			<p className="mb-2 font-semibold text-brand text-xs uppercase tracking-[0.16em]">
				{t('code-label')}
			</p>
			<h1 className={cn(authPageTitleClass, 'mb-3')}>{t('title')}</h1>
			<p className="mb-8 text-pretty text-slate-600 text-sm leading-relaxed">
				{t('description')}
			</p>

			<div className="flex flex-col gap-3">
				<NotFoundCtaLink href={primary.href} variant="brand">
					{primary.label}
				</NotFoundCtaLink>
				{secondary ? (
					<NotFoundCtaLink href={secondary.href} variant="outline">
						{secondary.label}
					</NotFoundCtaLink>
				) : null}
			</div>
		</div>
	)
}

export async function NotFoundScreen({ scope }: { scope: NotFoundScope }) {
	const tDashboard = await getTranslations('dashboard')
	const year = new Date().getFullYear()

	return (
		<div className="flex min-h-screen flex-col bg-slate-50/80">
			<div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
				<NotFoundCard scope={scope} />
			</div>
			<footer className="border-slate-200/80 border-t bg-white px-4 py-8 text-center text-slate-500 text-sm">
				<p>{tDashboard('footer-copyright', { year })}</p>
			</footer>
		</div>
	)
}
