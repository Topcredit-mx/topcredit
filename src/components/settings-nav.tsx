'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, User } from 'lucide-react'

const base = '/settings'
const nav = [
	{ href: `${base}/profile`, label: 'Perfil', icon: User },
	{ href: `${base}/security`, label: 'Seguridad', icon: Shield },
] as const

export function SettingsNav() {
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
