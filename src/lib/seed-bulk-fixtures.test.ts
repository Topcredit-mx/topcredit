import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import {
	type SeedApplicationFixture,
	seedApplications,
	seedCompanies,
	seedTermOfferings,
} from '../../scripts/seed.fixtures'
import {
	buildExtraSeedDataset,
	EXTRA_NON_DISBURSED_APPROVED_PER_COMPANY,
	EXTRA_NON_DISBURSED_AUTHORIZED_HR_PENDING_PER_COMPANY,
	EXTRA_NON_DISBURSED_AUTHORIZED_PER_COMPANY,
	EXTRA_NON_DISBURSED_AWAITING_AUTH_PER_COMPANY,
	EXTRA_NON_DISBURSED_DENIED_PER_COMPANY,
	EXTRA_NON_DISBURSED_PENDING_PER_COMPANY,
	EXTRA_NON_DISBURSED_PRE_AUTH_PER_COMPANY,
	MIN_ACTIVE_DEDUCTIONS_PER_COMPANY,
	MIN_ACTIVE_INSTALLMENTS_PER_COMPANY,
	MIN_APPLICATIONS_PER_COMPANY,
	MIN_EXTRA_NON_DISBURSED_PER_COMPANY,
	MIN_GLOBAL_TERM_OPTIONS_USED,
	MIN_OVERDUE_CREDITS_PER_COMPANY,
	MIN_OVERDUE_INSTALLMENTS_CREDITS_PER_COMPANY,
	MIN_SETTLED_CREDITS_PER_COMPANY,
	SEED_EXTRA_APPLICATION_COUNT,
} from '../../scripts/seed-bulk'
import { resolveSeedFirstDiscountDate } from '../../scripts/seed-first-discount'
import {
	countPastDuePaymentsInSchedule,
	findMonthsAgoForPastDueCount,
	tieBreakerFromEmail,
} from '../../scripts/seed-past-due'
import { isFirstDiscountAnchorCalendarShapeValid } from './first-discount-date'
import { generatePaymentSchedule } from './payment-schedule'
import {
	isPreAuthOverCapacity,
	monthlySalaryFromApplication,
	parseBorrowingCapacityRate,
	parsePositiveRate,
} from './pre-authorization-capacity'

const SEED_ANCHOR_REFERENCE_TODAY = new Date(Date.UTC(2026, 3, 25))

function utcKey(d: Date): number {
	return (
		d.getUTCFullYear() * 10_000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
	)
}

function resolveMonthsAgoForFixture(
	app: SeedApplicationFixture,
	today: Date,
): number | undefined {
	if (
		app.seedTargetPastDuePaymentCount != null &&
		app.firstDiscount === 'historic-offset'
	) {
		const historicAnchor = app.firstDiscountHistoricAnchor ?? 'month-end'
		return findMonthsAgoForPastDueCount({
			today,
			salaryFrequency: app.salaryFrequency,
			historicAnchor,
			duration: app.duration,
			durationType: app.durationType,
			targetPastDue: app.seedTargetPastDuePaymentCount,
			tieBreaker: tieBreakerFromEmail(app.applicantEmail),
		})
	}
	return app.firstDiscountMonthsAgo
}

function resolveAnchorForFixture(
	app: SeedApplicationFixture,
	today: Date,
): Date | null {
	const monthsAgo = resolveMonthsAgoForFixture(app, today)
	return resolveSeedFirstDiscountDate(
		app.firstDiscount,
		app.salaryFrequency,
		today,
		{
			...(monthsAgo != null ? { monthsAgo } : {}),
			...(app.firstDiscountNextValidPickIndex != null
				? { nextValidPickIndex: app.firstDiscountNextValidPickIndex }
				: {}),
			...(app.firstDiscountHistoricAnchor != null
				? { historicAnchor: app.firstDiscountHistoricAnchor }
				: {}),
		},
	)
}

function pastDueCountForDisbursedFixture(
	app: SeedApplicationFixture,
	today: Date,
): number {
	const first = resolveAnchorForFixture(app, today)
	if (first == null) {
		return 0
	}
	const co = seedCompanies.find((c) => c.domain === app.companyDomain)
	if (co == null) {
		return 0
	}
	const rate = parsePositiveRate(co.rate)
	if (rate == null) {
		return 0
	}
	const schedule = generatePaymentSchedule({
		loanPrincipal: Number.parseFloat(app.creditAmount),
		rate,
		totalPayments: app.duration,
		frequency: app.durationType,
		firstDiscountDate: first,
	})
	return countPastDuePaymentsInSchedule(schedule, today)
}

test('buildExtraSeedDataset: count, user–app pairing, email domain', () => {
	const n = 120
	const { users, applications } = buildExtraSeedDataset(
		n,
		seedCompanies,
		seedTermOfferings,
	)
	assert.equal(users.length, applications.length)
	assert.ok(users.length >= n)
	const emailSet = new Set(users.map((u) => u.email))
	const nameSet = new Set(users.map((u) => u.name))
	assert.equal(emailSet.size, users.length)
	assert.equal(nameSet.size, users.length)
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
		assert.match(u.name, /^[A-Z][a-z]+ [A-Z][a-z]+$/)
		const co = seedCompanies.find((c) => c.domain === app.companyDomain)
		assert.ok(co != null)
		assert.equal(app.salaryFrequency, co.employeeSalaryFrequency)
	}
})

