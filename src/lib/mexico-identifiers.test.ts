import assert from 'node:assert/strict'
import test from 'node:test'
import {
	getClabeInstitutionName,
	validateClabe,
	validateIndividualRfc,
} from '~/lib/mexico-identifiers'
import { ValidationCode } from '~/lib/validation-codes'

test('accepts a valid individual RFC', () => {
	const result = validateIndividualRfc('GODE561231GR8')

	assert.deepEqual(result, { ok: true })
})

test('accepts RFC CAMD960511C57', () => {
	const result = validateIndividualRfc('CAMD960511C57')

	assert.deepEqual(result, { ok: true })
})

test('rejects an RFC with invalid length', () => {
	const result = validateIndividualRfc('ABC123')

	assert.deepEqual(result, {
		ok: false,
		code: ValidationCode.APPLICATION_RFC_LENGTH,
	})
})

test('rejects an RFC with an invalid date segment', () => {
	const result = validateIndividualRfc('ABCD991332ABC')

	assert.deepEqual(result, {
		ok: false,
		code: ValidationCode.APPLICATION_RFC_INVALID,
	})
})

test('rejects an RFC with an invalid check digit', () => {
	const result = validateIndividualRfc('GODE561231GR9')

	assert.deepEqual(result, {
		ok: false,
		code: ValidationCode.APPLICATION_RFC_INVALID,
	})
})

test('accepts a valid CLABE', () => {
	const result = validateClabe('032180000118359719')

	assert.deepEqual(result, { ok: true })
})

test('accepts CLABE 014580569257722968', () => {
	const result = validateClabe('014580569257722968')

	assert.deepEqual(result, { ok: true })
})

test('identifies Santander from CLABE 014580569257722968', () => {
	const result = getClabeInstitutionName('014580569257722968')

	assert.equal(result, 'SANTANDER')
})

test('identifies IXE from CLABE 032180000118359719', () => {
	const result = getClabeInstitutionName('032180000118359719')

	assert.equal(result, 'IXE')
})

test('returns null for malformed CLABE when identifying institution', () => {
	const result = getClabeInstitutionName('ABC')

	assert.equal(result, null)
})

test('rejects a CLABE with invalid length', () => {
	const result = validateClabe('1234567890')

	assert.deepEqual(result, {
		ok: false,
		code: ValidationCode.APPLICATION_CLABE_LENGTH,
	})
})

test('rejects a CLABE with a bad checksum', () => {
	const result = validateClabe('032180000118359718')

	assert.deepEqual(result, {
		ok: false,
		code: ValidationCode.APPLICATION_CLABE_INVALID,
	})
})
