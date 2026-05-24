import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseQueueBulkConfirmJobStatus } from './queue-bulk-confirm-status'

describe('parseQueueBulkConfirmJobStatus', () => {
	test('parses running jobs', () => {
		const result = parseQueueBulkConfirmJobStatus({
			status: 'running',
			totalCount: 10,
			processedCount: 2,
			succeededCount: 2,
			failedCount: 0,
			errorMessage: null,
		})

		assert.deepEqual(result, {
			phase: 'running',
			processedCount: 2,
			totalCount: 10,
			succeededCount: 2,
			failedCount: 0,
			errorMessage: null,
		})
	})

	test('parses terminal jobs', () => {
		const result = parseQueueBulkConfirmJobStatus({
			status: 'partial',
			totalCount: 5,
			processedCount: 5,
			succeededCount: 3,
			failedCount: 2,
			errorMessage: null,
		})

		assert.deepEqual(result, {
			phase: 'terminal',
			terminalOutcome: 'partial',
			processedCount: 5,
			totalCount: 5,
			succeededCount: 3,
			failedCount: 2,
			errorMessage: null,
		})
	})

	test('rejects invalid payloads', () => {
		assert.equal(parseQueueBulkConfirmJobStatus(null), null)
		assert.equal(parseQueueBulkConfirmJobStatus({ status: 'unknown' }), null)
	})
})
