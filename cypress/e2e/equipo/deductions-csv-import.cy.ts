import type { SeedDeductionsQueueResult } from '~/cypress/tasks'
import { hrAgentDeductions } from './deductions-queue.fixtures'

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
