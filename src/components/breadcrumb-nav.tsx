'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import {
	type BreadcrumbSegment,
	getAppBreadcrumbSegments,
	getDashboardBreadcrumbSegments,
} from '~/lib/breadcrumb-config'

type BreadcrumbScope = 'dashboard' | 'app'

function getSegments(
	scope: BreadcrumbScope,
	pathname: string,
	params: { id?: string; domain?: string },
): BreadcrumbSegment[] {
	if (scope === 'dashboard') {
		return getDashboardBreadcrumbSegments(pathname, params)
	}
	return getAppBreadcrumbSegments(pathname, params)
}

export function BreadcrumbNav({ scope }: { scope: BreadcrumbScope }) {
	const pathname = usePathname()
	const params = useParams()
	const t = useTranslations('breadcrumbs')

	const segments = getSegments(scope, pathname, {
		id: typeof params.id === 'string' ? params.id : undefined,
		domain: typeof params.domain === 'string' ? params.domain : undefined,
	})

	if (segments.length === 0) return null

	return (
		<Breadcrumb aria-label="Breadcrumb" className="flex-1">
			<BreadcrumbList>
				{segments.flatMap((segment, index) => {
					const isLast = index === segments.length - 1
					const item = (
						<BreadcrumbItem key={segment.href}>
							{isLast ? (
								<BreadcrumbPage>{t(segment.labelKey)}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link href={segment.href}>{t(segment.labelKey)}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					)
					return isLast
						? [item]
						: [item, <BreadcrumbSeparator key={`sep-${segment.href}`} />]
				})}
			</BreadcrumbList>
		</Breadcrumb>
	)
}
