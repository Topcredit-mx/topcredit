import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { cn } from '~/lib/utils'

type ApplicantPageFooterProps = {
	className?: string
}

export async function ApplicantPageFooter({
	className,
}: ApplicantPageFooterProps) {
	const tDashboard = await getTranslations('dashboard')
	const year = new Date().getFullYear()

	return (
		<footer
			className={cn(
				'flex flex-col gap-4 border-slate-200/80 border-t pt-10 sm:flex-row sm:items-center sm:justify-between',
				className,
			)}
		>
			<p className="text-slate-500 text-sm">
				{tDashboard('footer-copyright', { year })}
			</p>
			<nav
				className="flex flex-wrap gap-x-6 gap-y-2 text-slate-500 text-sm"
				aria-label={tDashboard('footer-nav-aria')}
			>
				<Link href="/dashboard/settings/profile" className="hover:text-brand">
					{tDashboard('footer-privacy')}
				</Link>
				<Link href="/dashboard/settings/security" className="hover:text-brand">
					{tDashboard('footer-terms')}
				</Link>
				<Link href="/dashboard/settings" className="hover:text-brand">
					{tDashboard('footer-help')}
				</Link>
				<Link href="/dashboard/applications/new" className="hover:text-brand">
					{tDashboard('footer-contact')}
				</Link>
			</nav>
		</footer>
	)
}
