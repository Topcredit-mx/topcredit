Cypress.Commands.add('login', (email: string) => {
	cy.task('login', email).then((token) => {
		cy.setCookie('next-auth.session-token', token)
	})
})
