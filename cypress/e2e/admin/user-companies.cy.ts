/**
 * Admin assigns companies to employees
 *
 * As an admin, I want to assign companies to an employee,
 * so that they can manage those companies' data.
 */

import {
	adminUser,
	companies,
	companyList,
	employeeUser,
} from './user-companies.fixtures'

describe('Admin assigns companies to employees', () => {
	before(() => {
		// Clean up any stale data from previous interrupted runs
		const userEmails = [adminUser.email, employeeUser.email]
		const companyDomains = companyList.map((c) => c.domain)

		cy.task('cleanupUserCompanies', userEmails)
		cy.task('cleanupTestUsers', userEmails)
		cy.task('cleanupTestCompanies', companyDomains)

		// Create test data
		cy.task('createUser', adminUser)
		cy.task('createUser', employeeUser)
		cy.task('createMultipleCompanies', companyList)
	})

	after(() => {
		// Cleanup all test data
		const userEmails = [adminUser.email, employeeUser.email]
		const companyDomains = companyList.map((c) => c.domain)

		cy.task('cleanupUserCompanies', userEmails)
		cy.task('cleanupTestUsers', userEmails)
		cy.task('cleanupTestCompanies', companyDomains)
	})

	beforeEach(() => {
		cy.login(adminUser.email)
	})

	describe('View company assignments', () => {
		it('should show "No companies assigned" for employee without assignments', () => {
			cy.visit('/app/admin/users')

			// Find the employee row
			cy.findTableRow(employeeUser.name).within(() => {
				// Should show empty state or "No companies" indicator
				cy.contains(/sin empresas|no companies|0 empresas/i).should('exist')
			})
		})

		it('should display assigned companies after assignment', () => {
			// First assign a company via task
			cy.task('assignCompanyToUser', {
				userEmail: employeeUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/app/admin/users')

			// Find the employee row
			cy.findTableRow(employeeUser.name).within(() => {
				// Should show the assigned company
				cy.contains(companies.acme.name).should('exist')
			})

			// Cleanup
			cy.task('cleanupUserCompanies', [employeeUser.email])
		})
	})

	describe('Assign companies to employee', () => {
		beforeEach(() => {
			// Ensure clean state
			cy.task('cleanupUserCompanies', [employeeUser.email])
		})

		it('should open company assignment dialog when clicking assign button', () => {
			cy.visit('/app/admin/users')

			// Find employee row and click assign companies button
			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			// Dialog should open
			cy.get('[role="dialog"]').should('be.visible')
			cy.contains('Asignar Empresas').should('be.visible')
		})

		it('should list all available companies in assignment dialog', () => {
			cy.visit('/app/admin/users')

			// Open assignment dialog
			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			// All companies should be listed
			cy.get('[role="dialog"]').within(() => {
				for (const company of companyList) {
					cy.contains(company.name).should('be.visible')
				}
			})
		})

		it('should assign single company to employee', () => {
			cy.visit('/app/admin/users')

			// Open assignment dialog
			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			// Select a company
			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').click()
			})

			// Dialog should close
			cy.get('[role="dialog"]').should('not.exist')

			// Assignment should be visible in the table
			cy.findTableRow(employeeUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})
		})

		it('should assign multiple companies to employee', () => {
			cy.visit('/app/admin/users')

			// Open assignment dialog
			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			// Select multiple companies
			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('label', companies.globex.name).click()
				cy.contains('button', 'Guardar').click()
			})

			// Dialog should close
			cy.get('[role="dialog"]').should('not.exist')

			// Both assignments should be visible
			cy.findTableRow(employeeUser.name).within(() => {
				// Should show count or list of companies
				cy.contains(/2 empresas|acme|globex/i).should('exist')
			})
		})
	})

	describe('Edit existing assignments', () => {
		before(() => {
			// Assign a company for this test group
			cy.task('assignCompanyToUser', {
				userEmail: employeeUser.email,
				companyDomain: companies.acme.domain,
			})
		})

		it('should show current assignments pre-checked when reopening dialog', () => {
			cy.visit('/app/admin/users')

			// Open assignment dialog
			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			// Previously assigned company should be checked
			// Note: Checkbox is a sibling of label, not inside it. Use parent() to find container.
			// Radix UI Checkbox uses data-state="checked" instead of native checked attribute.
			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name)
					.parent()
					.find('button[role="checkbox"]')
					.should('have.attr', 'data-state', 'checked')
			})
		})
	})
})
