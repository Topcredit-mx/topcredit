Cypress.Commands.add('login', (email: string) => {
	cy.task('login', email).then((token) => {
		cy.setCookie('next-auth.session-token', token)
	})
})

/**
 * Interact with a Radix UI Select component.
 * Radix Select doesn't render as native <select>, so we need to:
 * 1. Click the trigger button
 * 2. Wait for portal content
 * 3. Click the option by text
 *
 * @param selector - Can be:
 *   - name attribute: 'employeeSalaryFrequency'
 *   - label text: 'Frecuencia de Pago' (multi-word forces label)
 *   - label: prefix for single-word labels: 'label:Plazo'
 *   - CSS selector: '[name="employeeSalaryFrequency"]'
 * @param optionText - The visible text of the option to select
 *
 * @example
 * cy.selectRadix('employeeSalaryFrequency', 'Mensual')
 * cy.selectRadix('Frecuencia de Pago', 'Quincenal')
 * cy.selectRadix('label:Plazo', 'Mensual - 12 meses')
 * cy.selectRadix('[name="status"]', 'Active')
 */
Cypress.Commands.add('selectRadix', (selector: string, optionText: string) => {
	const byLabel = selector.startsWith('label:')
	const labelText = byLabel ? selector.slice(6) : selector

	// Find trigger - try multiple strategies
	if (selector.startsWith('[') || selector.startsWith('.')) {
		// CSS selector provided directly
		cy.get(selector).click()
	} else if (!byLabel && selector.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/)) {
		// Looks like a name attribute (no spaces, starts with letter)
		// Exclude hidden inputs - we want the visible SelectTrigger, not hidden form inputs
		cy.get(`[name="${selector}"]:not(input[type="hidden"])`).click()
	} else {
		// Label text (or label:...) - find label, then trigger inside same field
		cy.contains('label', new RegExp(labelText, 'i'))
			.closest('[data-slot="field"]')
			.find('[data-slot="select-trigger"], button')
			.first()
			.click()
	}

	// Wait for portal content to be visible
	cy.get('[data-slot="select-content"]').should('be.visible')

	// Click the option by text content
	cy.contains('[data-slot="select-item"]', optionText).click()
})

/**
 * Find a table row by cell text, scoped to the main data table.
 * @param name - Cell text that uniquely identifies the row (e.g. company or user name).
 * @example cy.findTableRow('Jane Requests')
 */
Cypress.Commands.add('findTableRow', (name: string) => {
	return cy.get('table').contains('td', name).parent('tr')
})
