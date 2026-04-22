import type { Locator } from '@playwright/test'

export function findRoleCheckbox(row: Locator, roleLabel: string): Locator {
	return row.locator(
		`button[role="checkbox"][aria-label="Toggle ${roleLabel} role"]`,
	)
}

export async function clickRoleCheckbox(
	row: Locator,
	roleLabel: string,
): Promise<void> {
	const cb = findRoleCheckbox(row, roleLabel)
	await cb.scrollIntoViewIfNeeded()
	await cb.click({ force: true })
}
