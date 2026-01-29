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
		cy.task('cleanupTestUsers', [adminUser.email])
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

	describe('Company Creation', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/companies')
		})

		it('should navigate to create company page', () => {
			cy.contains('a', /nueva empresa/i).click()
			cy.url().should('include', '/app/admin/companies/new')
			cy.contains(/crear empresa/i).should('be.visible')
		})

		it('should create a new company with all fields', () => {
			const newCompany = {
				name: 'New Test Company',
				domain: 'newtest.com',
				rate: '0.0275',
				borrowingCapacityRate: '0.35',
				employeeSalaryFrequency: 'monthly' as const,
			}

			cy.visit('/app/admin/companies/new')

			// Fill form
			cy.get('input[name="name"]').type(newCompany.name)
			cy.get('input[name="domain"]').type(newCompany.domain)
			cy.get('input[name="rate"]').type('2.75') // User enters as percentage
			cy.get('input[name="borrowingCapacityRate"]').type('35') // User enters as percentage
			cy.selectRadix(
				'employeeSalaryFrequency',
				newCompany.employeeSalaryFrequency === 'monthly'
					? 'Mensual'
					: 'Quincenal',
			)

			// Submit form
			cy.contains('button', /crear|guardar|submit/i).click()

			// Should redirect to list and show new company
			cy.url().should('include', '/app/admin/companies')
			cy.contains(newCompany.name).should('be.visible')
			cy.contains(newCompany.domain).should('be.visible')

			// Cleanup
			cy.task('cleanupTestCompanies', [newCompany.domain])
		})

		it('should create company without borrowingCapacityRate', () => {
			const newCompany = {
				name: 'Company Without Rate',
				domain: 'norate.com',
				rate: '0.0250',
				employeeSalaryFrequency: 'bi-monthly' as const,
			}

			cy.visit('/app/admin/companies/new')

			cy.get('input[name="name"]').type(newCompany.name)
			cy.get('input[name="domain"]').type(newCompany.domain)
			cy.get('input[name="rate"]').type('2.5')
			cy.selectRadix('employeeSalaryFrequency', 'Quincenal') // bi-monthly = Quincenal
			// Leave borrowingCapacityRate empty

			cy.contains('button', /crear|guardar|submit/i).click()

			cy.url().should('include', '/app/admin/companies')
			cy.contains(newCompany.name).should('be.visible')

			// Cleanup
			cy.task('cleanupTestCompanies', [newCompany.domain])
		})

		it('should validate required fields', () => {
			cy.visit('/app/admin/companies/new')

			// Try to submit empty form
			cy.contains('button', /crear|guardar|submit/i).click()

			// Should show validation errors for required fields
			// Check for error messages (they appear after blur/submit)
			cy.contains(/el nombre es requerido|nombre es requerido/i).should(
				'be.visible',
			)
			cy.contains(/el dominio es requerido|dominio es requerido/i).should(
				'be.visible',
			)
			cy.contains(/la tasa es requerida|tasa es requerida/i).should(
				'be.visible',
			)
		})

		it('should validate domain uniqueness', () => {
			cy.visit('/app/admin/companies/new')

			// Use existing domain
			cy.get('input[name="name"]').type('Duplicate Domain Company')
			cy.get('input[name="domain"]').type('acme.com') // Already exists
			cy.get('input[name="rate"]').type('2.5')
			cy.selectRadix('employeeSalaryFrequency', 'Mensual')

			cy.contains('button', /crear|guardar|submit/i).click()

			// Should show error about duplicate domain
			cy.contains(/ya existe|duplicate|único/i).should('be.visible')
		})

		it('should validate domain format', () => {
			cy.visit('/app/admin/companies/new')

			cy.get('input[name="name"]').type('Invalid Domain')
			cy.get('input[name="domain"]').type('not-a-valid-domain')
			cy.get('input[name="rate"]').type('2.5')
			cy.selectRadix('employeeSalaryFrequency', 'Mensual')

			cy.contains('button', /crear|guardar|submit/i).click()

			// Should show domain format error
			cy.contains(/formato|format|válido/i).should('be.visible')
		})

		it('should validate rate is positive', () => {
			cy.visit('/app/admin/companies/new')

			cy.get('input[name="name"]').type('Invalid Rate')
			cy.get('input[name="domain"]').type('invalidrate.com')
			cy.get('input[name="rate"]').type('-5') // Negative rate
			cy.selectRadix('employeeSalaryFrequency', 'Mensual')

			cy.contains('button', /crear|guardar|submit/i).click()

			// Should show validation error
			cy.contains(/positivo|positive|mayor/i).should('be.visible')
		})

		it('should validate borrowingCapacityRate is between 0 and 100', () => {
			cy.visit('/app/admin/companies/new')

			cy.get('input[name="name"]').type('Invalid Capacity')
			cy.get('input[name="domain"]').type('invalidcap.com')
			cy.get('input[name="rate"]').type('2.5')
			cy.get('input[name="borrowingCapacityRate"]').type('150') // Over 100%
			cy.selectRadix('employeeSalaryFrequency', 'Mensual')

			cy.contains('button', /crear|guardar|submit/i).click()

			// Should show validation error (matches actual Zod schema message)
			cy.contains(
				/menor o igual a 100|less than or equal to 100|entre 0 y 100|between 0 and 100/i,
			).should('be.visible')
		})
	})

	describe('Company Editing', () => {
		let editCompany: {
			name: string
			domain: string
			rate: string
			borrowingCapacityRate: string | null
			employeeSalaryFrequency: 'bi-monthly' | 'monthly'
			active: boolean
		}

		before(() => {
			editCompany = {
				name: 'Edit Test Company',
				domain: 'edittest.com',
				rate: '0.0250',
				borrowingCapacityRate: '0.30',
				employeeSalaryFrequency: 'monthly' as const,
				active: true,
			}
			cy.task('createCompany', editCompany)
		})

		after(() => {
			cy.task('cleanupTestCompanies', [editCompany.domain])
		})

		beforeEach(() => {
			cy.login(adminUser.email)
		})

		it('should navigate to edit company page', () => {
			cy.visit('/app/admin/companies')
			cy.contains('td', editCompany.name)
				.parent('tr')
				.find('a[href*="/edit"], button')
				.click()

			cy.url().should(
				'include',
				`/app/admin/companies/${editCompany.domain}/edit`,
			)
			cy.contains(/editar|edit/i).should('be.visible')
		})

		it('should load existing company data in form', () => {
			cy.visit(`/app/admin/companies/${editCompany.domain}/edit`)

			cy.get('input[name="name"]').should('have.value', editCompany.name)
			cy.get('input[name="domain"]').should('have.value', editCompany.domain)
			cy.get('input[name="rate"]').should('have.value', '2.5') // Displayed as percentage
			cy.get('input[name="borrowingCapacityRate"]').should('have.value', '30') // Displayed as percentage
			// Check select value by checking the trigger button text
			// Find the Field containing the label, then find the select trigger within it
			cy.contains('label', /frecuencia de pago/i)
				.closest('[data-slot="field"]')
				.find('[data-slot="select-trigger"]')
				.should('contain', 'Mensual') // monthly = Mensual
		})

		it('should update company details', () => {
			cy.visit(`/app/admin/companies/${editCompany.domain}/edit`)

			// Update fields
			cy.get('input[name="name"]').clear().type('Updated Company Name')
			cy.get('input[name="rate"]').clear().type('3.0')
			cy.get('input[name="borrowingCapacityRate"]').clear().type('40')

			cy.contains('button', /guardar|save|actualizar/i).click()

			// Should redirect and show updated data
			cy.url().should('include', '/app/admin/companies')
			cy.contains('Updated Company Name').should('be.visible')

			// Revert changes
			cy.visit(`/app/admin/companies/${editCompany.domain}/edit`)
			cy.get('input[name="name"]').clear().type(editCompany.name)
			cy.get('input[name="rate"]').clear().type('2.5')
			cy.get('input[name="borrowingCapacityRate"]').clear().type('30')
			cy.contains('button', /guardar|save/i).click()
		})

		it('should toggle active status', () => {
			cy.visit(`/app/admin/companies/${editCompany.domain}/edit`)

			// Toggle active checkbox - click the label which is set up to toggle the checkbox
			cy.contains('label', /activa/i).click()

			cy.contains('button', /guardar|save/i).click()

			// Should show inactive badge
			cy.url().should('include', '/app/admin/companies')
			cy.contains('td', editCompany.name)
				.parent('tr')
				.within(() => {
					cy.contains('Inactiva').should('be.visible')
				})

			// Revert
			cy.visit(`/app/admin/companies/${editCompany.domain}/edit`)
			cy.contains('label', /activa/i).click()
			cy.contains('button', /guardar|save/i).click()
		})

		it('should prevent editing domain to duplicate value', () => {
			cy.visit(`/app/admin/companies/${editCompany.domain}/edit`)

			// Domain field should be disabled when editing (domains cannot be changed after creation)
			cy.get('input[name="domain"]').should('be.disabled')
			cy.contains(/el dominio no puede ser modificado/i).should('be.visible')
		})
	})
})
