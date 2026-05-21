import {
	calendarYmdInMexicoCity,
	endOfDayInstantMexicoCity,
	startOfDayInstantMexicoCity,
	ymdForDeductionSchedule,
} from '~/lib/calendar-date-tz'
import {
	OVERDUE_GRACE_PERIOD_DAYS,
	overdueGraceCutoff,
} from '~/lib/overdue-grace'

export { OVERDUE_GRACE_PERIOD_DAYS, overdueGraceCutoff }

export type WorkflowTone =
	| 'green'
	| 'blue'
	| 'gray'
	| 'red'
	| 'amber'
	| 'amber_dark'

export type EquipoWorkflowMessageKey =
	| 'equipo-workflow-status-confirmed'
	| 'equipo-workflow-status-installment-pending'
	| 'equipo-workflow-status-rh-pending'
	| 'equipo-workflow-status-hr-overdue'
	| 'equipo-workflow-status-rh-pending-detail'
	| 'equipo-workflow-status-installment-delayed'
	| 'equipo-workflow-status-overdue-deduction'
	| 'equipo-workflow-history-on-time'
	| 'equipo-workflow-history-late'
	| 'equipo-credit-detail-deduction-confirmed'
	| 'equipo-credit-detail-deduction-grace-pending'
	| 'equipo-credit-detail-deduction-overdue'
	| 'equipo-credit-detail-deduction-pending'
	| 'equipo-credit-detail-collection-awaiting-deduction'
	| 'equipo-credit-detail-collection-confirmed'
	| 'equipo-credit-detail-collection-grace-pending'
	| 'equipo-credit-detail-collection-liquidation-settled'
	| 'equipo-credit-detail-collection-delayed'
	| 'equipo-credit-detail-collection-pending'

export const workflowToneClassName: Record<WorkflowTone, string> = {
	green: 'bg-green-100 text-green-800',
	blue: 'bg-blue-100 text-blue-800',
	gray: 'bg-gray-100 text-gray-600',
	red: 'bg-red-100 text-red-700',
	amber: 'bg-amber-100 text-amber-800',
	amber_dark: 'bg-amber-100 text-amber-900',
}

export type WorkflowStatusResolution = {
	tone: WorkflowTone
	messageKey: EquipoWorkflowMessageKey
}

export type CreditDetailStatusContext =
	| { kind: 'none' }
	| { kind: 'due'; dateIso: string }
	| {
			kind: 'hrConfirmed'
			dateIso: string
			confirmedLate: boolean
			confirmedAtIso: string
	  }
	| {
			kind: 'installmentConfirmed'
			dateIso: string
			confirmedLate: boolean
			confirmedAtIso: string
	  }
	| {
			kind: 'liquidationSettled'
			dateIso: string
			clearedAtIso: string
	  }

export type CreditDetailPaymentStatus = WorkflowStatusResolution & {
	context: CreditDetailStatusContext
}

const YMD_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Y-M-D of the schedule due, for "deadline" = EOD that day in Mexico.
 * Avoids `new Date("YYYY-MM-DD")` (UTC-midnight) vs EOD-CDMX `Date` mismatches.
 */
function ymdForScheduleDue(dueDate: Date | string): string {
	if (typeof dueDate === 'string') {
		const t = dueDate.trim()
		if (YMD_ONLY_RE.test(t)) {
			return t
		}
	}
	const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
	return ymdForDeductionSchedule(due)
}

/**
 * On-time: confirmation instant is **on or before** 23:59:59.999 that calendar day
 * in `America/Mexico_City` (deduction / due deadline).
 */
export function isEquipoScheduleConfirmationOnTime(
	dueDate: Date | string,
	confirmedAt: Date | string,
): boolean {
	const ymd = ymdForScheduleDue(dueDate)
	const deadline = endOfDayInstantMexicoCity(ymd)
	const conf =
		typeof confirmedAt === 'string' ? new Date(confirmedAt) : confirmedAt
	return conf.getTime() <= deadline.getTime()
}

