'use client'

import { useEffect, useState } from 'react'

const LOCALE = 'es-MX'

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

function toDate(value: Date | string): Date {
	return typeof value === 'string' ? new Date(value) : value
}

function formatDate(
	value: Date | string,
	kind: 'date' | 'datetime' | 'datetime-short',
): string {
	const date = toDate(value)
	if (kind === 'datetime') {
		return date.toLocaleString(LOCALE)
	}
	if (kind === 'datetime-short') {
		return date.toLocaleDateString(LOCALE, DATETIME_SHORT_OPTIONS)
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
 * Renders a date in es-MX locale. Formatted only on the client to avoid
 * server/client hydration mismatch (timezone differs between Node and browser).
 * Server and first client paint show ISO date string; after mount shows formatted.
 */
export function FormattedDate({
	value,
	format = 'date',
	className,
}: FormattedDateProps) {
	const date = toDate(value)
	const iso = date.toISOString()
	const [display, setDisplay] = useState<string>(() =>
		format === 'date' ? iso.slice(0, 10) : iso,
	)

	useEffect(() => {
		setDisplay(formatDate(value, format))
	}, [value, format])

	return <span className={className}>{display}</span>
}
