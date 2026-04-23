import { test } from '@playwright/test'
import { assertDbEmptyIfConfigured } from './db-guard'

/**
 * After hooks run in registration order. Defer the empty-DB check so the spec file’s
 * own `test.afterAll` (cleanup/seed tear-down) can register first and run first.
 */
export function registerDbSpecGuards(): void {
	queueMicrotask(() => {
		test.afterAll(async () => {
			await assertDbEmptyIfConfigured()
		})
	})
}
