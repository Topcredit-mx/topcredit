'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import type { PrefetchStrategy } from '~/lib/prefetch-strategy'

export type { PrefetchStrategy } from '~/lib/prefetch-strategy'

type NextLinkProps = ComponentProps<typeof Link>

export function ListDetailLink({
	href,
	prefetchStrategy = 'viewport',
	...props
}: NextLinkProps & { prefetchStrategy?: PrefetchStrategy }) {
	const router = useRouter()
	const prefetch = prefetchStrategy === 'viewport'
	const onMouseEnter =
		prefetchStrategy === 'hover' && typeof href === 'string'
			? () => router.prefetch(href)
			: undefined

	return (
		<Link
			href={href}
			prefetch={prefetch}
			onMouseEnter={onMouseEnter}
			{...props}
		/>
	)
}
