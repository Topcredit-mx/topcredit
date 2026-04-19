import type { SeedPaymentsQueueResult } from '~/cypress/tasks'
import { paymentsAgentQueue } from './payments-agents.fixtures'

describe('Payments queue CSV import', () => {
	let seed: SeedPaymentsQueueResult

	beforeEach(() => {
		cy.task('cleanupPaymentsQueue')
		cy.task<SeedPaymentsQueueResult>('seedPaymentsQueue').then((result) => {
			seed = result
			cy.login(paymentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(result.companyId))
		})
	})

	afterEach(() => {
		cy.task('cleanupPaymentsQueue')
	})

	it('shows import CSV button when company is selected and table is visible', () => {
		cy.visit('/equipo/payments')
		cy.get('table').should('be.visible')
		cy.contains('button', /importar csv/i).should('be.visible')
	})

	it('opens import dialog when import button is clicked', () => {
		cy.visit('/equipo/payments')
		cy.get('table').should('be.visible')
		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')
		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').should('exist')
		})
	})

	it('closes import dialog when cancel is clicked', () => {
		cy.visit('/equipo/payments')
		cy.get('table').should('be.visible')
		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')
		cy.get('[data-slot="dialog-close"]').click()
		cy.get('[role="dialog"]').should('not.exist')
	})

	it('uploads valid CSV, shows preview, confirms, shows success toast (one row per credit unchanged)', () => {
		cy.visit('/equipo/payments')
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
					fileName: 'recepciones.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
		})
		cy.get('#payments-import-csv-desc', { timeout: 15000 }).should('be.visible')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/lista(s)? para confirmar/i).should('be.visible')
			cy.contains('button', /^confirmar$/i)
				.should('be.visible')
				.click()
		})

		cy.contains(/recepción de 1 pago confirmada/i).should('be.visible')
		cy.get('[role="dialog"]').should('not.exist')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
	})

	it('shows error table when CSV has invalid format rows', () => {
		cy.visit('/equipo/payments')
		cy.get('table').should('be.visible')

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const csvContent = [
			'payroll_number,amount,date',
			'PAYMENTS002,not-a-number,2026-01-31',
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'recepciones-error.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
		})
		cy.get('#payments-import-csv-desc', { timeout: 15000 }).should('be.visible')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/filas con errores/i).should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length.at.least', 1)
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('PAYMENTS002').should('exist')
					cy.contains('not-a-number').should('exist')
				})
		})
	})

	it('shows no-match errors for rows not in the selected company data', () => {
		cy.visit('/equipo/payments')
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
					fileName: 'recepciones-nomatch.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
		})
		cy.get('#payments-import-csv-desc', { timeout: 15000 }).should('be.visible')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/filas con errores/i).should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('UNKNOWN999').should('exist')
					cy.contains(/sin coincidencia/i).should('exist')
				})
		})
	})

	it('shows warning when CSV row is already receipt-confirmed', () => {
		cy.visit('/equipo/payments')
		cy.get('table').should('be.visible')

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const { payrollNumber, amount, dueDateISO } =
			seed.alreadyReceivedInstallmentForCsv
		const csvContent = [
			'payroll_number,amount,date',
			`${payrollNumber},${amount},${dueDateISO}`,
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'recepciones-dup.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
		})
		cy.get('#payments-import-csv-desc', { timeout: 15000 }).should('be.visible')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/filas omitidas/i).should('be.visible')
			cy.contains(/recepción ya confirmada/i).should('be.visible')
			cy.contains(payrollNumber).should('exist')
		})
	})

	it('shows not-hr-confirmed warning for matching row awaiting HR', () => {
		cy.visit('/equipo/payments')
		cy.get('table').should('be.visible')

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const { payrollNumber, amount, dueDateISO } =
			seed.notHrConfirmedInstallmentForCsv
		const csvContent = [
			'payroll_number,amount,date',
			`${payrollNumber},${amount},${dueDateISO}`,
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'recepciones-sin-rh.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
		})
		cy.get('#payments-import-csv-desc', { timeout: 15000 }).should('be.visible')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/filas omitidas/i).should('be.visible')
			cy.contains(/rh aún no confirmada/i).should('be.visible')
		})
	})

	it('mixed CSV: confirms the pending row and warns about already-received', () => {
		cy.visit('/equipo/payments')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const pending = seed.firstInstallmentForCsv
		const received = seed.alreadyReceivedInstallmentForCsv
		const csvContent = [
			'payroll_number,amount,date',
			`${pending.payrollNumber},${pending.amount},${pending.dueDateISO}`,
			`${received.payrollNumber},${received.amount},${received.dueDateISO}`,
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'recepciones-mixed.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
		})
		cy.get('#payments-import-csv-desc', { timeout: 15000 }).should('be.visible')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/lista(s)? para confirmar/i).should('be.visible')
			cy.contains(/filas omitidas/i).should('be.visible')
			cy.contains(received.payrollNumber).should('exist')
			cy.contains('button', /^confirmar$/i)
				.should('be.visible')
				.click()
		})

		cy.contains(/recepción de 1 pago confirmada/i).should('be.visible')
		cy.get('[role="dialog"]').should('not.exist')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
	})

	it('mixed CSV: 1 valid, 1 already-received, 1 parse error — confirms only the valid row', () => {
		cy.visit('/equipo/payments')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)

		cy.contains('button', /importar csv/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')

		const pending = seed.firstInstallmentForCsv
		const received = seed.alreadyReceivedInstallmentForCsv
		const csvContent = [
			'payroll_number,amount,date',
			`${pending.payrollNumber},${pending.amount},${pending.dueDateISO}`,
			`${received.payrollNumber},${received.amount},${received.dueDateISO}`,
			'UNKNOWN999,not-a-number,2026-01-31',
		].join('\n')

		cy.get('[role="dialog"]').within(() => {
			cy.get('input[type="file"]').selectFile(
				{
					contents: Cypress.Buffer.from(csvContent),
					fileName: 'recepciones-all-three.csv',
					mimeType: 'text/csv',
				},
				{ force: true },
			)
		})
		cy.get('#payments-import-csv-desc', { timeout: 15000 }).should('be.visible')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/lista(s)? para confirmar/i).should('be.visible')
			cy.contains(/filas omitidas/i).should('be.visible')
			cy.contains(received.payrollNumber).should('exist')
			cy.contains(/filas con errores/i).should('be.visible')
			cy.contains('UNKNOWN999').should('exist')
			cy.contains('button', /^confirmar$/i)
				.should('be.visible')
				.click()
		})

		cy.contains(/recepción de 1 pago confirmada/i).should('be.visible')
		cy.get('[role="dialog"]').should('not.exist')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
	})
})
