declare namespace Cypress {
	interface Chainable {
		login(email: string): Chainable<void>
		/**
		 * Interact with a Radix UI Select component.
		 * @param selector - name attribute, label text, or CSS selector
		 * @param optionText - visible text of the option to select
		 * @example cy.selectRadix('employeeSalaryFrequency', 'Mensual')
		 */
		selectRadix(selector: string, optionText: string): Chainable<void>
		findTableRow(name: string): Chainable<JQuery<HTMLTableRowElement>>
		task(event: 'login', params: string): Chainable<string>
		task(
			event: 'createUser',
			params: CreateUserTaskParams,
		): Chainable<{ id: number }>
		task(
			event: 'createCompany',
			params: CreateCompanyTaskParams,
		): Chainable<{ id: number }>
		task(
			event: 'createTerm',
			params: CreateTermTaskParams,
		): Chainable<{ id: number }>
		task(
			event: 'createTermOffering',
			params: CreateTermOfferingTaskParams,
		): Chainable<{ id: number }>
		task(event: 'getUserIdByEmail', email: string): Chainable<number | null>
		task(
			event: 'deleteCreditsByBorrowerId',
			userId: number,
		): Chainable<null>
		task(event: 'deleteUsersByEmail', emails: string[]): Chainable<null>
		task(
			event: 'deleteCompaniesByDomain',
			domains: string[],
		): Chainable<null>
		task(
			event: 'createCredit',
			params: CreateCreditTaskParams,
		): Chainable<{ id: number }>
	}
}

type CreateUserTaskParams = {
	name: string
	email: string
	roles?: Array<'applicant' | 'agent' | 'requests' | 'admin'>
	/** Default true. Set false for verification-specific E2E tests. */
	verified?: boolean
}

type CreateCompanyTaskParams = {
	name: string
	domain: string
	rate: string
	borrowingCapacityRate?: string | null
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
	active?: boolean
}

type CreateTermTaskParams = {
	durationType: 'bi-monthly' | 'monthly'
	duration: number
}

type CreateTermOfferingTaskParams = {
	companyId: number
	termId: number
	disabled?: boolean
}

type CreateCreditTaskParams = {
	borrowerId: number
	termOfferingId: number
	creditAmount: string
	salaryAtApplication: string
	status?:
		| 'new'
		| 'pending'
		| 'invalid-documentation'
		| 'authorized'
		| 'denied'
		| 'dispersed'
		| 'settled'
		| 'defaulted'
}
