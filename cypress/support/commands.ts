Cypress.Commands.add('login', (email: string) => {
	cy.task('login', email).then((token) => {
		cy.setCookie('next-auth.session-token', token)
	})
})

Cypress.Commands.add('selectRadix', (selector: string, optionText: string) => {
	const byLabel = selector.startsWith('label:')
	const labelText = byLabel ? selector.slice(6) : selector

	if (selector.startsWith('[') || selector.startsWith('.')) {
		cy.get(selector).click()
	} else if (!byLabel && selector.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/)) {
		cy.get(`[name="${selector}"]:not(input[type="hidden"])`).first().click()
	} else {
		cy.contains('label', new RegExp(labelText, 'i'))
			.closest('[data-slot="field"]')
			.find('[data-slot="select-trigger"], button')
			.first()
			.click()
	}

	cy.get('[data-slot="select-content"]').should('be.visible').first()

	cy.contains('[data-slot="select-item"]', optionText).first().click()
})

Cypress.Commands.add('findTableRow', (name: string) => {
	return cy.get('table').contains('td', name).parent('tr')
})
