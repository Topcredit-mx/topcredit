'use client'

import type * as React from 'react'
import { FieldError } from '~/components/ui/field'
import { cn } from '~/lib/utils'

function Alert({
	className,
	message,
	children,
	variant = 'inline',
	...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
	message?: string | null
	children?: React.ReactNode
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
