'use client'

import { useTranslations } from 'next-intl'
import { EquipoQueueSubnav } from '~/components/app/equipo-queue-subnav'

export function InstallmentsSecondaryNav() {
	const t = useTranslations('equipo')
	return (
		<EquipoQueueSubnav
			ariaLabel={t('installments-subnav-aria')}
			items={[
				{
					href: '/equipo/installments',
					label: t('nav-installments-next-cutoff'),
					match: 'exact',
				},
				{
					href: '/equipo/installments/history',
					label: t('nav-installments-history'),
					match: 'prefix',
				},
				{
					href: '/equipo/installments/overdue',
					label: t('nav-installments-overdue'),
					match: 'prefix',
				},
			]}
		/>
	)
}
