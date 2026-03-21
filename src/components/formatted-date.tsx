'use client'

import { useEffect, useState } from 'react'

const LOCALE = 'es-MX'

/** Shown until client-only format runs (avoids SSR vs browser TZ mismatch). */
const PLACEHOLDER = '\u2014'

const DATE_ONLY_OPTIONS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
}

const DATETIME_SHORT_OPTIONS: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	hour: 'numeric',
	minute: '2-digit',
}

const DATETIME_FULL_OPTIONS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	second: '2-digit',
}

function toDate(value: Date | string): Date {
	return typeof value === 'string' ? new Date(value) : value
}

/**
 * Formats in the **runtime** default timezone (`Intl`: browser = user's local zone).
 * Only call from `useEffect` so this runs in the browser, not during SSR.
 */
function formatDate(
	value: Date | string,
	kind: 'date' | 'datetime' | 'datetime-short',
): string {
	const date = toDate(value)
	if (kind === 'datetime') {
		return date.toLocaleString(LOCALE, DATETIME_FULL_OPTIONS)
	}
	if (kind === 'datetime-short') {
		return date.toLocaleString(LOCALE, DATETIME_SHORT_OPTIONS)
	}
	return date.toLocaleDateString(LOCALE, DATE_ONLY_OPTIONS)
}

export interface FormattedDateProps {
	/** Date to format (Date instance or ISO string). */
	value: Date | string
	/** 'date' = short date, 'datetime' = full locale date + time, 'datetime-short' = compact date + time. */
	format?: 'date' | 'datetime' | 'datetime-short'
	className?: string
}

/**
 * Renders a date in `es-MX` using the **viewer's local timezone** (browser default).
 * SSR and first client paint show an em dash placeholder so HTML matches; after mount
 * the formatted string appears (tiny flash, no ISO string, no hydration mismatch).
 */
export function FormattedDate({
	value,
	format = 'date',
	className,
}: FormattedDateProps) {
	const [display, setDisplay] = useState(PLACEHOLDER)

	useEffect(() => {
		setDisplay(formatDate(value, format))
	}, [value, format])

	return <span className={className}>{display}</span>
}