describe('buildExtraSeedDataset (full count, shared)', () => {
	let applications: SeedApplicationFixture[] = []

	before(() => {
		const built = buildExtraSeedDataset(
			SEED_EXTRA_APPLICATION_COUNT,
			seedCompanies,
			seedTermOfferings,
		)
		applications = built.applications
	})

	test('buildExtraSeedDataset: per-company realism minima', () => {
		const activeDomains = seedCompanies
			.filter((c) => c.active)
			.map((c) => c.domain)
		for (const domain of activeDomains) {
			const byCompany = applications.filter((a) => a.companyDomain === domain)
			assert.ok(
				byCompany.length >= MIN_APPLICATIONS_PER_COMPANY,
				`${domain}: expected >=${MIN_APPLICATIONS_PER_COMPANY} applications`,
			)
			const deductions = byCompany.filter(
				(a) => a.status === 'disbursed' && a.afterCreditInsert === 'deductions',
			)
			const installments = byCompany.filter(
				(a) =>
					a.status === 'disbursed' && a.afterCreditInsert === 'installments',
			)
			const settled = byCompany.filter(
				(a) => a.status === 'disbursed' && a.afterCreditInsert === 'settled',
			)
			const overdue = byCompany.filter(
				(a) => a.status === 'disbursed' && a.afterCreditInsert === 'overdue',
			)
			const installmentsOverdue = byCompany.filter(
				(a) =>
					a.status === 'disbursed' &&
					a.afterCreditInsert === 'installments-overdue',
			)
			assert.ok(
				deductions.length >= MIN_ACTIVE_DEDUCTIONS_PER_COMPANY,
				`${domain}: deductions credits minimum not met`,
			)
			assert.ok(
				installments.length >= MIN_ACTIVE_INSTALLMENTS_PER_COMPANY,
				`${domain}: installments credits minimum not met`,
			)
			assert.ok(
				settled.length >= MIN_SETTLED_CREDITS_PER_COMPANY,
				`${domain}: settled credits minimum not met`,
			)
			assert.ok(
				overdue.length >= MIN_OVERDUE_CREDITS_PER_COMPANY,
				`${domain}: overdue credits minimum not met`,
			)
			assert.ok(
				installmentsOverdue.length >=
					MIN_OVERDUE_INSTALLMENTS_CREDITS_PER_COMPANY,
				`${domain}: installments-overdue credits minimum not met`,
			)
			const nonDisbursed = byCompany.filter((a) => a.status !== 'disbursed')
			assert.ok(
				nonDisbursed.length >= MIN_EXTRA_NON_DISBURSED_PER_COMPANY,
				`${domain}: expected >=${MIN_EXTRA_NON_DISBURSED_PER_COMPANY} non-disbursed applications`,
			)
			const pending = byCompany.filter((a) => a.status === 'pending')
			const approved = byCompany.filter((a) => a.status === 'approved')
			const preAuth = byCompany.filter((a) => a.status === 'pre-authorized')
			const awaiting = byCompany.filter(
				(a) => a.status === 'awaiting-authorization',
			)
			const authorized = byCompany.filter((a) => a.status === 'authorized')
			const denied = byCompany.filter((a) => a.status === 'denied')
			assert.ok(
				pending.length >= EXTRA_NON_DISBURSED_PENDING_PER_COMPANY,
				`${domain}: pending stage minimum not met`,
			)
			assert.ok(
				approved.length >= EXTRA_NON_DISBURSED_APPROVED_PER_COMPANY,
				`${domain}: approved stage minimum not met`,
			)
			assert.ok(
				preAuth.length >= EXTRA_NON_DISBURSED_PRE_AUTH_PER_COMPANY,
				`${domain}: pre-authorized stage minimum not met`,
			)
			assert.ok(
				awaiting.length >= EXTRA_NON_DISBURSED_AWAITING_AUTH_PER_COMPANY,
				`${domain}: awaiting-authorization stage minimum not met`,
			)
			assert.ok(
				authorized.length >= EXTRA_NON_DISBURSED_AUTHORIZED_PER_COMPANY,
				`${domain}: authorized stage minimum not met`,
			)
			const authorizedHrPending = authorized.filter(
				(a) => a.firstDiscount === 'none',
			)
			assert.ok(
				authorizedHrPending.length >=
					EXTRA_NON_DISBURSED_AUTHORIZED_HR_PENDING_PER_COMPANY,
				`${domain}: authorized HR-pending minimum not met`,
			)
			assert.ok(
				denied.length >= EXTRA_NON_DISBURSED_DENIED_PER_COMPANY,
				`${domain}: denied stage minimum not met`,
			)
		}
	})

	test('buildExtraSeedDataset: disbursed first discount anchors vary and match calendar shape', () => {
		const disbursed = applications.filter((a) => a.status === 'disbursed')
		assert.ok(disbursed.length > 0)
		for (const app of disbursed) {
			const resolved = resolveAnchorForFixture(app, SEED_ANCHOR_REFERENCE_TODAY)
			assert.ok(resolved != null)
			assert.ok(
				isFirstDiscountAnchorCalendarShapeValid(app.salaryFrequency, resolved),
				`invalid anchor shape ${resolved.toISOString()} freq=${app.salaryFrequency}`,
			)
		}
		const activeDomains = seedCompanies
			.filter((c) => c.active)
			.map((c) => c.domain)
		for (const domain of activeDomains) {
			const companyDisbursed = disbursed.filter(
				(a) => a.companyDomain === domain,
			)
			if (companyDisbursed.length === 0) continue
			const keys = new Set<number>()
			for (const app of companyDisbursed) {
				const r = resolveAnchorForFixture(app, SEED_ANCHOR_REFERENCE_TODAY)
				if (r != null) keys.add(utcKey(r))
			}
			const n = companyDisbursed.length
			const minUnique = Math.min(40, Math.max(20, Math.floor(n * 0.15)))
			assert.ok(
				keys.size >= minUnique,
				`${domain}: need >=${minUnique} distinct first-discount calendar keys, got ${keys.size} (n=${n})`,
			)
		}
	})

	test('buildExtraSeedDataset: overdue profiles vary past-due payment counts', () => {
		const overdueLike = applications.filter(
			(a) =>
				a.status === 'disbursed' &&
				(a.afterCreditInsert === 'overdue' ||
					a.afterCreditInsert === 'installments-overdue'),
		)
		assert.ok(overdueLike.length > 0)
		const counts = overdueLike.map((a) =>
			pastDueCountForDisbursedFixture(a, SEED_ANCHOR_REFERENCE_TODAY),
		)
		const distinct = new Set(counts)
		assert.ok(
			distinct.size >= 8,
			`expected varied past-due counts across fixtures, got ${distinct.size} distinct: ${[...distinct].sort((x, y) => x - y).join(',')}`,
		)
		const activeDomains = seedCompanies
			.filter((c) => c.active)
			.map((c) => c.domain)
		for (const domain of activeDomains) {
			const subset = overdueLike.filter((a) => a.companyDomain === domain)
			if (subset.length < 15) continue
			const keys = new Set(
				subset.map((a) =>
					pastDueCountForDisbursedFixture(a, SEED_ANCHOR_REFERENCE_TODAY),
				),
			)
			const n = subset.length
			const minUnique = Math.min(8, Math.max(4, Math.floor(n * 0.07)))
			assert.ok(
				keys.size >= minUnique,
				`${domain}: need >=${minUnique} distinct past-due counts among overdue-like credits, got ${keys.size}`,
			)
		}
	})

	test('buildExtraSeedDataset: disbursed queue fixtures carry deterministic seed controls', () => {
		const disbursed = applications.filter((a) => a.status === 'disbursed')
		assert.ok(disbursed.length > 0)
		for (const app of disbursed) {
			if (
				app.afterCreditInsert === 'overdue' ||
				app.afterCreditInsert === 'installments-overdue'
			) {
				assert.equal(app.firstDiscount, 'historic-offset')
				assert.ok(
					app.firstDiscountMonthsAgo != null ||
						app.seedTargetPastDuePaymentCount != null,
				)
			}
			if (
				app.afterCreditInsert === 'deductions' ||
				app.afterCreditInsert === 'installments'
			) {
				assert.equal(app.firstDiscount, 'next-valid')
				assert.ok(app.firstDiscountNextValidPickIndex != null)
			}
		}
	})
})

test('seedApplications: invariants for capacity, term coverage, uniqueness and docs', () => {
	assert.ok(seedApplications.length > 0)
	const byCreditApplicant = seedApplications.filter(
		(a) => a.status === 'disbursed' && a.afterCreditInsert !== 'none',
	)
	const creditApplicantSet = new Set(
		byCreditApplicant.map((a) => a.applicantEmail),
	)
	assert.equal(
		creditApplicantSet.size,
		byCreditApplicant.length,
		'credit-bearing applicants should not repeat',
	)

	const usedTerms = new Set(
		seedApplications.map((a) => `${a.durationType}-${a.duration}`),
	)
	assert.ok(usedTerms.size >= MIN_GLOBAL_TERM_OPTIONS_USED)

	const docRejected = seedApplications.filter(
		(a) => a.documentDecision === 'rejected',
	)
	const rejectionRatio = docRejected.length / seedApplications.length
	assert.ok(rejectionRatio > 0.05 && rejectionRatio < 0.25)

	const keys = new Set<string>()
	for (const app of seedApplications) {
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
		const key = `${app.applicantEmail}|${app.companyDomain}|${app.durationType}|${app.duration}|${app.creditAmount}`
		assert.ok(!keys.has(key))
		keys.add(key)
	}
})
