'use client'

import { useTranslations } from 'next-intl'
import { EquipoQueueSubnav } from '~/components/app/equipo-queue-subnav'

export function DeductionsSecondaryNav() {
	const t = useTranslations('equipo')
	return (
		<EquipoQueueSubnav
			ariaLabel={t('deductions-subnav-aria')}
			items={[
				{
					href: '/equipo/deductions',
					label: t('nav-deductions-next-cutoff'),
					match: 'exact',
				},
				{
					href: '/equipo/deductions/history',
					label: t('nav-deductions-history'),
					match: 'prefix',
				},
				{
					href: '/equipo/deductions/overdue',
					label: t('nav-deductions-overdue'),
					match: 'prefix',
				},
			]}
		/>
	)
}
