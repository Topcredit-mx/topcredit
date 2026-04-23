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
	| 'equipo-credit-detail-collection-awaiting-deduction'

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

export function resolveCreditDetailDeductionStatus(params: {
	hrConfirmedAt: Date | null
	dueDate: Date
	todayYmd: string | undefined
}): WorkflowStatusResolution {
	const dueYmd = params.dueDate.toISOString().slice(0, 10)
	if (params.hrConfirmedAt === null) {
		const overdue = params.todayYmd !== undefined && dueYmd < params.todayYmd
		if (overdue) {
			return {
				tone: 'red',
				messageKey: 'equipo-workflow-status-hr-overdue',
			}
		}
		return {
			tone: 'amber',
			messageKey: 'equipo-workflow-status-rh-pending-detail',
		}
	}
	return {
		tone: 'green',
		messageKey: 'equipo-credit-detail-deduction-confirmed',
	}
}

export function resolveCreditDetailCollectionStatus(params: {
	hrConfirmedAt: Date | null
	installmentConfirmedAt: Date | null
	dueDate: Date
	todayYmd: string | undefined
}): WorkflowStatusResolution {
	if (params.installmentConfirmedAt !== null) {
		return {
			tone: 'green',
			messageKey: 'equipo-workflow-status-confirmed',
		}
	}
	if (params.hrConfirmedAt === null) {
		return {
			tone: 'gray',
			messageKey: 'equipo-credit-detail-collection-awaiting-deduction',
		}
	}
	const dueYmd = params.dueDate.toISOString().slice(0, 10)
	const delayed = params.todayYmd !== undefined && dueYmd < params.todayYmd
	if (delayed) {
		return {
			tone: 'amber_dark',
			messageKey: 'equipo-workflow-status-installment-delayed',
		}
	}
	return {
		tone: 'blue',
		messageKey: 'equipo-workflow-status-installment-pending',
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
