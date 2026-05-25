import { test } from '@playwright/test'
import { assertDbEmptyIfConfigured } from './db-guard'

/**
 * Registers a file-scope `afterAll` that asserts tracked tables are empty.
 * Use `registerDbSpecTeardown` when this file also needs file-scope cleanup.
 * For describe-scoped cleanup, call this at file scope after the describe block
 * so inner `afterAll` hooks run before the guard.
 */
export function registerDbSpecGuards(): void {
	test.afterAll(async () => {
		await assertDbEmptyIfConfigured()
	})
}

export function registerDbSpecTeardown(cleanup: () => Promise<void>): void {
	test.afterAll(async () => {
		await cleanup()
		await assertDbEmptyIfConfigured()
	})
}
