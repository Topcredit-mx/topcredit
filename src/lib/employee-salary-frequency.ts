export function employeeSalaryFrequencyFromDb(
	value: unknown,
): 'monthly' | 'bi-monthly' {
	if (value === 'monthly') return 'monthly'
	if (value === 'bi-monthly') return 'bi-monthly'
	return 'monthly'
}
