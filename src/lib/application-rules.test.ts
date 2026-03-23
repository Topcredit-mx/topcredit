import assert from 'node:assert/strict'
import test from 'node:test'
import {
	canTransitionToApplicationStatus,
	statusRequiresFinancialTerms,
} from '~/lib/application-rules'

test('requires financial terms for pre-authorized, awaiting-authorization, and authorized', () => {
	assert.equal(statusRequiresFinancialTerms('pending'), false)
	assert.equal(statusRequiresFinancialTerms('approved'), false)
	assert.equal(statusRequiresFinancialTerms('pre-authorized'), true)
	assert.equal(statusRequiresFinancialTerms('awaiting-authorization'), true)
	assert.equal(statusRequiresFinancialTerms('authorized'), true)
})

test('allows requests review transitions from both new and pending', () => {
	assert.equal(canTransitionToApplicationStatus('new', 'approved'), true)
	assert.equal(
		canTransitionToApplicationStatus('new', 'invalid-documentation'),
		true,
	)
	assert.equal(canTransitionToApplicationStatus('new', 'denied'), true)
	assert.equal(canTransitionToApplicationStatus('pending', 'approved'), true)
	assert.equal(
		canTransitionToApplicationStatus('pending', 'invalid-documentation'),
		true,
	)
	assert.equal(canTransitionToApplicationStatus('pending', 'denied'), true)
	assert.equal(canTransitionToApplicationStatus('approved', 'approved'), false)
})

test('allows returning to pending after invalid documentation is corrected', () => {
	assert.equal(
		canTransitionToApplicationStatus('invalid-documentation', 'pending'),
		true,
	)
	assert.equal(canTransitionToApplicationStatus('denied', 'pending'), false)
})

test('allows pre-authorization only from approved', () => {
	assert.equal(
		canTransitionToApplicationStatus('approved', 'pre-authorized'),
		true,
	)
	assert.equal(
		canTransitionToApplicationStatus('pending', 'pre-authorized'),
		false,
	)
	assert.equal(
		canTransitionToApplicationStatus('pre-authorized', 'pre-authorized'),
		false,
	)
})

test('allows awaiting-authorization only from pre-authorized', () => {
	assert.equal(
		canTransitionToApplicationStatus(
			'pre-authorized',
			'awaiting-authorization',
		),
		true,
	)
	assert.equal(
		canTransitionToApplicationStatus('approved', 'awaiting-authorization'),
		false,
	)
})

test('allows authorization only from awaiting-authorization', () => {
	assert.equal(
		canTransitionToApplicationStatus('awaiting-authorization', 'authorized'),
		true,
	)
	assert.equal(
		canTransitionToApplicationStatus('pre-authorized', 'authorized'),
		false,
	)
	assert.equal(
		canTransitionToApplicationStatus('approved', 'authorized'),
		false,
	)
})

test('does not allow reverting to pre-authorized from awaiting-authorization', () => {
	assert.equal(
		canTransitionToApplicationStatus(
			'awaiting-authorization',
			'pre-authorized',
		),
		false,
	)
})

test('allows denials from each review stage only', () => {
	assert.equal(canTransitionToApplicationStatus('approved', 'denied'), true)
	assert.equal(
		canTransitionToApplicationStatus('pre-authorized', 'denied'),
		true,
	)
	assert.equal(
		canTransitionToApplicationStatus('awaiting-authorization', 'denied'),
		true,
	)
	assert.equal(canTransitionToApplicationStatus('authorized', 'denied'), false)
})
