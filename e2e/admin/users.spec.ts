import { expect, type Page, test } from '@playwright/test'
import {
	adminUser,
	agentOnlyUser,
	applicantOnlyUser,
	companies,
	companyList,
	users,
} from '~/e2e/admin/users.fixtures'
import {
	assignCompanyToUser,
	assignRole,
	cleanupAdminUsers,
	deleteUserCompanyAssignmentsByEmail,
	removeRole,
	seedAdminUsers,
} from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { findTableRow, mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { clickRoleCheckbox, findRoleCheckbox } from '../helpers/users'

function adminUsersSearchInput(page: Page) {
	return page.locator('input[type="search"]').last()
}

registerDbSpecGuards()

test.describe('Admin Users', () => {
	test.beforeAll(async () => {
		await cleanupAdminUsers()
		await seedAdminUsers()
	})

	test.afterAll(async () => {
		await cleanupAdminUsers()
	})

	test.describe('Access Control', () => {
		test('redirects non-admin users to unauthorized page', async ({ page }) => {
			await loginPage(page, applicantOnlyUser.email)
			await page.goto('/equipo/users')
			await expect(
				page.getByRole('heading', { name: '403 - No Autorizado' }),
			).toBeVisible()
		})

		test('allows admin users to access users page', async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/users')
			await expect(adminUsersSearchInput(page)).toBeVisible()
		})

		test('does not allow requests-only users to access admin users page', async ({
			page,
		}) => {
			await loginPage(page, users.jane.email)
			await page.goto('/equipo/users')
			await expect(
				page.getByRole('heading', { name: '403 - No Autorizado' }),
			).toBeVisible()
		})

		test('does not allow applicant users to access admin users page', async ({
			page,
		}) => {
			await loginPage(page, applicantOnlyUser.email)
			await page.goto('/equipo/users')
			await expect(
				page.getByRole('heading', { name: '403 - No Autorizado' }),
			).toBeVisible()
		})
	})

	test.describe('Users List Display', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('displays users table with correct columns', async ({ page }) => {
			const usersTable = mainDataTable(page)
			const th = (rx: RegExp) =>
				usersTable.locator('thead th').filter({ hasText: rx }).first()
			await expect(th(/nombre/i)).toBeAttached()
			await expect(
				th(/nombre/i)
					.locator('svg[aria-hidden="true"]')
					.first(),
			).toBeAttached()
			await expect(th(/email/i)).toBeAttached()
			await expect(
				th(/email/i).locator('svg[aria-hidden="true"]').first(),
			).toBeAttached()
			await expect(th(/solicitudes/i)).toBeAttached()
			await expect(
				th(/solicitudes/i)
					.locator('svg[aria-hidden="true"]')
					.first(),
			).toBeAttached()
			const preauthTh = usersTable
				.locator('thead th')
				.filter({ hasText: /^Preautorizaciones$/ })
				.first()
			await expect(preauthTh).toBeAttached()
			await expect(
				preauthTh.locator('svg[aria-hidden="true"]').first(),
			).toBeAttached()
			const authTh = usersTable
				.locator('thead th')
				.filter({ hasText: /^Autorizaciones$/ })
				.first()
			await expect(authTh).toBeAttached()
			await expect(
				authTh.locator('svg[aria-hidden="true"]').first(),
			).toBeAttached()
			const rhTh = usersTable
				.locator('thead th')
				.filter({ hasText: /^RH$/ })
				.first()
			await expect(rhTh).toBeAttached()
			await expect(
				rhTh.locator('svg[aria-hidden="true"]').first(),
			).toBeAttached()
			await expect(th(/dispersiones/i)).toBeAttached()
			await expect(
				th(/dispersiones/i)
					.locator('svg[aria-hidden="true"]')
					.first(),
			).toBeAttached()
			await expect(th(/instalaciones/i)).toBeAttached()
			await expect(
				th(/instalaciones/i)
					.locator('svg[aria-hidden="true"]')
					.first(),
			).toBeAttached()
			await expect(th(/admin/i)).toBeAttached()
			await expect(
				th(/admin/i).locator('svg[aria-hidden="true"]').first(),
			).toBeAttached()
			await expect(
				page
					.locator('th', { hasText: /empresas/i })
					.locator('svg[aria-hidden="true"]')
					.first(),
			).toBeAttached()
			const createdTh = page.locator('th', { hasText: /fecha de creación/i })
			await expect(createdTh).toBeAttached()
			await expect(
				createdTh.locator('svg[aria-hidden="true"]').first(),
			).toBeAttached()
			await expect(
				usersTable.getByRole('columnheader', { name: /solicitante/i }),
			).toHaveCount(0)
		})

		test('displays agents', async ({ page }) => {
			await expect(page.getByText(users.jane.name)).toBeAttached()
			await expect(page.getByText(users.bob.name)).toBeAttached()
		})

		test('displays a checkbox for each assignable role column', async ({
			page,
		}) => {
			const row = findTableRow(page, users.jane.name)
			await expect(row.locator('button[role="checkbox"]')).toHaveCount(7)
		})
	})

	test.describe('Search Functionality', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('filters users by name', async ({ page }) => {
			await adminUsersSearchInput(page).fill('Jane')
			await expect(page).toHaveURL(/search=/)
			await expect(page.getByText(users.jane.name)).toBeAttached()
			await expect(page.getByText(users.bob.name)).toHaveCount(0)
		})

		test('filters users by email', async ({ page }) => {
			const search = adminUsersSearchInput(page)
			await search.clear()
			await search.fill('requests')
			await expect(page).toHaveURL(/search=/)
			await expect(page.getByText(users.jane.email)).toBeAttached()
			await expect(page.getByText(users.bob.email)).toHaveCount(0)
		})

		test('shows empty message when no users match filter', async ({ page }) => {
			await adminUsersSearchInput(page).fill('nonexistentuser')
			await expect(
				page.getByText(/no hay usuarios con estos criterios/i),
			).toBeVisible()
			await expect(page.getByRole('main').getByRole('table')).toHaveCount(0)
		})
	})

	test.describe('Pagination (server)', () => {
		test.beforeEach(async ({ page }) => {
			await cleanupAdminUsers()
			await seedAdminUsers()
			await loginPage(page, adminUser.email)
		})

		test('loads only the requested page size from the server', async ({
			page,
		}) => {
			await page.goto('/equipo/users?limit=2')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(page.locator('table tbody tr')).toHaveCount(2)
			await expect(page.getByText(users.jane.name)).toHaveCount(0)
		})

		test('navigates to the next page and shows the next slice of users', async ({
			page,
		}) => {
			await page.goto('/equipo/users?limit=2')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).getByText(users.jane.name)).toHaveCount(
				0,
			)

			await page.getByRole('button', { name: /siguiente/i }).click()
			await expect(page).toHaveURL(/page=2/)
			const table = mainDataTable(page)
			await expect(table.getByText(users.charlie.name)).toBeAttached()
			await expect(table.getByText(users.jane.name)).toBeAttached()
			await expect(table.getByText(adminUser.name)).toHaveCount(0)
		})

		test('opens a deep-linked page from the URL', async ({ page }) => {
			await page.goto('/equipo/users?page=3&limit=2')
			await expect(mainDataTable(page)).toBeVisible()
			const table = mainDataTable(page)
			await expect(table.getByText(agentOnlyUser.name)).toBeAttached()
			await expect(table.locator('tbody tr')).toHaveCount(1)
			await expect(table.getByText(adminUser.name)).toHaveCount(0)
		})
	})

	test.describe('Role Management', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('toggles role on checkbox click', async ({ page }) => {
			const row = findTableRow(page, users.jane.name)
			await row.scrollIntoViewIfNeeded()
			await clickRoleCheckbox(row, 'Admin')
			await expect(findRoleCheckbox(row, 'Admin')).toHaveAttribute(
				'aria-checked',
				'true',
			)

			await clickRoleCheckbox(row, 'Admin')
			await expect(findRoleCheckbox(row, 'Admin')).toHaveAttribute(
				'aria-checked',
				'false',
			)
		})

		test('allows admins to assign Liquidaciones role', async ({ page }) => {
			const row = findTableRow(page, users.jane.name)
			await row.scrollIntoViewIfNeeded()
			await clickRoleCheckbox(row, 'Liquidaciones')
			await expect(findRoleCheckbox(row, 'Liquidaciones')).toHaveAttribute(
				'aria-checked',
				'true',
			)

			await clickRoleCheckbox(row, 'Liquidaciones')
			await expect(findRoleCheckbox(row, 'Liquidaciones')).toHaveAttribute(
				'aria-checked',
				'false',
			)
		})

		test('shows checked state for users existing roles', async ({ page }) => {
			const row = findTableRow(page, users.jane.name)
			await expect(
				row.locator(
					'button[role="checkbox"][aria-label="Toggle Solicitudes role"]',
				),
			).toHaveAttribute('aria-checked', 'true')
			await expect(
				row.locator(
					'button[role="checkbox"][aria-label="Toggle Preautorizaciones role"]',
				),
			).toHaveAttribute('aria-checked', 'false')
			await expect(
				row.locator(
					'button[role="checkbox"][aria-label="Toggle Autorizaciones role"]',
				),
			).toHaveAttribute('aria-checked', 'false')
		})
	})

	test.describe('Column Visibility', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('toggles column visibility via View dropdown', async ({ page }) => {
			await adminUsersSearchInput(page)
				.locator('..')
				.locator('..')
				.locator('button[aria-haspopup="menu"]')
				.first()
				.click()
			await page.getByRole('menu').getByText(/email/i).click()
			await expect(
				mainDataTable(page).getByRole('columnheader', { name: /email/i }),
			).toHaveCount(0)
		})
	})

	test.describe('Self Admin Removal Confirmation', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('shows confirmation dialog when admin tries to remove their own admin role', async ({
			page,
		}) => {
			const row = findTableRow(page, 'Admin User')
			await row.scrollIntoViewIfNeeded()
			await clickRoleCheckbox(row, 'Admin')

			await expect(page.getByRole('alertdialog')).toBeVisible()
			await expect(
				page.getByText('¿Eliminar tu rol de administrador?'),
			).toBeVisible()
			await expect(
				page.getByText('Perderás acceso a esta página'),
			).toBeVisible()
		})

		test('keeps admin role when canceling the confirmation dialog', async ({
			page,
		}) => {
			const row = findTableRow(page, 'Admin User')
			await row.scrollIntoViewIfNeeded()
			await clickRoleCheckbox(row, 'Admin')

			await page
				.getByRole('alertdialog')
				.getByRole('button', { name: 'Cancelar' })
				.click()
			await expect(
				findRoleCheckbox(findTableRow(page, 'Admin User'), 'Admin'),
			).toHaveAttribute('aria-checked', 'true')
		})

		test('does NOT show confirmation dialog when removing admin role from another user', async ({
			page,
		}) => {
			const row = findTableRow(page, users.bob.name)
			await row.scrollIntoViewIfNeeded()
			await clickRoleCheckbox(row, 'Admin')

			await expect(findRoleCheckbox(row, 'Admin')).toHaveAttribute(
				'aria-checked',
				'false',
			)

			await assignRole({ email: users.bob.email, role: 'admin' })
		})

		test('removes admin role when confirming the dialog', async ({ page }) => {
			const row = findTableRow(page, 'Admin User')
			await row.scrollIntoViewIfNeeded()
			await clickRoleCheckbox(row, 'Admin')

			await page
				.getByRole('alertdialog')
				.getByRole('button', { name: 'Sí, eliminar mi rol de admin' })
				.click()

			await expect(
				page.getByRole('heading', { name: '403 - No Autorizado' }),
			).toBeVisible()

			await assignRole({ email: adminUser.email, role: 'admin' })
		})

		test('redirects to unauthorized when adding role after admin was removed in another screen', async ({
			page,
		}) => {
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await removeRole({ email: adminUser.email, role: 'admin' })

			const row = findTableRow(page, agentOnlyUser.name)
			await row.scrollIntoViewIfNeeded()
			await clickRoleCheckbox(row, 'Admin')

			await expect(page.getByText(/no autorizado|unauthorized/i)).toBeVisible()

			await assignRole({ email: adminUser.email, role: 'admin' })
		})

		test('redirects to unauthorized when reloading users screen after admin was removed in another screen', async ({
			page,
		}) => {
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await removeRole({ email: adminUser.email, role: 'admin' })

			await page.reload()
			await expect(page.getByText(/no autorizado|unauthorized/i)).toBeVisible()

			await assignRole({ email: adminUser.email, role: 'admin' })
		})
	})

	test.describe('Company Assignments', () => {
		async function openCompanyAssignmentsDialog(page: Page) {
			const row = findTableRow(page, agentOnlyUser.name)
			await row.scrollIntoViewIfNeeded()
			await row
				.locator('button[aria-label="Asignar empresas"]')
				.scrollIntoViewIfNeeded()
			await row.locator('button[aria-label="Asignar empresas"]').click()
		}

		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
		})

		test('shows "No companies assigned" for agent without assignments', async ({
			page,
		}) => {
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			const row = findTableRow(page, agentOnlyUser.name)
			await expect(
				row.getByText(/sin empresas|no companies|0 empresas/i),
			).toBeAttached()
		})

		test('displays assigned companies after assignment', async ({ page }) => {
			await assignCompanyToUser({
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			const row = findTableRow(page, agentOnlyUser.name)
			await expect(row.getByText(companies.acme.name)).toBeAttached()

			await deleteUserCompanyAssignmentsByEmail([agentOnlyUser.email])
		})

		test('opens company assignment dialog when clicking assign button', async ({
			page,
		}) => {
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			await expect(page.getByRole('dialog')).toBeVisible()
			await expect(page.getByText('Asignar Empresas')).toBeVisible()
		})

		test('lists all available companies in assignment dialog', async ({
			page,
		}) => {
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			const dialog = page.getByRole('dialog')
			for (const company of companyList) {
				await expect(
					dialog.getByText(company.name, { exact: true }).first(),
				).toBeVisible()
			}
		})

		test('assigns single company to agent', async ({ page }) => {
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			const dialog = page.getByRole('dialog')
			await dialog.getByText(companies.acme.name, { exact: true }).click()
			await dialog.getByRole('button', { name: 'Guardar' }).click()

			const row = findTableRow(page, agentOnlyUser.name)
			await expect(row.getByText(companies.acme.name)).toBeAttached()
		})

		test('assigns multiple companies to agent', async ({ page }) => {
			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			const dialog = page.getByRole('dialog')
			await dialog.getByText(companies.acme.name, { exact: true }).click()
			await dialog.getByText(companies.globex.name, { exact: true }).click()
			await dialog.getByRole('button', { name: 'Guardar' }).click()

			const row = findTableRow(page, agentOnlyUser.name)
			await expect(row.getByText(/2 empresas|acme|globex/i)).toBeAttached()
		})

		test('shows current assignments pre-checked when reopening dialog', async ({
			page,
		}) => {
			await assignCompanyToUser({
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			const dialog = page.getByRole('dialog')
			await expect(dialog.getByText(companies.acme.name)).toBeAttached()
			const label = dialog.locator('label', { hasText: companies.acme.name })
			const row = label.locator('..')
			await expect(row.locator('button[role="checkbox"]')).toHaveAttribute(
				'aria-checked',
				'true',
			)

			await deleteUserCompanyAssignmentsByEmail([agentOnlyUser.email])
		})

		test('shows list of assigned companies in assignment dialog', async ({
			page,
		}) => {
			await assignCompanyToUser({
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			const dialog = page.getByRole('dialog')
			await expect(dialog.getByText(companies.acme.name)).toBeAttached()
			await expect(dialog.getByText(companies.acme.domain)).toBeAttached()

			await deleteUserCompanyAssignmentsByEmail([agentOnlyUser.email])
		})

		test('removes one company assignment when unchecking and saving', async ({
			page,
		}) => {
			await assignCompanyToUser({
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})
			await assignCompanyToUser({
				userEmail: agentOnlyUser.email,
				companyDomain: companies.globex.domain,
			})

			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			const dialog = page.getByRole('dialog')
			await dialog.getByText(companies.acme.name, { exact: true }).click()
			await dialog.getByRole('button', { name: 'Guardar' }).click()

			const row = findTableRow(page, agentOnlyUser.name)
			await expect(row.getByText(companies.globex.name)).toBeAttached()
			await expect(row.getByText(companies.acme.name)).toHaveCount(0)

			await deleteUserCompanyAssignmentsByEmail([agentOnlyUser.email])
		})

		test('removes all company assignments when unchecking all and saving', async ({
			page,
		}) => {
			await assignCompanyToUser({
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			const dialog = page.getByRole('dialog')
			await dialog.getByText(companies.acme.name, { exact: true }).click()
			await dialog.getByRole('button', { name: 'Guardar' }).click()

			const row = findTableRow(page, agentOnlyUser.name)
			await expect(row.getByText(/sin empresas/i)).toBeAttached()

			await deleteUserCompanyAssignmentsByEmail([agentOnlyUser.email])
		})

		test('removal takes effect immediately without page reload', async ({
			page,
		}) => {
			await assignCompanyToUser({
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			await page.goto('/equipo/users')
			await expect(mainDataTable(page)).toBeVisible()

			await openCompanyAssignmentsDialog(page)

			const dialog = page.getByRole('dialog')
			await dialog.getByText(companies.acme.name, { exact: true }).click()
			await dialog.getByRole('button', { name: 'Guardar' }).click()

			const row = findTableRow(page, agentOnlyUser.name)
			await expect(row.getByText(/sin empresas/i)).toBeAttached()

			await deleteUserCompanyAssignmentsByEmail([agentOnlyUser.email])
		})

		test('keeps dialog open and shows error when save fails (e.g. network error)', async ({
			page,
		}) => {
			await assignCompanyToUser({
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			try {
				await page.goto('/equipo/users')
				await expect(mainDataTable(page)).toBeVisible()
				const row = findTableRow(page, agentOnlyUser.name)
				await expect(row.getByText(companies.acme.name)).toBeAttached()

				// Server Actions: POST with Next-Action header. Avoid blocking RSC/GET fetches.
				await page.route('**/*', (route) => {
					const r = route.request()
					if (r.method() !== 'POST' || r.headerValue('next-action') == null) {
						return route.continue()
					}
					return route.abort()
				})

				await openCompanyAssignmentsDialog(page)

				const dialog = page.getByRole('dialog')
				await dialog.getByText(companies.acme.name, { exact: true }).click()
				await dialog.getByRole('button', { name: 'Guardar' }).click()

				await expect(page.getByRole('dialog')).toBeVisible()
				await expect(
					page.locator('[data-sonner-toast][data-type="error"]'),
				).toBeAttached()

				// Stale table row from before the dialog; reload to assert server state unchanged.
				await page.reload()
				await expect(mainDataTable(page)).toBeVisible()
				const rowAfter = findTableRow(page, agentOnlyUser.name)
				await expect(rowAfter.getByText(companies.acme.name)).toBeAttached()
			} finally {
				await page.unroute('**/*')
				await deleteUserCompanyAssignmentsByEmail([agentOnlyUser.email])
			}
		})
	})
})
