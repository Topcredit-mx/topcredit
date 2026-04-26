import { Decimal } from '~/lib/decimal'

const MXN_OPTIONS: Intl.NumberFormatOptions = {
	style: 'currency',
	currency: 'MXN',
}

export function formatCurrencyMxnE2e(value: string | number): string {
	const n = typeof value === 'number' ? value : Number(value)
	if (!Number.isFinite(n)) {
		return '—'
	}
	return n.toLocaleString('es-MX', MXN_OPTIONS)
}

export function sumAmountStringsMxnE2e(amounts: string[]): string {
	let acc = new Decimal(0)
	for (const a of amounts) {
		acc = acc.plus(new Decimal(a))
	}
	return formatCurrencyMxnE2e(acc.toFixed(2))
}
