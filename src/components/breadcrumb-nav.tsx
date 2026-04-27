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
	getCuentaBreadcrumbSegments,
	getEquipoBreadcrumbSegments,
} from '~/lib/breadcrumb-config'

type BreadcrumbScope = 'cuenta' | 'equipo'

function getSegments(
	scope: BreadcrumbScope,
	pathname: string,
	params: { id?: string; domain?: string },
): BreadcrumbSegment[] {
	if (scope === 'cuenta') {
		return getCuentaBreadcrumbSegments(pathname, params)
	}
	return getEquipoBreadcrumbSegments(pathname, params)
}

export function BreadcrumbNav({ scope }: { scope: BreadcrumbScope }) {
	const pathname = usePathname()
	const params = useParams()
	const t = useTranslations('breadcrumbs')

	const rawId = params.id
	const idParam =
		typeof rawId === 'string'
			? rawId
			: Array.isArray(rawId) && rawId.length > 0 && typeof rawId[0] === 'string'
				? rawId[0]
				: undefined

	const segments = getSegments(scope, pathname, {
		id: idParam,
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
