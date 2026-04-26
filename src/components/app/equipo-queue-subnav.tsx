'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '~/lib/utils'

export type EquipoQueueSubnavItem = {
	href: string
	label: string
	match: 'exact' | 'prefix'
}

export function EquipoQueueSubnav({
	ariaLabel,
	items,
}: {
	ariaLabel: string
	items: EquipoQueueSubnavItem[]
}) {
	const pathname = usePathname()
	const normalized =
		pathname.endsWith('/') && pathname.length > 1
			? pathname.slice(0, -1)
			: pathname

	return (
		<nav
			aria-label={ariaLabel}
			className="mb-6 flex flex-wrap gap-2 border-slate-100 border-b pb-4"
		>
			{items.map((item) => {
				const active =
					item.match === 'exact'
						? normalized === item.href
						: normalized === item.href || normalized.startsWith(`${item.href}/`)
				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							'rounded-md px-3 py-1.5 font-medium text-sm transition-colors',
							active
								? 'bg-slate-100 text-foreground'
								: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
						)}
						aria-current={active ? 'page' : undefined}
					>
						{item.label}
					</Link>
				)
			})}
		</nav>
	)
}
