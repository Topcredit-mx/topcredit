import { test } from '@playwright/test'
import { assertDbEmptyIfConfigured } from './db-guard'

export function registerDbSpecGuards(): void {
	test.afterAll(async () => {
		await assertDbEmptyIfConfigured()
	})
}
