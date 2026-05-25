'use client'

import type { Row } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { Checkbox } from '~/components/ui/checkbox'
import { useQueueBulkSelection } from './queue-bulk-selection-context'

export function QueueTableSelectCell<TData>({
	row,
	labelKey,
}: {
	row: Row<TData>
	labelKey: 'deductions-select-row' | 'installments-select-row'
}) {
	const t = useTranslations('equipo')
	const { scope, setScope, setPageSelectedViaHeader } = useQueueBulkSelection()

	return (
		<Checkbox
			checked={row.getIsSelected()}
			disabled={!row.getCanSelect()}
			onCheckedChange={(value) => {
				setPageSelectedViaHeader(false)
				if (scope === 'all_filtered') {
					setScope('page')
				}
				row.toggleSelected(!!value)
			}}
			aria-label={t(labelKey)}
		/>
	)
}
