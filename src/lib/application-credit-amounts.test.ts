import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveApplicationCreditAmounts } from './application-credit-amounts'

test('resolveApplicationCreditAmounts uses pre-authorized amount when applicant has not requested', () => {
	const result = resolveApplicationCreditAmounts('30000.00', null)
	assert.equal(result.preAuthorizedAmount, '30000.00')
	assert.equal(result.applicantRequestedAmount, null)
	assert.equal(result.operativeAmount, '30000.00')
	assert.equal(result.hasReducedApplicantRequest, false)
})

test('resolveApplicationCreditAmounts treats equal applicant request as not reduced', () => {
	const result = resolveApplicationCreditAmounts('30000.00', '30000.00')
	assert.equal(result.operativeAmount, '30000.00')
	assert.equal(result.hasReducedApplicantRequest, false)
})

test('resolveApplicationCreditAmounts detects reduced applicant request', () => {
	const result = resolveApplicationCreditAmounts('30000.00', '20000.00')
	assert.equal(result.operativeAmount, '20000.00')
	assert.equal(result.hasReducedApplicantRequest, true)
})

test('resolveApplicationCreditAmounts handles missing pre-authorized amount', () => {
	const result = resolveApplicationCreditAmounts(null, '20000.00')
	assert.equal(result.preAuthorizedAmount, null)
	assert.equal(result.operativeAmount, '20000.00')
	assert.equal(result.hasReducedApplicantRequest, false)
})
