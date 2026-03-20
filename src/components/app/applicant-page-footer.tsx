import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { cn } from '~/lib/utils'

type ApplicantPageFooterProps = {
	className?: string
}

export async function ApplicantPageFooter({
	className,
}: ApplicantPageFooterProps) {
	const tCuenta = await getTranslations('cuenta')
	const year = new Date().getFullYear()

	return (
		<footer
			className={cn(
				'flex flex-col gap-4 border-slate-200/80 border-t pt-10 sm:flex-row sm:items-center sm:justify-between',
				className,
			)}
		>
			<p className="text-slate-500 text-sm">
				{tCuenta('footer-copyright', { year })}
			</p>
			<nav
				className="flex flex-wrap gap-x-6 gap-y-2 text-slate-500 text-sm"
				aria-label={tCuenta('footer-nav-aria')}
			>
				<Link href="/cuenta/settings/profile" className="hover:text-brand">
					{tCuenta('footer-privacy')}
				</Link>
				<Link href="/cuenta/settings/security" className="hover:text-brand">
					{tCuenta('footer-terms')}
				</Link>
				<Link href="/cuenta/settings" className="hover:text-brand">
					{tCuenta('footer-help')}
				</Link>
				<Link href="/cuenta/applications/new" className="hover:text-brand">
					{tCuenta('footer-contact')}
				</Link>
			</nav>
		</footer>
	)
}
