import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

const MXN_OPTIONS: Intl.NumberFormatOptions = {
	style: 'currency',
	currency: 'MXN',
}

/**
 * Formats a numeric value as MXN currency for display. Returns "—" for
 * null, undefined, or invalid values so the UI never shows "NaN".
 */
export function formatCurrencyMxn(
	value: string | number | null | undefined,
): string {
	const n = typeof value === 'number' ? value : Number(value)
	if (!Number.isFinite(n)) {
		return '—'
	}
	return n.toLocaleString('es-MX', MXN_OPTIONS)
}