export function resolveCreditDetailDeductionStatus(params: {
	hrConfirmedAt: Date | null
	dueDate: Date
	todayYmd: string | undefined
	/** For tests; default `new Date()`. */
	now?: Date
}): CreditDetailPaymentStatus {
	const asOf = params.now ?? new Date()
	const dueYmdMx = ymdForDeductionSchedule(params.dueDate)
	const dueEod = endOfDayInstantMexicoCity(dueYmdMx)
	const todayYmdMx =
		params.todayYmd !== undefined && YMD_ONLY_RE.test(params.todayYmd.trim())
			? params.todayYmd.trim()
			: calendarYmdInMexicoCity(asOf)
	const graceCutoff = overdueGraceCutoff(todayYmdMx)
	if (params.hrConfirmedAt === null) {
		if (asOf.getTime() <= dueEod.getTime()) {
			return {
				tone: 'amber',
				messageKey: 'equipo-credit-detail-deduction-pending',
				context: { kind: 'due', dateIso: dueYmdMx },
			}
		}
		if (params.dueDate.getTime() < graceCutoff.getTime()) {
			return {
				tone: 'red',
				messageKey: 'equipo-credit-detail-deduction-overdue',
				context: { kind: 'due', dateIso: dueYmdMx },
			}
		}
		return {
			tone: 'amber',
			messageKey: 'equipo-credit-detail-deduction-grace-pending',
			context: { kind: 'due', dateIso: dueYmdMx },
		}
	}
	const confirmedLate = !isEquipoScheduleConfirmationOnTime(
		params.dueDate,
		params.hrConfirmedAt,
	)
	const confirmedYmd = calendarYmdInMexicoCity(params.hrConfirmedAt)
	return {
		tone: confirmedLate ? 'amber' : 'green',
		messageKey: 'equipo-credit-detail-deduction-confirmed',
		context: {
			kind: 'hrConfirmed',
			dateIso: confirmedYmd,
			confirmedLate,
			confirmedAtIso: params.hrConfirmedAt.toISOString(),
		},
	}
}

export function resolveCreditDetailCollectionStatus(params: {
	hrConfirmedAt: Date | null
	installmentConfirmedAt: Date | null
	closedByLiquidationAt?: Date | null
	dueDate: Date
	todayYmd: string | undefined
	now?: Date
}): CreditDetailPaymentStatus {
	if (params.installmentConfirmedAt !== null) {
		const confirmedLate = !isEquipoScheduleConfirmationOnTime(
			params.dueDate,
			params.installmentConfirmedAt,
		)
		const confirmedYmd = calendarYmdInMexicoCity(params.installmentConfirmedAt)
		return {
			tone: confirmedLate ? 'amber' : 'green',
			messageKey: 'equipo-credit-detail-collection-confirmed',
			context: {
				kind: 'installmentConfirmed',
				dateIso: confirmedYmd,
				confirmedLate,
				confirmedAtIso: params.installmentConfirmedAt.toISOString(),
			},
		}
	}
	if (params.closedByLiquidationAt != null) {
		const clearedYmd = calendarYmdInMexicoCity(params.closedByLiquidationAt)
		return {
			tone: 'gray',
			messageKey: 'equipo-credit-detail-collection-liquidation-settled',
			context: {
				kind: 'liquidationSettled',
				dateIso: clearedYmd,
				clearedAtIso: params.closedByLiquidationAt.toISOString(),
			},
		}
	}
	if (params.hrConfirmedAt === null) {
		return {
			tone: 'gray',
			messageKey: 'equipo-credit-detail-collection-awaiting-deduction',
			context: { kind: 'none' },
		}
	}
	const asOf = params.now ?? new Date()
	const dueYmdMx = ymdForDeductionSchedule(params.dueDate)
	const dueEod = endOfDayInstantMexicoCity(dueYmdMx)
	const todayYmdMx =
		params.todayYmd !== undefined && YMD_ONLY_RE.test(params.todayYmd.trim())
			? params.todayYmd.trim()
			: calendarYmdInMexicoCity(asOf)
	const graceCutoff = overdueGraceCutoff(todayYmdMx)
	const startToday = startOfDayInstantMexicoCity(todayYmdMx)
	const afterDueDay = asOf.getTime() > dueEod.getTime()
	const rhConfirmedBeforeToday =
		params.hrConfirmedAt.getTime() < startToday.getTime()
	if (
		afterDueDay &&
		params.dueDate.getTime() >= graceCutoff.getTime() &&
		rhConfirmedBeforeToday
	) {
		return {
			tone: 'amber',
			messageKey: 'equipo-credit-detail-collection-grace-pending',
			context: { kind: 'due', dateIso: dueYmdMx },
		}
	}
	const delayed =
		afterDueDay &&
		rhConfirmedBeforeToday &&
		params.dueDate.getTime() < graceCutoff.getTime()
	if (delayed) {
		return {
			tone: 'amber_dark',
			messageKey: 'equipo-credit-detail-collection-delayed',
			context: { kind: 'due', dateIso: dueYmdMx },
		}
	}
	return {
		tone: 'blue',
		messageKey: 'equipo-credit-detail-collection-pending',
		context: { kind: 'due', dateIso: dueYmdMx },
	}
}

