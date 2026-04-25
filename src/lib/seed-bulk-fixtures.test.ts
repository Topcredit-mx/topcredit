import assert from 'node:assert/strict'
import test from 'node:test'
import { seedCompanies, seedTermOfferings } from '../../scripts/seed.fixtures'
import { buildExtraSeedDataset } from '../../scripts/seed-bulk'
import {
	isPreAuthOverCapacity,
	monthlySalaryFromApplication,
	parseBorrowingCapacityRate,
	parsePositiveRate,
} from './pre-authorization-capacity'

const CANONICAL_CREDIT_AMOUNTS = new Set([
	'5000.00',
	'8000.00',
	'9500.00',
	'6500.00',
	'17500.00',
	'15000.00',
	'18500.00',
	'20000.00',
	'22000.00',
	'12000.00',
	'38000.00',
	'42000.00',
	'35000.00',
	'24000.00',
])

test('buildExtraSeedDataset: count, user–app pairing, email domain', () => {
	const n = 25
	const { users, applications } = buildExtraSeedDataset(
		n,
		seedCompanies,
		seedTermOfferings,
	)
	assert.equal(users.length, applications.length)
	assert.equal(users.length, n)
	const emailSet = new Set(users.map((u) => u.email))
	const nameSet = new Set(users.map((u) => u.name))
	assert.equal(emailSet.size, n)
	assert.equal(nameSet.size, n)
	for (let i = 0; i < applications.length; i++) {
		const app = applications[i]
		if (app == null) continue
		const u = users[i]
		assert.ok(u != null)
		assert.equal(app.applicantEmail, u.email)
		assert.ok(u.email.endsWith(`@${app.companyDomain}`))
		const [localPart] = u.email.split('@')
		assert.ok(localPart != null && localPart.length > 3)
		assert.match(localPart, /^[a-z0-9._-]+$/)
		const co = seedCompanies.find((c) => c.domain === app.companyDomain)
		assert.ok(co != null)
		assert.equal(app.salaryFrequency, co.employeeSalaryFrequency)
	}
})

test('buildExtraSeedDataset: pre-auth capacity and canonical amount separation', () => {
	const n = 40
	const { applications } = buildExtraSeedDataset(
		n,
		seedCompanies,
		seedTermOfferings,
	)
	assert.equal(applications.length, n)
	const keys = new Set<string>()
	for (const app of applications) {
		assert.ok(!CANONICAL_CREDIT_AMOUNTS.has(app.creditAmount))
		const co = seedCompanies.find((c) => c.domain === app.companyDomain)
		assert.ok(co != null)
		const borrowing = parseBorrowingCapacityRate(co.borrowingCapacityRate)
		const rate = parsePositiveRate(co.rate)
		assert.ok(borrowing != null)
		assert.ok(rate != null)
		const monthlySalary = monthlySalaryFromApplication(
			app.salaryAtApplication,
			app.salaryFrequency,
		)
		assert.ok(monthlySalary != null)
		assert.ok(
			!isPreAuthOverCapacity({
				loanPrincipal: Number.parseFloat(app.creditAmount),
				rate,
				totalPayments: app.duration,
				borrowingCapacityRate: borrowing,
				monthlySalary,
				loanDurationType: app.durationType,
			}),
		)
		const k = `${app.applicantEmail}|${app.companyDomain}|${app.durationType}|${app.duration}|${app.creditAmount}`
		assert.ok(!keys.has(k))
		keys.add(k)
	}
})

test('buildExtraSeedDataset: disbursed with credit shapes', () => {
	const { applications } = buildExtraSeedDataset(
		40,
		seedCompanies,
		seedTermOfferings,
	)
	const withCredit = applications.filter(
		(a) => a.status === 'disbursed' && a.afterCreditInsert !== 'none',
	)
	assert.ok(withCredit.length >= 10)
	for (const a of withCredit) {
		assert.ok(a.transferReference != null && a.transferReference.length > 0)
		assert.ok(a.receiptFileName != null && a.receiptFileName.length > 0)
		const settled = a.afterCreditInsert === 'settled'
		if (settled) {
			assert.equal(a.companyDomain, 'cva-ingenieros.com.mx')
			assert.equal(a.duration, 6)
			assert.equal(a.firstDiscount, 'settled-six')
		}
	}
})
