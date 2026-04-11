import type {
	SeedDeductionsQueueResult,
	SeedHrReviewResult,
} from '~/cypress/tasks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'
import {
	adminForHr,
	authorizationsAgentForHr,
	hrAgentForReview,
} from './hr-agents.fixtures'

describe('HR deductions queue bulk confirm', () => {
	let seed: SeedDeductionsQueueResult

	beforeEach(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue').then((result) => {
			seed = result
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(result.companyId))
		})
	})

	afterEach(() => {
		cy.task('cleanupDeductionsQueue')
	})

	it('shows a checkbox column in the deductions table', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table thead').within(() => {
			cy.get('[role="checkbox"]').should('exist')
		})
		cy.get('table tbody tr')
			.first()
			.scrollIntoView()
			.within(() => {
				cy.get('[role="checkbox"]').should('exist')
			})
	})

	it('shows confirm button only when at least one row is selected', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.contains('button', /confirmar/i).should('not.exist')
		cy.get('table tbody tr')
			.first()
			.scrollIntoView()
			.within(() => {
				cy.get('[role="checkbox"]').should('exist').click()
			})
		cy.contains('button', /confirmar/i).should('be.visible')
	})

	it('confirms a single selected deduction and removes it from the table', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
		cy.get('table tbody tr')
			.first()
			.scrollIntoView()
			.within(() => {
				cy.get('[role="checkbox"]').should('exist').click()
			})
		cy.contains('button', /confirmar/i)
			.should('be.visible')
			.click()
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount - 1)
	})

	it('confirms all deductions using the header select-all checkbox', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table thead').within(() => {
			cy.get('[role="checkbox"]').should('exist').click()
		})
		cy.contains('button', /confirmar/i)
			.should('be.visible')
			.click()
		cy.contains(/no hay deducciones pendientes/i).should('be.visible')
	})

	it('shows success feedback after confirming deductions', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr')
			.first()
			.scrollIntoView()
			.within(() => {
				cy.get('[role="checkbox"]').should('exist').click()
			})
		cy.contains('button', /confirmar/i)
			.should('be.visible')
			.click()
		cy.contains(/confirmad/i).should('be.visible')
	})

	it('does not show the confirm button for a non-HR agent', () => {
		cy.login(nonHrAgentDeductions.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit('/equipo/deductions', { failOnStatusCode: false })
		cy.url().should('include', '/unauthorized')
	})
})

