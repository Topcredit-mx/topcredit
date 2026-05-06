import { test } from '@playwright/test'
import { assertDbEmptyIfConfigured } from './db-guard'

/**
 * Registers a file-scope `afterAll` that asserts the tracked tables are empty.
 * Register same-scope cleanup hooks before this guard. If cleanup lives inside
 * `test.describe`, keep this guard at file scope so nested cleanup runs before it.
 */
export function registerDbSpecGuards(): void {
	test.afterAll(async () => {
		await assertDbEmptyIfConfigured()
	})
}
