'use client'

import { useEffect, useState } from 'react'

const LOCALE = 'es-MX'

const PLACEHOLDER = '\u2014'

const MEXICO_TZ = 'America/Mexico_City'

const DATE_ONLY_OPTIONS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
}

const DATETIME_SHORT_OPTIONS: Intl.DateTimeFormatOptions = {
	timeZone: MEXICO_TZ,
	day: 'numeric',
	month: 'short',
	hour: 'numeric',
	minute: '2-digit',
}

const DATETIME_FULL_OPTIONS: Intl.DateTimeFormatOptions = {
	timeZone: MEXICO_TZ,
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	second: '2-digit',
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function toDate(value: Date | string): Date {
	if (typeof value === 'string') {
		// Date-only strings (YYYY-MM-DD) represent a calendar date with no time
		// component. Parsing them with `new Date()` treats them as UTC midnight,
		// which then shifts to the previous day in negative-offset timezones when
		// formatted with toLocaleDateString. Constructing with local parts avoids
		// the shift.
		if (DATE_ONLY_RE.test(value)) {
			const parts = value.split('-').map(Number)
			return new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1)
		}
		return new Date(value)
	}
	return value
}

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
	value: Date | string
	format?: 'date' | 'datetime' | 'datetime-short'
	className?: string
}

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