describe('HR agent flow', () => {
	let seed: SeedHrReviewResult

	before(() => {
		cy.task('cleanupHrReview')
		cy.task<SeedHrReviewResult>('seedHrReview').then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupHrReview')
	})

	describe('HR agent views authorized application', () => {
		beforeEach(() => {
			cy.login(hrAgentForReview.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('sees application in the HR queue', () => {
			cy.visit('/equipo/applications?status=authorized&hrPending=true')
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length.at.least', 1)
		})

		it('sees HR approve form on authorized application detail', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains(/pendiente rh/i).should('be.visible')
			cy.contains('button', /aprobar rh/i).should('be.visible')
		})

		it('sets first discount date and approves with suggested date', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')

			cy.get('select[name="firstDiscountDate"]').should('be.visible')
			cy.get('select[name="firstDiscountDate"]')
				.find('option')
				.should('have.length.at.least', 2)
			cy.contains('button', /aprobar rh/i)
				.should('be.visible')
				.click()

			cy.contains(/pendiente rh/i).should('not.exist')
			cy.contains(/fecha de primer descuento/i).should('be.visible')
		})

		it('picks a different date than the preset and approves', () => {
			cy.visit(`/equipo/applications/${seed.differentDateApplicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')

			cy.get('select[name="firstDiscountDate"]').should('be.visible')
			// Select the second option (different from preset)
			cy.get('select[name="firstDiscountDate"]')
				.find('option')
				.eq(1)
				.invoke('val')
				.then((secondDate) => {
					cy.get('select[name="firstDiscountDate"]').select(
						secondDate as string,
					)
				})
			cy.contains('button', /aprobar rh/i)
				.should('be.visible')
				.click()

			cy.contains(/pendiente rh/i).should('not.exist')
			cy.contains(/fecha de primer descuento/i).should('be.visible')
		})
	})

	describe('Admin approves HR flow', () => {
		beforeEach(() => {
			cy.login(adminForHr.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('sees HR approve form and approves as admin', () => {
			cy.visit(`/equipo/applications/${seed.adminApplicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains(/pendiente rh/i).should('be.visible')
			cy.contains('button', /aprobar rh/i)
				.should('be.visible')
				.click()

			cy.contains(/pendiente rh/i).should('not.exist')
			cy.contains(/fecha de primer descuento/i).should('be.visible')
		})
	})

	describe('Non-HR agent does not see HR controls', () => {
		beforeEach(() => {
			cy.login(authorizationsAgentForHr.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('does not see HR approve form on authorized application', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains('button', /aprobar rh/i).should('not.exist')
		})
	})
})

describe('HR deductions CSV import', () => {
	let seed: SeedDeductionsQueueResult

	beforeEach(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue').then((result) => {
			seed = result
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(result.companyId))
		})
	})

	afterEach(() => {
		cy.task('cleanupDeductionsQueue')
	})

	it('shows import CSV button when company is selected and table is visible', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.contains('button', /importar csv/i).should('be.visible')
	})

	it('opens import dialog when import button is clicked', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')
		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').should('exist')
			cy.contains('button', /validar/i).should('be.visible')
		})
	})

	it('closes import dialog when cancel is clicked', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')
		cy.get('[role="dialog"]').within(() => {
			cy.contains('button', /cancelar/i)
				.should('be.visible')
				.click()
		})
		cy.get('[role="dialog"]').should('not.exist')
	})

	it('uploads valid CSV, shows preview with matched rows, confirms, rows disappear from table', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const { payrollNumber, amount, dueDateISO } = seed.firstInstallmentForCsv
		const csvContent = `payroll_number,amount,date\n${payrollNumber},${amount},${dueDateISO}`

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'deducciones.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
			cy.contains('button', /validar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/listas? para confirmar/i).should('be.visible')
			cy.contains('button', /confirmar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').should('not.exist')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount - 1)
	})

	it('shows error table with column detail when CSV has invalid format rows', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const csvContent = [
			'payroll_number,amount,date',
			'DEDUCT001,not-a-number,2026-01-31',
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'deducciones-error.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
			cy.contains('button', /validar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/filas con errores/i).should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length.at.least', 1)
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('2').should('exist')
					cy.contains('DEDUCT001').should('exist')
					cy.contains('not-a-number').should('exist')
				})
		})
	})

	it('shows no-match errors for rows not belonging to the selected company', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const csvContent = [
			'payroll_number,amount,date',
			'UNKNOWN999,1000.00,2026-01-31',
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'deducciones-nomatch.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
			cy.contains('button', /validar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/filas con errores/i).should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('UNKNOWN999').should('exist')
					cy.contains(/sin coincidencia/i).should('exist')
				})
		})
	})

	it('shows warning in preview when CSV row is already confirmed', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const dueDateISO = seed.nextDeductionDateISO.slice(0, 10)
		const csvContent = [
			'payroll_number,amount,date',
			`DEDUCT004,15375.00,${dueDateISO}`,
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'deducciones-dup.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
			cy.contains('button', /validar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/ya confirmada/i).should('be.visible')
			cy.contains('DEDUCT004').should('exist')
		})
	})

	it('mixed CSV: confirms the unconfirmed row and warns about the already-confirmed one', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const { payrollNumber, amount, dueDateISO } = seed.firstInstallmentForCsv
		const dueDateISO2 = seed.nextDeductionDateISO.slice(0, 10)
		const csvContent = [
			'payroll_number,amount,date',
			`${payrollNumber},${amount},${dueDateISO}`,
			`DEDUCT004,15375.00,${dueDateISO2}`,
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'deducciones-mixed.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
			cy.contains('button', /validar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/listas? para confirmar/i).should('be.visible')
			cy.contains(/filas ya confirmadas/i).should('be.visible')
			cy.contains('DEDUCT004').should('exist')
			cy.contains('button', /confirmar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').should('not.exist')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount - 1)
	})

	it('mixed CSV: 1 valid, 1 already-confirmed, 1 error — confirms only the valid row', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const { payrollNumber, amount, dueDateISO } = seed.firstInstallmentForCsv
		const dueDateISO2 = seed.nextDeductionDateISO.slice(0, 10)
		const csvContent = [
			'payroll_number,amount,date',
			`${payrollNumber},${amount},${dueDateISO}`,
			`DEDUCT004,15375.00,${dueDateISO2}`,
			'UNKNOWN999,not-a-number,2026-01-31',
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'deducciones-all-three.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
			cy.contains('button', /validar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/listas? para confirmar/i).should('be.visible')
			cy.contains(/filas ya confirmadas/i).should('be.visible')
			cy.contains('DEDUCT004').should('exist')
			cy.contains(/filas con errores/i).should('be.visible')
			cy.contains('UNKNOWN999').should('exist')
			cy.contains('button', /confirmar/i)
				.should('be.visible')
				.click()
		})

		cy.get('[role="dialog"]').should('not.exist')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount - 1)
	})
})

