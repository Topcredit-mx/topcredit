import Link from 'next/link'
import type * as React from 'react'

import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

export function ShellBackLink({
	href,
	className,
	children,
	...props
}: React.ComponentProps<typeof Link>) {
	return (
		<Link href={href} className={cn(shell.backLink, className)} {...props}>
			{children}
		</Link>
	)
}
