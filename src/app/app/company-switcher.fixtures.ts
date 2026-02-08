/**
 * Test fixtures for company switcher E2E (US-2.2.3)
 */

export const employeeWithAssignments = {
	name: 'Employee With Companies',
	email: 'employee.switcher@example.com',
	roles: ['employee'] as const,
}

/** Assigned to employee: active */
export const companyAssignedActive = {
	name: 'Assigned Active Co',
	domain: 'assigned-active-switcher.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

/** Assigned to employee: active (second) */
export const companyAssignedActive2 = {
	name: 'Beta Corp',
	domain: 'beta-corp-switcher.com',
	rate: '0.0280',
	employeeSalaryFrequency: 'bi-monthly' as const,
	active: true,
}

/** Assigned to employee: inactive (shown but disabled in switcher) */
export const companyAssignedInactive = {
	name: 'Assigned Inactive Co',
	domain: 'assigned-inactive-switcher.com',
	rate: '0.0200',
	employeeSalaryFrequency: 'monthly' as const,
	active: false,
}

/** Not assigned to employee - must not appear in switcher */
export const companyUnassigned = {
	name: 'Unassigned Company',
	domain: 'unassigned-switcher.com',
	rate: '0.0300',
	employeeSalaryFrequency: 'bi-monthly' as const,
	active: true,
}

export const switcherCompanyList = [
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	companyUnassigned,
]