describe('HR deductions queue', () => {
	let seed: SeedDeductionsQueueResult

	before(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue').then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupDeductionsQueue')
	})

	describe('HR agent views deductions queue', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows deductions queue page with table', () => {
			cy.visit('/equipo/deductions')
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
		})

		it('shows employee, amount, HR status, and receipt status columns but not a per-row due date column', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.get('table thead').within(() => {
				cy.contains('th', /empleado/i).should('be.visible')
				cy.contains('th', /monto/i).should('be.visible')
				cy.contains('th', /deducción rh/i).should('be.visible')
				cy.contains('th', /recepción/i).should('exist')
				cy.contains('th', /fecha de pago/i).should('not.exist')
			})
		})

		it('shows a queue-level next deduction date derived from company salary frequency', () => {
			cy.visit('/equipo/deductions')
			cy.get('main').should('be.visible')
			cy.contains(/próxima fecha de deducción/i).should('be.visible')
		})

		it('shows exactly one row per upcoming credit (one per applicant)', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
		})

		it('shows upcoming applicant names in the table', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.contains(seed.applicant2Name).should('be.visible')
		})

		it('does not show an already HR-confirmed deduction in the queue', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.get('table').within(() => {
				cy.contains(seed.confirmedApplicantName).should('not.exist')
			})
		})
	})

	describe('HR agent views queue with an overdue credit', () => {
		let overdueSeed: SeedDeductionsQueueResult

		before(() => {
			cy.task('cleanupDeductionsQueue')
			cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue', {
				withOverdue: true,
			}).then((result) => {
				overdueSeed = result
			})
		})

		after(() => {
			cy.task('cleanupDeductionsQueue')
		})

		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(overdueSeed.companyId))
		})

		it('does not show the overdue credit in the queue', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains(overdueSeed.overdueApplicantName).should('not.exist')
		})
	})

	describe('Non-HR agent cannot access deductions queue', () => {
		beforeEach(() => {
			cy.login(nonHrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when accessing deductions queue', () => {
			cy.visit('/equipo/deductions', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('HR agent without company selected', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
		})

		it('shows select a company empty state', () => {
			cy.visit('/equipo/deductions')
			cy.contains('h2', /selecciona una empresa/i).should('be.visible')
		})

		it('does not show the deductions table', () => {
			cy.visit('/equipo/deductions')
			cy.contains('h2', /selecciona una empresa/i).should('be.visible')
			cy.get('table').should('not.exist')
		})
	})

	describe('HR agent exports deductions to CSV', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows export CSV button on deductions page with company selected', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains('button', /exportar csv/i).should('be.visible')
		})

		it('opens export dialog when export button is clicked', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains('button', /exportar csv/i)
				.should('be.visible')
				.click()
			cy.get('[role="dialog"]').should('be.visible')
			cy.get('[role="dialog"]').within(() => {
				cy.get('select').should('be.visible')
				cy.contains('button', /exportar/i).should('be.visible')
			})
		})

		it('closes export dialog when cancel is clicked', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains('button', /exportar csv/i)
				.should('be.visible')
				.click()
			cy.get('[role="dialog"]').should('be.visible')
			cy.get('[role="dialog"]').within(() => {
				cy.contains('button', /cancelar/i)
					.should('be.visible')
					.click()
			})
			cy.get('[role="dialog"]').should('not.exist')
		})
	})
})
