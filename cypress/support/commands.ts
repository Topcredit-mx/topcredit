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
 *   - label text: 'Frecuencia de Pago'
 *   - CSS selector: '[name="employeeSalaryFrequency"]'
 * @param optionText - The visible text of the option to select
 *
 * @example
 * cy.selectRadix('employeeSalaryFrequency', 'Mensual')
 * cy.selectRadix('Frecuencia de Pago', 'Quincenal')
 * cy.selectRadix('[name="status"]', 'Active')
 */
Cypress.Commands.add('selectRadix', (selector: string, optionText: string) => {
	// Find trigger - try multiple strategies
	if (selector.startsWith('[') || selector.startsWith('.')) {
		// CSS selector provided directly
		cy.get(selector).click()
	} else if (selector.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/)) {
		// Looks like a name attribute (no spaces, starts with letter)
		cy.get(`[name="${selector}"]`).click()
	} else {
		// Assume it's label text - find label and get next sibling trigger
		cy.contains('label', new RegExp(selector, 'i'))
			.next()
			.find('[data-slot="select-trigger"], button')
			.first()
			.click()
	}

	// Wait for portal content to be visible
	cy.get('[data-slot="select-content"]').should('be.visible')

	// Click the option by text content
	cy.contains('[data-slot="select-item"]', optionText).click()
})
