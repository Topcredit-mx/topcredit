import {
	assertValidPayrollDueDates,
	type SalaryFrequency,
} from '~/lib/payroll-due-date-validation'

export function assertSeedPayrollDueDates(
	frequency: SalaryFrequency,
	dueDates: readonly Date[],
): void {
	assertValidPayrollDueDates(frequency, dueDates)
}
