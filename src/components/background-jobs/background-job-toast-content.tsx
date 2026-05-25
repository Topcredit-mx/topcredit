'use client'

import {
	CircleCheck,
	CreditCard,
	Loader2,
	OctagonX,
	TriangleAlert,
	Wallet,
} from 'lucide-react'
import type { BackgroundJobToastVariant } from '~/lib/background-jobs/types'
import { cn } from '~/lib/utils'
import type { QueueBulkConfirmJobKind } from '~/server/db/schema'

type BackgroundJobToastContentProps = {
	title: string
	description: string
	variant: BackgroundJobToastVariant
	queueBulkKind: QueueBulkConfirmJobKind
	processedCount?: number
	totalCount?: number
}

function JobKindIcon({
	kind,
	className,
}: {
	kind: QueueBulkConfirmJobKind
	className?: string
}) {
	if (kind === 'installments') {
		return <CreditCard className={className} aria-hidden />
	}
	return <Wallet className={className} aria-hidden />
}

function StatusIcon({
	variant,
	className,
}: {
	variant: BackgroundJobToastVariant
	className?: string
}) {
	if (variant === 'success') {
		return <CircleCheck className={className} aria-hidden />
	}
	if (variant === 'warning') {
		return <TriangleAlert className={className} aria-hidden />
	}
	if (variant === 'error') {
		return <OctagonX className={className} aria-hidden />
	}
	return <Loader2 className={cn(className, 'animate-spin')} aria-hidden />
}

const variantStyles: Record<
	BackgroundJobToastVariant,
	{ shell: string; icon: string; status: string }
> = {
	loading: {
		shell: 'border-border bg-background',
		icon: 'bg-primary/10 text-primary',
		status: 'text-primary',
	},
	success: {
		shell: 'border-emerald-200 bg-emerald-50',
		icon: 'bg-emerald-100 text-emerald-700',
		status: 'text-emerald-600',
	},
	warning: {
		shell: 'border-amber-200 bg-amber-50',
		icon: 'bg-amber-100 text-amber-700',
		status: 'text-amber-600',
	},
	error: {
		shell: 'border-red-200 bg-red-50',
		icon: 'bg-red-100 text-red-700',
		status: 'text-red-600',
	},
}

export function BackgroundJobToastContent({
	title,
	description,
	variant,
	queueBulkKind,
	processedCount = 0,
	totalCount = 0,
}: BackgroundJobToastContentProps) {
	const styles = variantStyles[variant]
	const showProgress =
		variant === 'loading' && totalCount > 0 && processedCount >= 0
	const progressPercent =
		totalCount > 0
			? Math.min(100, Math.round((processedCount / totalCount) * 100))
			: 0

	return (
		<div
			className={cn(
				'flex w-[min(100vw-2rem,22rem)] gap-3 rounded-lg border p-4 shadow-lg',
				styles.shell,
			)}
		>
			<div
				className={cn(
					'flex size-10 shrink-0 items-center justify-center rounded-full',
					styles.icon,
				)}
			>
				{variant === 'loading' ? (
					<StatusIcon variant={variant} className="size-5" />
				) : (
					<JobKindIcon kind={queueBulkKind} className="size-5" />
				)}
			</div>
			<div className="min-w-0 flex-1 space-y-2">
				<div className="space-y-1">
					<p className="font-semibold text-sm leading-tight">{title}</p>
					<p className="text-muted-foreground text-xs leading-snug">
						{description}
					</p>
				</div>
				{showProgress ? (
					<div className="space-y-1">
						<div className="h-1.5 overflow-hidden rounded-full bg-black/10">
							<div
								className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
								style={{ width: `${String(progressPercent)}%` }}
							/>
						</div>
						<p className="font-medium text-[11px] text-muted-foreground tabular-nums">
							{String(progressPercent)}%
						</p>
					</div>
				) : null}
			</div>
			{variant !== 'loading' ? (
				<StatusIcon
					variant={variant}
					className={cn('mt-0.5 size-4 shrink-0', styles.status)}
				/>
			) : null}
		</div>
	)
}
