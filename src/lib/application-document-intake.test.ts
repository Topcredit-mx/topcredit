import assert from 'node:assert/strict'
import test from 'node:test'
import {
	getLatestDocumentByType,
	getRequiredInitialDocumentFieldName,
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
	REQUIRED_INITIAL_APPLICATION_DOCUMENTS,
} from './application-document-intake'

const t1 = new Date('2025-01-10T12:00:00Z')
const t2 = new Date('2025-01-12T12:00:00Z')

test('getLatestDocumentByType: picks newest by createdAt regardless of array order', () => {
	const older = {
		documentType: 'contract' as const,
		createdAt: t1,
		status: 'pending' as const,
	}
	const newer = {
		documentType: 'contract' as const,
		createdAt: t2,
		status: 'pending' as const,
	}
	assert.deepEqual(getLatestDocumentByType([newer, older], 'contract'), newer)
	assert.deepEqual(getLatestDocumentByType([older, newer], 'contract'), newer)
})

test('getLatestDocumentByType: breaks ties on createdAt with higher id when both have id', () => {
	const a = {
		id: 1,
		documentType: 'contract' as const,
		createdAt: t1,
	}
	const b = {
		id: 2,
		documentType: 'contract' as const,
		createdAt: t1,
	}
	assert.deepEqual(getLatestDocumentByType([a, b], 'contract'), b)
	assert.deepEqual(getLatestDocumentByType([b, a], 'contract'), b)
})

test('getLatestDocumentByType: undefined when no row for type', () => {
	assert.equal(
		getLatestDocumentByType(
			[
				{
					documentType: 'authorization',
					createdAt: t1,
				},
			],
			'contract',
		),
		undefined,
	)
})

test('REQUIRED_INITIAL_APPLICATION_DOCUMENTS lists official-id, proof-of-address, bank-statement in order', () => {
	assert.deepEqual(
		REQUIRED_INITIAL_APPLICATION_DOCUMENTS.map((d) => d.documentType),
		['official-id', 'proof-of-address', 'bank-statement'],
	)
	assert.deepEqual(
		REQUIRED_INITIAL_APPLICATION_DOCUMENTS.map((d) => d.fieldName),
		['officialIdFile', 'proofOfAddressFile', 'bankStatementFile'],
	)
})

test('getRequiredInitialDocumentFieldName maps initial document types', () => {
	assert.equal(
		getRequiredInitialDocumentFieldName('official-id'),
		'officialIdFile',
	)
	assert.equal(
		getRequiredInitialDocumentFieldName('proof-of-address'),
		'proofOfAddressFile',
	)
	assert.equal(
		getRequiredInitialDocumentFieldName('bank-statement'),
		'bankStatementFile',
	)
})

test('PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES lists payroll-receipt, contract, authorization', () => {
	assert.deepEqual(PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES, [
		'payroll-receipt',
		'contract',
		'authorization',
	])
})
