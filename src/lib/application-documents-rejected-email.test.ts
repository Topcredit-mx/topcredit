import assert from 'node:assert/strict'
import test from 'node:test'
import { partitionRejectedDocumentsForEmail } from '~/lib/application-documents-rejected-email'
import { ValidationCode } from '~/lib/validation-codes'
import { applyApplicationDocumentDecisionsSchema } from '~/server/schemas'

test('applyApplicationDocumentDecisionsSchema rejects duplicate document ids', () => {
	const result = applyApplicationDocumentDecisionsSchema.safeParse({
		applicationId: 1,
		decisions: [
			{
				documentId: 5,
				status: 'approved',
				rejectionReason: null,
			},
			{
				documentId: 5,
				status: 'rejected',
				rejectionReason: 'x',
			},
		],
	})
	assert.equal(result.success, false)
	if (!result.success) {
		assert.equal(
			result.error.issues[0]?.message,
			ValidationCode.APPLICATIONS_DOCUMENT_INVALID,
		)
	}
})

test('applyApplicationDocumentDecisionsSchema rejects when rejection reason is blank', () => {
	const result = applyApplicationDocumentDecisionsSchema.safeParse({
		applicationId: 1,
		decisions: [
			{
				documentId: 5,
				status: 'rejected',
				rejectionReason: '   ',
			},
		],
	})
	assert.equal(result.success, false)
})

test('applyApplicationDocumentDecisionsSchema accepts empty decisions with followUp', () => {
	const result = applyApplicationDocumentDecisionsSchema.safeParse({
		applicationId: 1,
		decisions: [],
		followUpStatus: 'authorized',
	})
	assert.equal(result.success, true)
})

test('applyApplicationDocumentDecisionsSchema rejects empty decisions without followUp', () => {
	const result = applyApplicationDocumentDecisionsSchema.safeParse({
		applicationId: 1,
		decisions: [],
	})
	assert.equal(result.success, false)
})

test('partitionRejectedDocumentsForEmail splits initial vs authorization package types', () => {
	const result = partitionRejectedDocumentsForEmail([
		{ documentType: 'official-id', reason: 'a' },
		{ documentType: 'authorization', reason: 'b' },
	])
	assert.deepEqual(result.initialRequest, [
		{ documentType: 'official-id', reason: 'a' },
	])
	assert.deepEqual(result.authorizationPackage, [
		{ documentType: 'authorization', reason: 'b' },
	])
})

test('partitionRejectedDocumentsForEmail places bank-statement in initial request', () => {
	const result = partitionRejectedDocumentsForEmail([
		{ documentType: 'bank-statement', reason: 'x' },
	])
	assert.equal(result.initialRequest.length, 1)
	assert.equal(result.authorizationPackage.length, 0)
})
