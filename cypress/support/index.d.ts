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
			event: 'resetUser',
			params: ResetUserTaskParams,
		): Chainable<{ id: number }>
		task(
			event: 'resetCompany',
			params: ResetCompanyTaskParams,
		): Chainable<{ id: number }>
		task(event: 'getUserIdByEmail', email: string): Chainable<number | null>
		task(
			event: 'deleteApplicationsByApplicantId',
			applicantId: number,
		): Chainable<null>
		task(
			event: 'assignCompanyToUser',
			params: AssignCompanyToUserTaskParams,
		): Chainable<null>
		task(
			event: 'deleteUserCompanyAssignmentsByEmail',
			emails: string[],
		): Chainable<null>
		task(event: 'deleteUsersByEmail', emails: string[]): Chainable<null>
		task(event: 'deleteCompaniesByDomain', domains: string[]): Chainable<null>
		task(event: 'assignRole', params: AssignRoleTaskParams): Chainable<null>
		task(event: 'removeRole', params: RemoveRoleTaskParams): Chainable<null>
		task(event: 'enableTotpForUser', email: string): Chainable<null>
		task(
			event: 'resetApplicantApplication',
			params: ResetApplicantApplicationTaskParams,
		): Chainable<{ id: number }>
		task(
			event: 'seedLoginFlow',
		): Chainable<import('../tasks').SeedLoginFlowResult>
		task(
			event: 'cleanupLoginFlow',
			params: import('../tasks').CleanupLoginFlowParams,
		): Chainable<null>
		task(
			event: 'seedCuentaApplications',
		): Chainable<import('../tasks').SeedCuentaApplicationsResult>
		task(
			event: 'cleanupCuentaApplications',
			params: import('../tasks').CleanupCuentaApplicationsParams,
		): Chainable<null>
		task(
			event: 'seedCompanySwitcher',
		): Chainable<import('../tasks').SeedCompanySwitcherResult>
		task(event: 'cleanupCompanySwitcher'): Chainable<null>
		task(
			event: 'seedAdminUsers',
		): Chainable<import('../tasks').SeedAdminUsersResult>
		task(event: 'cleanupAdminUsers'): Chainable<null>
		task(
			event: 'seedAdminCompanies',
		): Chainable<import('../tasks').SeedAdminCompaniesResult>
		task(event: 'cleanupAdminCompanies'): Chainable<null>
		task(event: 'seedAdminOverview'): Chainable<null>
		task(event: 'cleanupAdminOverview'): Chainable<null>
		task(event: 'seedAgentNoAssignments'): Chainable<null>
		task(event: 'cleanupAgentNoAssignments'): Chainable<null>
		task(event: 'seedSecurity'): Chainable<null>
		task(event: 'cleanupSecurity'): Chainable<null>
		task(event: 'seedProfile'): Chainable<null>
		task(event: 'cleanupProfile'): Chainable<null>
		task(
			event: 'seedApplicationsReview',
		): Chainable<import('../tasks').SeedApplicationsReviewResult>
		task(
			event: 'cleanupApplicationsReview',
			params: import('../tasks').CleanupApplicationsReviewParams,
		): Chainable<null>
		task(
			event: 'insertApplicationDocument',
			params: import('../tasks').InsertApplicationDocumentTaskParams,
		): Chainable<{ id: number }>
	}
}

type AssignCompanyToUserTaskParams = {
	userEmail: string
	companyDomain: string
}

type ResetUserTaskParams = {
	name: string
	email: string
	roles?: ReadonlyArray<'applicant' | 'agent' | 'requests' | 'admin'>
	verified?: boolean
}

type ResetCompanyTaskParams = {
	name: string
	domain: string
	rate: string
	borrowingCapacityRate?: string | null
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
	active?: boolean
}

type AssignRoleTaskParams = {
	email: string
	role: 'applicant' | 'agent' | 'requests' | 'admin'
}

type RemoveRoleTaskParams = {
	email: string
	role: 'applicant' | 'agent' | 'requests' | 'admin'
}

type ResetApplicantApplicationTaskParams = {
	applicantId: number
	termOfferingId: number
	creditAmount: string
	salaryAtApplication: string
	salaryFrequency?: 'monthly' | 'bi-monthly'
	status?:
		| 'new'
		| 'pending'
		| 'invalid-documentation'
		| 'pre-authorized'
		| 'authorized'
		| 'denied'
}
