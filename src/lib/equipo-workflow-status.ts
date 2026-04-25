import { calendarYmdInMexicoCity } from '~/lib/calendar-date-tz'

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

function dateOnlyIso(d: Date): string {
	return d.toISOString().slice(0, 10)
}

function isCalendarDayAfter(confirmYmd: string, dueYmd: string): boolean {
	return confirmYmd > dueYmd
}

export function resolveCreditDetailDeductionStatus(params: {
	hrConfirmedAt: Date | null
	dueDate: Date
	todayYmd: string | undefined
}): CreditDetailPaymentStatus {
	const dueYmd = dateOnlyIso(params.dueDate)
	if (params.hrConfirmedAt === null) {
		const overdue = params.todayYmd !== undefined && dueYmd < params.todayYmd
		if (overdue) {
			return {
				tone: 'red',
				messageKey: 'equipo-credit-detail-deduction-overdue',
				context: { kind: 'due', dateIso: dueYmd },
			}
		}
		return {
			tone: 'amber',
			messageKey: 'equipo-credit-detail-deduction-pending',
			context: { kind: 'due', dateIso: dueYmd },
		}
	}
	const dueScheduleYmd = dateOnlyIso(params.dueDate)
	const confirmedYmdMx = calendarYmdInMexicoCity(params.hrConfirmedAt)
	const confirmedLate = isCalendarDayAfter(confirmedYmdMx, dueScheduleYmd)
	const confirmedYmd = dateOnlyIso(params.hrConfirmedAt)
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
}): CreditDetailPaymentStatus {
	if (params.installmentConfirmedAt !== null) {
		const dueScheduleYmd = dateOnlyIso(params.dueDate)
		const confirmedYmdMx = calendarYmdInMexicoCity(
			params.installmentConfirmedAt,
		)
		const confirmedLate = isCalendarDayAfter(confirmedYmdMx, dueScheduleYmd)
		const confirmedYmd = dateOnlyIso(params.installmentConfirmedAt)
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
	const dueYmd = dateOnlyIso(params.dueDate)
	const delayed = params.todayYmd !== undefined && dueYmd < params.todayYmd
	if (delayed) {
		return {
			tone: 'amber_dark',
			messageKey: 'equipo-credit-detail-collection-delayed',
			context: { kind: 'due', dateIso: dueYmd },
		}
	}
	return {
		tone: 'blue',
		messageKey: 'equipo-credit-detail-collection-pending',
		context: { kind: 'due', dateIso: dueYmd },
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
		: { tone: 'red', messageKey: 'equipo-workflow-history-late' }
}
