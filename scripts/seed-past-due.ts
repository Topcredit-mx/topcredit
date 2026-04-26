import { ymdForDeductionSchedule } from '../src/lib/calendar-date-tz'
import { generatePaymentSchedule } from '../src/lib/payment-schedule'
import type { FirstDiscountHistoricAnchor } from './seed.fixtures'
import { resolveSeedFirstDiscountDate } from './seed-first-discount'

const SCHEDULE_STUB_PRINCIPAL = 10_000
const SCHEDULE_STUB_RATE = 0.02
const MONTHS_AGO_SCAN_MAX = 150

/** Compare Mexico business Y-M-D strings (lexicographic = chronological). */
function businessYmdKey(ymd: string): number {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
	if (m == null) return 0
	return Number(m[1]) * 10_000 + Number(m[2]) * 100 + Number(m[3])
}

export function countPastDuePaymentsInSchedule(
	schedule: ReadonlyArray<{ dueDate: Date }>,
	today: Date,
): number {
	const todayKey = businessYmdKey(ymdForDeductionSchedule(today))
	let n = 0
	for (const row of schedule) {
		if (businessYmdKey(ymdForDeductionSchedule(row.dueDate)) < todayKey) {
			n += 1
		}
	}
	return n
}

function pastDueCountForMonthsAgo(params: {
	today: Date
	salaryFrequency: 'monthly' | 'bi-monthly'
	historicAnchor: FirstDiscountHistoricAnchor
	duration: number
	durationType: 'monthly' | 'bi-monthly'
	monthsAgo: number
}): number {
	const first = resolveSeedFirstDiscountDate(
		'historic-offset',
		params.salaryFrequency,
		params.today,
		{
			monthsAgo: params.monthsAgo,
			historicAnchor: params.historicAnchor,
		},
	)
	if (first == null) {
		return 0
	}
	const schedule = generatePaymentSchedule({
		loanPrincipal: SCHEDULE_STUB_PRINCIPAL,
		rate: SCHEDULE_STUB_RATE,
		totalPayments: params.duration,
		frequency: params.durationType,
		firstDiscountDate: first,
	})
	return countPastDuePaymentsInSchedule(schedule, params.today)
}

export function tieBreakerFromEmail(email: string): number {
	let h = 0
	for (let i = 0; i < email.length; i++) {
		h = (h * 31 + email.charCodeAt(i)) | 0
	}
	return Math.abs(h)
}

export function findMonthsAgoForPastDueCount(params: {
	today: Date
	salaryFrequency: 'monthly' | 'bi-monthly'
	historicAnchor: FirstDiscountHistoricAnchor
	duration: number
	durationType: 'monthly' | 'bi-monthly'
	targetPastDue: number
	tieBreaker: number
}): number {
	const duration = params.duration
	if (duration < 1) {
		return 12
	}
	const target = Math.max(
		1,
		Math.min(duration, Math.floor(params.targetPastDue)),
	)
	const matches: number[] = []
	for (let monthsAgo = 1; monthsAgo <= MONTHS_AGO_SCAN_MAX; monthsAgo++) {
		const c = pastDueCountForMonthsAgo({
			today: params.today,
			salaryFrequency: params.salaryFrequency,
			historicAnchor: params.historicAnchor,
			duration,
			durationType: params.durationType,
			monthsAgo,
		})
		if (c === target) {
			matches.push(monthsAgo)
		}
	}
	if (matches.length > 0) {
		const idx = params.tieBreaker % matches.length
		const chosen = matches[idx]
		if (chosen != null) {
			return chosen
		}
		const fallback = matches[0]
		return fallback ?? 12
	}
	let bestMonths = 12
	let bestDist = Number.POSITIVE_INFINITY
	for (let monthsAgo = 1; monthsAgo <= MONTHS_AGO_SCAN_MAX; monthsAgo++) {
		const c = pastDueCountForMonthsAgo({
			today: params.today,
			salaryFrequency: params.salaryFrequency,
			historicAnchor: params.historicAnchor,
			duration,
			durationType: params.durationType,
			monthsAgo,
		})
		const dist = Math.abs(c - target)
		if (dist < bestDist || (dist === bestDist && monthsAgo < bestMonths)) {
			bestDist = dist
			bestMonths = monthsAgo
		}
	}
	return bestMonths
}
