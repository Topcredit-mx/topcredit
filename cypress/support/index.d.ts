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
		task(event: 'deleteUser', params: string): Chainable<null>
	}
}

type CreateUserTaskParams = {
	name: string
	email: string
	roles?: Array<
		| 'customer'
		| 'sales_rep'
		| 'credit_analyst'
		| 'accountant'
		| 'support'
		| 'admin'
	>
}
