import assert from 'node:assert/strict'
import test from 'node:test'
import { defineAbilityFor, subject } from './define-ability-for'

const appAwaiting = subject('Application', {
	id: 1,
	applicantId: 2,
	companyId: 10,
	status: 'awaiting-authorization' as const,
})

const appPending = subject('Application', {
	id: 2,
	applicantId: 3,
	companyId: 10,
	status: 'pending' as const,
})

const appAuthorized = subject('Application', {
	id: 3,
	applicantId: 4,
	companyId: 10,
	status: 'authorized' as const,
})

const authzPackageDocOnAuthorizedApp = subject('ApplicationDocument', {
	documentType: 'contract' as const,
	applicationId: 3,
	applicantId: 4,
	companyId: 10,
	applicationStatus: 'authorized' as const,
})

test('authorizations specialist can update and authorize at awaiting-authorization', () => {
	const ability = defineAbilityFor({
		roles: ['agent', 'authorizations'],
		assignedCompanyIds: [10],
		userId: 99,
	})
	assert.equal(ability.can('update', appAwaiting), true)
	assert.equal(ability.can('setStatusAuthorized', appAwaiting), true)
	assert.equal(ability.can('setStatusDenied', appAwaiting), true)
})

test('authorizations specialist can update package documents and reopen review on authorized application', () => {
	const ability = defineAbilityFor({
		roles: ['agent', 'authorizations'],
		assignedCompanyIds: [10],
		userId: 99,
	})
	assert.equal(ability.can('update', appAuthorized), true)
	assert.equal(ability.can('reopenAuthorizationReview', appAuthorized), true)
	assert.equal(
		ability.can('setApplicationDocumentStatus', authzPackageDocOnAuthorizedApp),
		true,
	)
	assert.equal(ability.can('setStatusAuthorized', appAuthorized), false)
})

test('requests agent cannot update authorized application or reopen authorization review', () => {
	const ability = defineAbilityFor({
		roles: ['agent', 'requests'],
		assignedCompanyIds: [10],
		userId: 99,
	})
	assert.equal(ability.can('update', appAuthorized), false)
	assert.equal(ability.can('reopenAuthorizationReview', appAuthorized), false)
})

test('requests agent cannot update application at awaiting-authorization', () => {
	const ability = defineAbilityFor({
		roles: ['agent', 'requests'],
		assignedCompanyIds: [10],
		userId: 99,
	})
	assert.equal(ability.can('update', appAwaiting), false)
	assert.equal(ability.can('setStatusAuthorized', appAwaiting), false)
})

test('requests agent can update pending application', () => {
	const ability = defineAbilityFor({
		roles: ['agent', 'requests'],
		assignedCompanyIds: [10],
		userId: 99,
	})
	assert.equal(ability.can('update', appPending), true)
})

test('multi-role requests and authorizations can update pending and awaiting-authorization', () => {
	const ability = defineAbilityFor({
		roles: ['agent', 'requests', 'authorizations'],
		assignedCompanyIds: [10],
		userId: 99,
	})
	assert.equal(ability.can('update', appPending), true)
	assert.equal(ability.can('update', appAwaiting), true)
})

test('authorizations without agent gets no company-scoped application rules', () => {
	const ability = defineAbilityFor({
		roles: ['authorizations'],
		assignedCompanyIds: [],
		userId: 99,
	})
	assert.equal(ability.can('update', appAwaiting), false)
	assert.equal(ability.can('setStatusAuthorized', appAwaiting), false)
})

test('admin can setStatusAuthorized at awaiting-authorization', () => {
	const ability = defineAbilityFor({
		roles: ['admin', 'agent'],
		assignedCompanyIds: [],
		userId: 1,
	})
	assert.equal(ability.can('setStatusAuthorized', appAwaiting), true)
})

const paymentCompany10 = subject('CreditPayment', { id: 1, companyId: 10 })
const paymentCompany99 = subject('CreditPayment', { id: 2, companyId: 99 })

test('hr+agent can confirmHrDeduction for assigned company, cannot confirmPaymentReceipt', () => {
	const ability = defineAbilityFor({
		roles: ['agent', 'hr'],
		assignedCompanyIds: [10],
		userId: 99,
	})
	assert.equal(ability.can('confirmHrDeduction', paymentCompany10), true)
	assert.equal(ability.can('confirmHrDeduction', paymentCompany99), false)
	assert.equal(ability.can('confirmPaymentReceipt', paymentCompany10), false)
})

test('payments+agent can confirmPaymentReceipt for assigned company, cannot confirmHrDeduction', () => {
	const ability = defineAbilityFor({
		roles: ['agent', 'payments'],
		assignedCompanyIds: [10],
		userId: 99,
	})
	assert.equal(ability.can('confirmPaymentReceipt', paymentCompany10), true)
	assert.equal(ability.can('confirmPaymentReceipt', paymentCompany99), false)
	assert.equal(ability.can('confirmHrDeduction', paymentCompany10), false)
})

test('admin can both confirmHrDeduction and confirmPaymentReceipt on any company', () => {
	const ability = defineAbilityFor({
		roles: ['admin'],
		assignedCompanyIds: [],
		userId: 1,
	})
	assert.equal(ability.can('confirmHrDeduction', paymentCompany10), true)
	assert.equal(ability.can('confirmHrDeduction', paymentCompany99), true)
	assert.equal(ability.can('confirmPaymentReceipt', paymentCompany10), true)
	assert.equal(ability.can('confirmPaymentReceipt', paymentCompany99), true)
})