function dueInstantForQueueRow(dueDate: Date | string): Date {
	if (typeof dueDate === 'string') {
		const t = dueDate.trim()
		if (YMD_ONLY_RE.test(t)) {
			return endOfDayInstantMexicoCity(t)
		}
		const d = new Date(t)
		if (Number.isNaN(d.getTime())) {
			throw new RangeError(
				`resolveQueueWorkflowStatus: unparseable dueDate "${dueDate}"`,
			)
		}
		return d
	}
	if (Number.isNaN(dueDate.getTime())) {
		throw new RangeError('resolveQueueWorkflowStatus: invalid dueDate Date')
	}
	return dueDate
}

export function scheduleDueYmdFromQueueDueField(
	dueDate: Date | string,
): string {
	return ymdForDeductionSchedule(dueInstantForQueueRow(dueDate))
}

export function isGraceWorkflowMessageKey(
	messageKey: EquipoWorkflowMessageKey,
): boolean {
	return (
		messageKey === 'equipo-credit-detail-deduction-grace-pending' ||
		messageKey === 'equipo-credit-detail-collection-grace-pending'
	)
}

/** Próximas colas deducciones / instalaciones (sin dimensión “hoy” en el badge). */
export function resolveQueueWorkflowStatus(params: {
	hrConfirmedAt: string | null
	installmentConfirmedAt: string | null
	dueDate: Date | string
	now?: Date
}): WorkflowStatusResolution {
	const asOf = params.now ?? new Date()
	const dueDate = dueInstantForQueueRow(params.dueDate)

	if (params.installmentConfirmedAt !== null) {
		return {
			tone: 'green',
			messageKey: 'equipo-workflow-status-confirmed',
		}
	}

	const todayYmdMx = calendarYmdInMexicoCity(asOf)
	const graceCutoff = overdueGraceCutoff(todayYmdMx)
	const dueYmdMx = ymdForDeductionSchedule(dueDate)
	const dueEod = endOfDayInstantMexicoCity(dueYmdMx)

	if (params.hrConfirmedAt === null) {
		if (
			asOf.getTime() > dueEod.getTime() &&
			dueDate.getTime() >= graceCutoff.getTime()
		) {
			return {
				tone: 'amber',
				messageKey: 'equipo-credit-detail-deduction-grace-pending',
			}
		}
		return {
			tone: 'gray',
			messageKey: 'equipo-workflow-status-rh-pending',
		}
	}

	const hrAt = new Date(params.hrConfirmedAt)
	if (Number.isNaN(hrAt.getTime())) {
		throw new RangeError(
			`resolveQueueWorkflowStatus: invalid hrConfirmedAt "${params.hrConfirmedAt}"`,
		)
	}

	const collection = resolveCreditDetailCollectionStatus({
		hrConfirmedAt: hrAt,
		installmentConfirmedAt: null,
		closedByLiquidationAt: null,
		dueDate,
		todayYmd: undefined,
		now: asOf,
	})
	return {
		tone: collection.tone,
		messageKey: collection.messageKey,
	}
}

export function resolveOverdueInstallmentWorkflowStatus(
	blockingParty: 'hr' | 'installments',
): WorkflowStatusResolution {
	if (blockingParty === 'hr') {
		return {
			tone: 'gray',
			messageKey: 'equipo-workflow-status-rh-pending',
		}
	}
	return {
		tone: 'blue',
		messageKey: 'equipo-workflow-status-installment-pending',
	}
}

/** Deducciones atrasadas: siempre RH sin confirmar en filas del listado. */
export function resolveOverdueDeductionWorkflowStatus(): WorkflowStatusResolution {
	return {
		tone: 'red',
		messageKey: 'equipo-workflow-status-overdue-deduction',
	}
}

export function historyTimingStatus(
	confirmedOnTime: boolean,
): WorkflowStatusResolution {
	return confirmedOnTime
		? { tone: 'green', messageKey: 'equipo-workflow-history-on-time' }
		: { tone: 'amber', messageKey: 'equipo-workflow-history-late' }
}
