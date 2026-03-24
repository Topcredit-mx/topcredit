import { AlertCircle, CheckCircle } from 'lucide-react'

import { cn } from '~/lib/utils'

export type AuthInlineMessageTone = 'destructive' | 'success'

export type AuthInlineMessageProps = {
	message: string | null | undefined
	tone?: AuthInlineMessageTone
	className?: string
	reserveHeight?: boolean
	minHeightClass?: string
	align?: 'center' | 'start'
	loading?: boolean
	loadingLabel?: string
}

export function AuthInlineMessage({
	message,
	tone = 'destructive',
	className,
	reserveHeight = true,
	minHeightClass = 'min-h-4',
	align = 'center',
	loading = false,
	loadingLabel,
}: AuthInlineMessageProps) {
	const trimmed = typeof message === 'string' ? message.trim() : ''
	const loadingText = loadingLabel?.trim() ?? ''
	const showLoading = Boolean(loading && loadingText.length > 0)
	const hasMessage = !showLoading && trimmed.length > 0

	const Icon = tone === 'success' ? CheckCircle : AlertCircle
	const textClass = tone === 'success' ? 'text-emerald-700' : 'text-destructive'

	return (
		<div
			className={cn(
				'flex w-full items-center',
				align === 'start' ? 'justify-start' : 'justify-center',
				reserveHeight && minHeightClass,
				className,
			)}
			aria-live="polite"
			aria-busy={showLoading}
		>
			{showLoading ? (
				<p className="text-center text-slate-500 text-xs">{loadingText}</p>
			) : null}
			{hasMessage ? (
				<span
					role={tone === 'success' ? 'status' : 'alert'}
					className={cn(
						'inline-flex max-w-full items-start gap-1.5 text-xs leading-snug',
						textClass,
					)}
				>
					<Icon
						className="mt-0.5 size-3.5 shrink-0"
						strokeWidth={2}
						aria-hidden
					/>
					<span className="min-w-0 text-balance">{trimmed}</span>
				</span>
			) : null}
		</div>
	)
}

export function AuthInlineError(props: Omit<AuthInlineMessageProps, 'tone'>) {
	return <AuthInlineMessage {...props} tone="destructive" />
}
