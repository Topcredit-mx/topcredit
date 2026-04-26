import {
	calendarYmdInMexicoCity,
	endOfDayInstantMexicoCity,
	startOfDayInstantMexicoCity,
	ymdForDeductionSchedule,
} from '~/lib/calendar-date-tz'

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
	| 'equipo-credit-detail-deduction-overdue'
	| 'equipo-credit-detail-deduction-pending'
	| 'equipo-credit-detail-collection-awaiting-deduction'
	| 'equipo-credit-detail-collection-confirmed'
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

export type CreditDetailPaymentStatus = WorkflowStatusResolution & {
	context: CreditDetailStatusContext
}

/** Próximas colas deducciones / instalaciones (sin dimensión “hoy” en el badge). */
export function resolveQueueWorkflowStatus(params: {
	hrConfirmedAt: string | null
	installmentConfirmedAt: string | null
}): WorkflowStatusResolution {
	if (params.installmentConfirmedAt !== null) {
		return {
			tone: 'green',
			messageKey: 'equipo-workflow-status-confirmed',
		}
	}
	if (params.hrConfirmedAt !== null) {
		return {
			tone: 'blue',
			messageKey: 'equipo-workflow-status-installment-pending',
		}
	}
	return {
		tone: 'gray',
		messageKey: 'equipo-workflow-status-rh-pending',
	}
}

/**
 * On-time: confirmation instant is **on or before** 23:59:59.999 that calendar day
 * in `America/Mexico_City` (deduction / due deadline).
 */
export function isEquipoScheduleConfirmationOnTime(
	dueDate: Date | string,
	confirmedAt: Date | string,
): boolean {
	const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
	const conf =
		typeof confirmedAt === 'string' ? new Date(confirmedAt) : confirmedAt
	const ymd = ymdForDeductionSchedule(due)
	const deadline = endOfDayInstantMexicoCity(ymd)
	return conf.getTime() <= deadline.getTime()
}

export function resolveCreditDetailDeductionStatus(params: {
	hrConfirmedAt: Date | null
	dueDate: Date
	todayYmd: string | undefined
	/** For tests; default `new Date()`. "Overdue" = after Mexico EOD of due day. */
	now?: Date
}): CreditDetailPaymentStatus {
	const asOf = params.now ?? new Date()
	const dueYmdMx = ymdForDeductionSchedule(params.dueDate)
	const dueEod = endOfDayInstantMexicoCity(dueYmdMx)
	if (params.hrConfirmedAt === null) {
		const overdue = asOf.getTime() > dueEod.getTime()
		if (overdue) {
			return {
				tone: 'red',
				messageKey: 'equipo-credit-detail-deduction-overdue',
				context: { kind: 'due', dateIso: dueYmdMx },
			}
		}
		return {
			tone: 'amber',
			messageKey: 'equipo-credit-detail-deduction-pending',
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
	const startToday = startOfDayInstantMexicoCity(
		params.todayYmd ?? calendarYmdInMexicoCity(asOf),
	)
	const afterDueDay = asOf.getTime() > dueEod.getTime()
	const delayed =
		afterDueDay && params.hrConfirmedAt.getTime() < startToday.getTime()
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
