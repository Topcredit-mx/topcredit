'use client'

import { DataTableContent } from '~/components/ui/data-table'
import { QueueBulkSelectionTableRow } from './queue-bulk-selection-table-row'

export function QueueDataTableContent() {
	return <DataTableContent prependBodyRows={<QueueBulkSelectionTableRow />} />
}
