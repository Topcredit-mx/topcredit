import type { BrowserContext, Page } from '@playwright/test'
import { login as loginTask } from '~/e2e/server/tasks'

const SESSION_COOKIE = 'next-auth.session-token'

export async function setSessionFromEmail(
	context: BrowserContext,
	email: string,
): Promise<void> {
	const token = await loginTask(email)
	await context.addCookies([
		{
			name: SESSION_COOKIE,
			value: token,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
		},
	])
}

export async function loginPage(page: Page, email: string): Promise<void> {
	const token = await loginTask(email)
	await page.context().addCookies([
		{
			name: SESSION_COOKIE,
			value: token,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
		},
	])
}
