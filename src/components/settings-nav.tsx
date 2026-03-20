'use client'

import { Shield, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from '~/lib/utils'

const DEFAULT_BASE = '/settings'

type SettingsNavProps = {
	/** Use `/cuenta/settings` for applicant shell (sidebar); default for agents / legacy `/settings`. */
	basePath?: string
}

export function SettingsNav({ basePath = DEFAULT_BASE }: SettingsNavProps) {
	const t = useTranslations('settings')
	const pathname = usePathname()
	const base = basePath.replace(/\/$/, '') || DEFAULT_BASE
	const profileHref = `${base}/profile`
	const securityHref = `${base}/security`

	const nav = [
		{ href: profileHref, label: t('nav-profile'), icon: User },
		{ href: securityHref, label: t('nav-security'), icon: Shield },
	] as const

	return (
		<nav
			className="-mb-px flex flex-wrap gap-x-6 gap-y-1 border-slate-200 border-b"
			aria-label={t('nav-aria')}
		>
			{nav.map(({ href, label, icon: Icon }) => {
				const isActive =
					pathname === href ||
					(href !== profileHref && pathname.startsWith(href))
				return (
					<Link
						key={href}
						href={href}
						className={cn(
							'-mb-px inline-flex items-center gap-2 border-b-2 py-3 font-semibold text-sm transition-colors',
							isActive
								? 'border-brand text-brand'
								: 'border-transparent text-slate-500 hover:text-slate-800',
						)}
					>
						<Icon className="size-4 shrink-0" aria-hidden />
						{label}
					</Link>
				)
			})}
		</nav>
	)
}
