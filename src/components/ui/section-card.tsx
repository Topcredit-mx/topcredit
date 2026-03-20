import type { LucideIcon } from 'lucide-react'
import type * as React from 'react'

import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

type SectionTitleRowProps = {
	icon?: LucideIcon
	title: React.ReactNode
	description?: React.ReactNode
	/** For `aria-labelledby` on a wrapping `<section>`. */
	headingId?: string
	className?: string
}

/** Icon + title (+ optional subtitle), vertically centered as one unit — reuse on non-card sections. */
export function SectionTitleRow({
	icon: Icon,
	title,
	description,
	headingId,
	className,
}: SectionTitleRowProps) {
	return (
		<div className={cn('flex flex-row items-center gap-3', className)}>
			{Icon ? (
				<div className={shell.iconChip} aria-hidden>
					<Icon className="size-5" />
				</div>
			) : null}
			<div className="min-w-0 flex-1 space-y-1">
				<h2
					id={headingId}
					className="font-semibold text-brand text-lg leading-snug"
				>
					{title}
				</h2>
				{description ? (
					<div className="text-slate-600 text-sm leading-snug">
						{description}
					</div>
				) : null}
			</div>
		</div>
	)
}

type SectionCardProps = {
	icon?: LucideIcon
	title: React.ReactNode
	description?: React.ReactNode
	children: React.ReactNode
	className?: string
}

export function SectionCard({
	icon,
	title,
	description,
	children,
	className,
}: SectionCardProps) {
	return (
		<Card
			className={cn(
				shell.elevatedCard,
				'gap-0 overflow-hidden py-0',
				className,
			)}
		>
			<CardHeader className="border-slate-100 border-b px-6 py-4">
				<SectionTitleRow icon={icon} title={title} description={description} />
			</CardHeader>
			<CardContent className="px-6 pt-6 pb-6">{children}</CardContent>
		</Card>
	)
}
