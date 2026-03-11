'use client'

import type * as React from 'react'
import { FieldError } from '~/components/ui/field'
import { cn } from '~/lib/utils'

/**
 * Alert: one component, two presentation variants.
 * - inline: message only (no wrapper). Use next to fields or inline content.
 * - banner: message inside a bordered block. Use for block-level callouts (e.g. above actions).
 * Message content is rendered via FieldError so styling stays in one place.
 */
function Alert({
	className,
	message,
	children,
	variant = 'inline',
	...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
	/** Main content. Prefer conditional rendering at call site: {message && <Alert message={message} />} */
	message?: string | null
	/** Fallback when message is not set. */
	children?: React.ReactNode
	/** @default 'inline' – inline = no wrapper; banner = bordered block */
	variant?: 'inline' | 'banner'
}) {
	const content = message ?? children

	const messageElement = (
		<FieldError
			message={typeof content === 'string' ? content : undefined}
			role="alert"
			className={variant === 'inline' ? className : undefined}
			{...(variant === 'inline' ? props : {})}
		>
			{typeof content !== 'string' ? content : undefined}
		</FieldError>
	)

	if (variant === 'inline') return messageElement
	return (
		<div
			data-slot="alert"
			role="alert"
			className={cn(
				'rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2',
				className,
			)}
			{...props}
		>
			{messageElement}
		</div>
	)
}

export { Alert }
