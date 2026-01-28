const adminUser = {
	name: 'Admin User',
	email: 'admin@example.com',
	roles: ['employee', 'admin'] as const,
}

const testCompanies = [
	{
		name: 'Acme Corporation',
		domain: 'acme.com',
		rate: '0.0250',
		borrowingCapacityRate: '0.30', // 30% of salary
		employeeSalaryFrequency: 'monthly' as const,
		active: true,
	},
	{
		name: 'TechStart Inc',
		domain: 'techstart.mx',
		rate: '0.0300',
		borrowingCapacityRate: null,
		employeeSalaryFrequency: 'bi-monthly' as const,
		active: true,
	},
	{
		name: 'Inactive Corp',
		domain: 'inactive.com',
		rate: '0.0200',
		borrowingCapacityRate: '0.25', // 25% of salary
		employeeSalaryFrequency: 'monthly' as const,
		active: false,
	},
]

describe('Admin Companies List', () => {
	before(() => {
		// Clean up any stale data from previous interrupted runs
		const allDomains = testCompanies.map((c) => c.domain)
		cy.task('cleanupTestCompanies', allDomains)
		// Create admin user
		cy.task('createUser', adminUser)
		// Create test companies
		cy.task('createMultipleCompanies', testCompanies)
	})

	after(() => {
		// Cleanup all test companies
		const allDomains = testCompanies.map((c) => c.domain)
		cy.task('cleanupTestCompanies', allDomains)
		// Cleanup admin user
		cy.task('cleanupTestUsers', [adminUser.email])
	})

	describe('Access Control', () => {
		it('should redirect non-admin users to unauthorized page', () => {
			// Create a non-admin employee
			const employeeUser = {
				name: 'Employee User',
				email: 'employee@example.com',
				roles: ['employee', 'requests'] as const,
			}
			cy.task('createUser', employeeUser)
			cy.login(employeeUser.email)
			cy.visit('/app/admin/companies')
			cy.url().should('include', '/unauthorized')

			// Cleanup
			cy.task('cleanupTestUsers', [employeeUser.email])
		})

		it('should allow admin users to access companies page', () => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/companies')
			cy.url().should('include', '/app/admin/companies')
		})
	})

	describe('Companies List Display', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/companies')
		})

		it('should display companies table with correct columns', () => {
			// Table headers are labels - check existence rather than visibility
			// (they may be clipped by overflow but still functional)
			cy.get('table').should('be.visible')
			cy.get('table').within(() => {
				cy.contains('th', /nombre/i).should('exist')
				cy.contains('th', /dominio/i).should('exist')
				cy.contains('th', /tasa/i).should('exist')
				cy.contains('th', /capacidad de préstamo/i).should('exist')
				cy.contains('th', /frecuencia de pago/i).should('exist')
				cy.contains('th', /estado/i).should('exist')
				cy.contains('th', /fecha de creación/i).should('exist')
			})
		})

		it('should display all companies including active and inactive', () => {
			cy.contains('Acme Corporation').should('be.visible')
			cy.contains('TechStart Inc').should('be.visible')
			cy.contains('Inactive Corp').should('be.visible')
		})

		it('should display company details correctly', () => {
			// Check Acme Corporation details
			cy.contains('td', 'Acme Corporation')
				.parent('tr')
				.within(() => {
					cy.contains('acme.com').should('be.visible')
					cy.contains('2.50%').should('be.visible') // rate formatted as percentage
					cy.contains('30%').should('be.visible') // borrowing capacity rate as percentage
					cy.contains('Mensual').should('be.visible') // monthly translated
					cy.contains('Activa').should('be.visible') // active badge
				})
		})

		it('should display inactive companies with inactive badge', () => {
			cy.contains('td', 'Inactive Corp')
				.parent('tr')
				.within(() => {
					cy.contains('Inactiva').should('be.visible')
				})
		})

		it('should display companies without borrowing capacity rate', () => {
			cy.contains('td', 'TechStart Inc')
				.parent('tr')
				.within(() => {
					cy.contains('-').should('be.visible') // null borrowing capacity rate shows as dash
				})
		})

		it('should display bi-monthly frequency correctly', () => {
			cy.contains('td', 'TechStart Inc')
				.parent('tr')
				.within(() => {
					cy.contains('Quincenal').should('be.visible')
				})
		})
	})

	describe('Search Functionality', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/companies')
		})

		it('should filter companies by name', () => {
			cy.get('input[placeholder*="Filter"]').type('Acme')
			cy.contains('Acme Corporation').should('be.visible')
			cy.contains('TechStart Inc').should('not.exist')
			cy.contains('Inactive Corp').should('not.exist')
		})

		it('should filter companies by domain', () => {
			cy.get('input[placeholder*="Filter"]').clear().type('techstart')
			cy.contains('TechStart Inc').should('be.visible')
			cy.contains('Acme Corporation').should('not.exist')
			cy.contains('Inactive Corp').should('not.exist')
		})

		it('should show "No results" when no companies match filter', () => {
			cy.get('input[placeholder*="Filter"]').type('nonexistent')
			cy.contains(/no results/i).should('be.visible')
		})
	})

	describe('Active Filter', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/companies')
		})

		it('should show all companies by default', () => {
			cy.contains('Acme Corporation').should('be.visible')
			cy.contains('TechStart Inc').should('be.visible')
			cy.contains('Inactive Corp').should('be.visible')
		})

		it('should filter to active companies only when activeOnly=true', () => {
			cy.visit('/app/admin/companies?activeOnly=true')
			cy.contains('Acme Corporation').should('be.visible')
			cy.contains('TechStart Inc').should('be.visible')
			cy.contains('Inactive Corp').should('not.exist')
		})
	})
})
