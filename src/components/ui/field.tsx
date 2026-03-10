'use client'

import { useTranslations } from 'next-intl'
import type * as React from 'react'
import { cn } from '~/lib/utils'

function Field({
	className,
	orientation = 'vertical',
	...props
}: React.ComponentProps<'div'> & {
	orientation?: 'vertical' | 'horizontal' | 'responsive'
}) {
	return (
		<div
			data-slot="field"
			className={cn(
				'flex gap-2',
				orientation === 'horizontal' && 'items-center',
				orientation === 'vertical' && 'flex-col',
				// Invalid state styling - affects label color
				'data-[invalid=true]:**:data-[slot="field-label"]:text-destructive',
				className,
			)}
			{...props}
		/>
	)
}

function FieldLabel({
	className,
	htmlFor,
	...props
}: React.ComponentProps<'label'> & {
	htmlFor: string
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: test
		<label
			data-slot="field-label"
			htmlFor={htmlFor}
			className={cn(
				'flex select-none items-center gap-2 font-medium text-sm leading-none',
				className,
			)}
			{...props}
		/>
	)
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			data-slot="field-description"
			className={cn('text-muted-foreground text-sm', className)}
			{...props}
		/>
	)
}

function FieldError({
	className,
	children,
	translationKey,
	namespace,
	...props
}: React.ComponentProps<'p'> & {
	/** When set, render the translated message or the key as fallback. */
	translationKey?: string
	/** Required when translationKey is set; e.g. 'admin' or 'dashboard.applications'. */
	namespace?: string
}) {
	const t = useTranslations(namespace ?? 'common')
	const content =
		translationKey != null && namespace != null
			? (() => {
					try {
						const result = t(translationKey)
						return result ?? translationKey
					} catch {
						return translationKey
					}
				})()
			: children

	return (
		<p
			data-slot="field-error"
			className={cn('text-destructive text-sm', className)}
			{...props}
		>
			{content}
		</p>
	)
}

export { Field, FieldDescription, FieldError, FieldLabel }
