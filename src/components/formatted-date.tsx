'use client'

import { useEffect, useState } from 'react'

const LOCALE = 'es-MX'

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
