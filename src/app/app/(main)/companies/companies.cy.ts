import { adminUser, companies } from './companies.fixtures'

describe('Admin Companies List', () => {
	before(() => {
		cy.task('cleanupAdminCompanies')
		cy.task('seedAdminCompanies')
	})

	describe('Access Control', () => {
		it('redirects non-admin users to unauthorized page', () => {
			const agentUser = {
				name: 'Agent User',
				email: 'agent.companies@example.com',
				roles: ['agent', 'requests'] as const,
			}
			cy.task('resetUser', agentUser)
			cy.login(agentUser.email)
			cy.visit('/app/companies')
			cy.url().should('include', '/unauthorized')

			cy.task('deleteUsersByEmail', [agentUser.email])
		})

		it('allows admin users to access companies page', () => {
			cy.login(adminUser.email)
			cy.visit('/app/companies')
			cy.url().should('include', '/app/companies')
		})
	})

	describe('Companies List Display', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/companies')
			cy.get('table').should('be.visible')
		})

		it('displays companies table with correct columns', () => {
			cy.get('table').should('exist')
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

		it('displays all companies including active and inactive', () => {
			cy.contains(companies.acme.name).should('exist')
			cy.contains(companies.techstart.name).should('exist')
			cy.contains(companies.inactive.name).should('exist')
		})

		it('displays company details correctly', () => {
			cy.get('table').should('contain', companies.acme.domain)
			cy.findTableRow(companies.acme.name).within(() => {
				cy.contains(companies.acme.domain).should('exist')
				cy.contains('2.50%').should('exist')
				cy.contains('30%').should('exist')
				cy.contains('Mensual').should('exist')
				cy.contains('Activa').should('exist')
			})
		})

		it('displays inactive companies with inactive badge', () => {
			cy.findTableRow(companies.inactive.name).within(() => {
				cy.contains('Inactiva').should('exist')
			})
		})

		it('displays companies without borrowing capacity rate', () => {
			cy.findTableRow(companies.techstart.name).within(() => {
				cy.contains('-').should('exist')
			})
		})

		it('displays bi-monthly frequency correctly', () => {
			cy.findTableRow(companies.techstart.name).within(() => {
				cy.contains('Quincenal').should('exist')
			})
		})
	})

	describe('Search Functionality', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/companies')
			cy.get('table').should('be.visible')
		})

		it('filters companies by name', () => {
			cy.get('input[type="search"]').type('Acme')
			cy.contains(companies.acme.name).should('exist')
			cy.contains(companies.techstart.name).should('not.exist')
			cy.contains(companies.inactive.name).should('not.exist')
		})

		it('filters companies by domain', () => {
			cy.get('input[type="search"]').clear().type('techstart')
			cy.contains(companies.techstart.name).should('exist')
			cy.contains(companies.acme.name).should('not.exist')
			cy.contains(companies.inactive.name).should('not.exist')
		})

		it('shows "No results" when no companies match filter', () => {
			cy.get('input[type="search"]').type('nonexistent')
			cy.contains(/no results/i).should('exist')
		})
	})

	describe('Active Filter', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/companies')
			cy.get('table').should('be.visible')
		})

		it('shows all companies by default', () => {
			cy.contains(companies.acme.name).should('exist')
			cy.contains(companies.techstart.name).should('exist')
			cy.contains(companies.inactive.name).should('exist')
		})

		it('filters to active companies only when activeOnly=true', () => {
			cy.visit('/app/companies?activeOnly=true')
			cy.contains(companies.acme.name).should('exist')
			cy.contains(companies.techstart.name).should('exist')
			cy.contains(companies.inactive.name).should('not.exist')
		})
	})

	describe('Company Creation', () => {
		const creationTestDomains = ['newtest.com', 'norate.com']

		before(() => {
			cy.task('deleteCompaniesByDomain', creationTestDomains)
		})

		after(() => {
			cy.task('deleteCompaniesByDomain', creationTestDomains)
		})

		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/companies')
			cy.get('table').should('be.visible')
		})

		it('navigates to create company page', () => {
			cy.get('table').should('exist')
			cy.contains('a', /nueva empresa/i)
				.should('be.visible')
				.click()
			cy.url().should('include', '/app/companies/new')
			cy.contains(/crear empresa/i).should('be.visible')
		})

		it('creates a new company with all fields', () => {
			const newCompany = {
				name: 'New Test Company',
				domain: 'newtest.com',
				rate: '0.0275',
				borrowingCapacityRate: '0.35',
				employeeSalaryFrequency: 'monthly' as const,
			}

			cy.visit('/app/companies/new')

			cy.get('input[name="name"]').type(newCompany.name)
			cy.get('input[name="domain"]').type(newCompany.domain)
			cy.get('input[name="rate"]').type('2.75')
			cy.get('input[name="borrowingCapacityRate"]').type('35')
			cy.selectRadix(
				'employeeSalaryFrequency',
				newCompany.employeeSalaryFrequency === 'monthly'
					? 'Mensual'
					: 'Quincenal',
			)

			cy.contains('button', /crear|guardar|submit/i)
				.should('be.visible')
				.click()

			cy.url().should('include', '/app/companies')
			cy.get('main').should('be.visible')
			cy.get('table', { timeout: 10000 }).should('be.visible')
			cy.findTableRow(newCompany.name)
				.scrollIntoView()
				.within(() => {
					cy.contains('td', newCompany.name).should('be.visible')
					cy.contains('td', newCompany.domain).should('be.visible')
				})

			cy.task('deleteCompaniesByDomain', [newCompany.domain])
		})

		it('creates company without borrowingCapacityRate', () => {
			const newCompany = {
				name: 'Company Without Rate',
				domain: 'norate.com',
				rate: '0.0250',
				employeeSalaryFrequency: 'bi-monthly' as const,
			}

			cy.visit('/app/companies/new')

			cy.get('input[name="name"]').type(newCompany.name)
			cy.get('input[name="domain"]').type(newCompany.domain)
			cy.get('input[name="rate"]').type('2.5')
			cy.selectRadix('employeeSalaryFrequency', 'Quincenal')

			cy.contains('button', /crear|guardar|submit/i)
				.should('be.visible')
				.click()

			cy.url().should('include', '/app/companies')
			cy.get('main').should('be.visible')
			cy.get('table', { timeout: 10000 }).should('be.visible')
			cy.findTableRow(newCompany.name)
				.scrollIntoView()
				.within(() => {
					cy.contains('td', newCompany.name).should('be.visible')
				})

			cy.task('deleteCompaniesByDomain', [newCompany.domain])
		})

		it('validates required fields', () => {
			cy.visit('/app/companies/new')

			cy.contains('button', /crear|guardar|submit/i)
				.should('be.visible')
				.click()

			cy.contains('El nombre es requerido').should('be.visible')
			cy.contains('El dominio es requerido').should('be.visible')
			cy.contains('La tasa es requerida').should('be.visible')
		})

		it('validates domain uniqueness', () => {
			cy.visit('/app/companies/new')

			cy.get('input[name="name"]').type('Duplicate Domain Company')
			cy.get('input[name="domain"]').type('acme.com')
			cy.get('input[name="rate"]').type('2.5')
			cy.selectRadix('employeeSalaryFrequency', 'Mensual')

			cy.contains('button', /crear|guardar|submit/i)
				.should('be.visible')
				.click()

			cy.contains('El dominio ya existe. Debe ser único.').should('be.visible')
		})

		it('validates domain format', () => {
			cy.visit('/app/companies/new')

			cy.get('input[name="name"]').type('Invalid Domain')
			cy.get('input[name="domain"]').type('not-a-valid-domain')
			cy.get('input[name="rate"]').type('2.5')
			cy.selectRadix('employeeSalaryFrequency', 'Mensual')

			cy.contains('button', /crear|guardar|submit/i)
				.should('be.visible')
				.click()

			cy.contains(
				'El dominio debe tener un formato válido (ej: ejemplo.com)',
			).should('be.visible')
		})

		it('validates rate is positive', () => {
			cy.visit('/app/companies/new')

			cy.get('input[name="name"]').type('Invalid Rate')
			cy.get('input[name="domain"]').type('invalidrate.com')
			cy.get('input[name="rate"]').type('-5')
			cy.selectRadix('employeeSalaryFrequency', 'Mensual')

			cy.contains('button', /crear|guardar|submit/i)
				.should('be.visible')
				.click()

			cy.contains('La tasa debe ser un número positivo').should('be.visible')
		})

		it('validates borrowingCapacityRate is between 0 and 100', () => {
			cy.visit('/app/companies/new')

			cy.get('input[name="name"]').type('Invalid Capacity')
			cy.get('input[name="domain"]').type('invalidcap.com')
			cy.get('input[name="rate"]').type('2.5')
			cy.get('input[name="borrowingCapacityRate"]').type('150')
			cy.selectRadix('employeeSalaryFrequency', 'Mensual')

			cy.contains('button', /crear|guardar|submit/i)
				.should('be.visible')
				.click()

			cy.contains(
				'La capacidad de préstamo debe ser menor o igual a 100',
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
			cy.task('resetCompany', editCompany)
		})

		after(() => {
			cy.task('deleteCompaniesByDomain', [editCompany.domain])
		})

		beforeEach(() => {
			cy.login(adminUser.email)
		})

		it('navigates to edit company page', () => {
			cy.visit('/app/companies')
			cy.get('table').should('be.visible')
			cy.findTableRow(editCompany.name)
				.scrollIntoView()
				.within(() => {
					cy.get('a[href*="/edit"]').should('exist').click()
				})
			const editPath = `/app/companies/${editCompany.domain}/edit`
			cy.url().should('include', editPath)
			cy.contains(/editar|edit/i).should('be.visible')
		})

		it('loads existing company data in form', () => {
			cy.visit(`/app/companies/${editCompany.domain}/edit`)

			cy.get('input[name="name"]').should('have.value', editCompany.name)
			cy.get('input[name="domain"]').should('have.value', editCompany.domain)
			cy.get('input[name="rate"]').should('have.value', '2.5')
			cy.get('input[name="borrowingCapacityRate"]').should('have.value', '30')
			cy.contains('label', /frecuencia de pago/i)
				.closest('[data-slot="field"]')
				.find('[data-slot="select-trigger"]')
				.should('contain', 'Mensual')
		})

		it('toggles active status', () => {
			cy.visit(`/app/companies/${editCompany.domain}/edit`)

			cy.contains('label', /activa/i)
				.should('be.visible')
				.click()

			cy.contains('button', /guardar|save/i)
				.should('be.visible')
				.click()

			cy.url().should('include', '/app/companies')
			cy.get('main').should('be.visible')
			cy.get('table', { timeout: 10000 }).should('be.visible')
			cy.findTableRow(editCompany.name)
				.scrollIntoView()
				.within(() => {
					cy.contains('Inactiva').should('exist')
				})

			cy.visit(`/app/companies/${editCompany.domain}/edit`)
			cy.contains('label', /activa/i)
				.should('be.visible')
				.click()
			cy.contains('button', /guardar|save/i)
				.should('be.visible')
				.click()

			cy.url().should('include', '/app/companies')
			cy.get('main').should('be.visible')
			cy.get('table', { timeout: 10000 }).should('be.visible')
			cy.findTableRow(editCompany.name)
				.scrollIntoView()
				.within(() => {
					cy.contains('Activa').should('exist')
				})
		})

		it('updates company details', () => {
			cy.visit(`/app/companies/${editCompany.domain}/edit`)

			cy.get('input[name="name"]').clear().type('Updated Company Name')
			cy.get('input[name="rate"]').clear().type('3.0')
			cy.get('input[name="borrowingCapacityRate"]').clear().type('40')

			cy.contains('button', /guardar|save|actualizar/i)
				.should('be.visible')
				.click()

			cy.url().should('include', '/app/companies')
			cy.get('table').should('be.visible')
			cy.get('input[aria-label="Filtrar empresas..."]')
				.should('be.visible')
				.type('Updated')
			cy.contains('Updated Company Name').should('exist')

			cy.visit(`/app/companies/${editCompany.domain}/edit`)
			cy.get('input[name="name"]').clear().type(editCompany.name)
			cy.get('input[name="rate"]').clear().type('2.5')
			cy.get('input[name="borrowingCapacityRate"]').clear().type('30')
			cy.contains('button', /guardar|save/i)
				.should('be.visible')
				.click()
		})

		it('prevents editing domain to duplicate value', () => {
			cy.visit(`/app/companies/${editCompany.domain}/edit`)

			cy.get('input[name="domain"]').should('be.disabled')
			cy.contains(/el dominio no puede ser modificado/i).should('be.visible')
		})
	})
})
