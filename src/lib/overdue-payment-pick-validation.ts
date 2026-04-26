import type { OverduePaymentLine } from '~/server/queries'

export type OverduePaymentPickGroup = {
	payments: OverduePaymentLine[]
}

function parseDueDateToUtcMs(dueDate: string): number | null {
	const d = dueDate.slice(0, 10)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
		return null
	}
	const parts = d.split('-').map((s) => Number(s))
	const y = parts[0]
	const m = parts[1]
	const day = parts[2]
	if (y === undefined || m === undefined || day === undefined) {
		return null
	}
	const t = Date.UTC(y, m - 1, day)
	return Number.isNaN(t) ? null : t
}

export function isOverduePaymentPickSelectionContiguous(
	groups: OverduePaymentPickGroup[],
	selected: ReadonlySet<number>,
): boolean {
	for (const g of groups) {
		const lines = g.payments
		const selectedInGroup = lines.filter((p) => selected.has(p.id))
		if (selectedInGroup.length === 0) {
			continue
		}
		const firstIdx = lines.findIndex((p) => selected.has(p.id))
		let lastIdx = -1
		for (let i = lines.length - 1; i >= 0; i--) {
			const p = lines[i]
			if (p !== undefined && selected.has(p.id)) {
				lastIdx = i
				break
			}
		}
		if (firstIdx < 0 || lastIdx < 0) {
			return false
		}
		for (let i = firstIdx; i <= lastIdx; i++) {
			const line = lines[i]
			if (line === undefined || !selected.has(line.id)) {
				return false
			}
		}
	}
	return true
}

export function overduePaymentPickLinesSortedByDueDate(
	lines: OverduePaymentLine[],
): OverduePaymentLine[] {
	return [...lines].sort((a, b) => {
		const ta = parseDueDateToUtcMs(a.dueDate)
		const tb = parseDueDateToUtcMs(b.dueDate)
		if (ta !== null && tb !== null && ta !== tb) {
			return ta - tb
		}
		return a.id - b.id
	})
}

export type PaymentLineForCreditContiguity = {
	paymentId: number
	creditId: number
	dueDate: Date | string
}

function lineFromPaymentRow(
	row: PaymentLineForCreditContiguity,
): OverduePaymentLine {
	const d = row.dueDate
	const dueDate =
		d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
	return { id: row.paymentId, dueDate, amount: '' }
}

export function paymentIdsFormContiguousSelectionByCredit(
	rows: readonly PaymentLineForCreditContiguity[],
	selectedIds: ReadonlySet<number>,
): boolean {
	const byCredit = new Map<number, OverduePaymentLine[]>()
	for (const r of rows) {
		const line = lineFromPaymentRow(r)
		const existing = byCredit.get(r.creditId)
		if (existing) {
			existing.push(line)
		} else {
			byCredit.set(r.creditId, [line])
		}
	}
	const groups: OverduePaymentPickGroup[] = []
	for (const payments of byCredit.values()) {
		groups.push({
			payments: overduePaymentPickLinesSortedByDueDate(payments),
		})
	}
	return isOverduePaymentPickSelectionContiguous(groups, selectedIds)
}
