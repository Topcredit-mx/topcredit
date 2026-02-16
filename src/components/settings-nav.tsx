'use client'

import { Shield, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

const base = '/settings'
function useSettingsNav() {
	const t = useTranslations('settings')
	return [
		{ href: `${base}/profile`, label: t('nav-profile'), icon: User },
		{ href: `${base}/security`, label: t('nav-security'), icon: Shield },
	] as const
}

export function SettingsNav() {
	const nav = useSettingsNav()
	const pathname = usePathname()
	return (
		<nav className="flex gap-1 border-b pb-4">
			{nav.map(({ href, label, icon: Icon }) => {
				const isActive =
					pathname === href ||
					(href !== `${base}/profile` && pathname.startsWith(href))
				return (
					<Link
						key={href}
						href={href}
						className={`flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
							isActive
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'
						}`}
					>
						<Icon className="h-4 w-4" />
						{label}
					</Link>
				)
			})}
		</nav>
	)
}
