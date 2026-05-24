import assert from 'node:assert/strict'
import test from 'node:test'
import { isSessionStaleForUser, parseTokenIssuedAt } from './session-validity'

test('parseTokenIssuedAt returns seconds for valid iat', () => {
	assert.equal(parseTokenIssuedAt(1_700_000_000), 1_700_000_000)
})

test('parseTokenIssuedAt returns null for invalid iat', () => {
	assert.equal(parseTokenIssuedAt(undefined), null)
	assert.equal(parseTokenIssuedAt('1700000000'), null)
	assert.equal(parseTokenIssuedAt(0), null)
})

test('isSessionStaleForUser is true when user row was created after token issue', () => {
	const tokenIssuedAt = Math.floor(Date.parse('2026-05-24T15:00:00Z') / 1000)
	const userCreatedAt = new Date('2026-05-24T15:30:00Z')
	assert.equal(isSessionStaleForUser(userCreatedAt, tokenIssuedAt), true)
})

test('isSessionStaleForUser is false when user existed before token issue', () => {
	const tokenIssuedAt = Math.floor(Date.parse('2026-05-24T15:30:00Z') / 1000)
	const userCreatedAt = new Date('2026-05-24T15:00:00Z')
	assert.equal(isSessionStaleForUser(userCreatedAt, tokenIssuedAt), false)
})
