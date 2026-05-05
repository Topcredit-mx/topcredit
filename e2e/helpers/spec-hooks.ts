import { test } from '@playwright/test'
import { assertDbEmptyIfConfigured } from './db-guard'

/**
 * Registers a file-scope `afterAll` that asserts the tracked tables are empty.
 * Call `registerDbSpecGuards()` before each file’s outer `test.describe` so Playwright
 * registers this hook first and runs it last; nested-suite `afterAll` cleanup hooks
 * (registered afterward) teardown seed data before the empty check runs.
 */
export function registerDbSpecGuards(): void {
	test.afterAll(async () => {
		await assertDbEmptyIfConfigured()
	})
}
