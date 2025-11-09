declare namespace Cypress {
	interface Chainable {
		login(email: string): Chainable<Element>
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
