import { expect, type Page } from '@playwright/test'

const EQUIPO_APPLICATION_DETAIL_ROOT =
	'[aria-labelledby="equipo-application-detail-title"]'

export const EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT = 3
export const EQUIPO_INITIAL_INTAKE_DOCUMENT_COUNT = 3
export const EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT =
	EQUIPO_INITIAL_INTAKE_DOCUMENT_COUNT + EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT

export const EQUIPO_DOCUMENTS_CARD_SCOPE = '#equipo-application-documents-card'
export const EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE = `${EQUIPO_DOCUMENTS_CARD_SCOPE} form`

function documentsCard(page: Page) {
	return page.locator(EQUIPO_DOCUMENTS_CARD_SCOPE)
}

function documentRow(page: Page, fileName: string) {
	return documentsCard(page).locator('li', { hasText: fileName }).first()
}

function detailReviewForm(page: Page) {
	return page.locator(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
}

function documentsReviewActionBar(page: Page) {
	return detailReviewForm(page).getByRole('group', {
		name: /acciones de revisión de documentos/i,
	})
}

export function documentsReviewSubmitButton(page: Page) {
	return documentsReviewActionBar(page).locator('button[type="submit"]').first()
}

export async function expectEquipoDocumentsReviewSavedToast(
	page: Page,
): Promise<void> {
	const toaster = page.locator('[data-sonner-toaster]')
	await expect(
		toaster.getByText(/cambios en documentos guardados/i).first(),
	).toBeVisible()
}

export async function expectDocumentReviewBarSubmitDisabled(
	page: Page,
): Promise<void> {
	await expect(documentsReviewSubmitButton(page)).toBeDisabled()
}

export async function assertEquipoApplicationDetailLoaded(
	page: Page,
): Promise<void> {
	await expect(
		page.getByRole('heading', { name: /detalle de solicitud/i }),
	).toBeVisible()
}

function applicationDetailRoot(page: Page) {
	// Two regions can share `aria-labelledby="equipo-application-detail-title"`.
	// Prefer the last in document order (`.first()` can be a stale RSC tree).
	return page.locator(EQUIPO_APPLICATION_DETAIL_ROOT).last()
}

function applicationStatusStrip(page: Page) {
	// The detail page can render two <section> copies with the same
	// `aria-labelledby`. Prefer the last section; the status row (Estado + badge)
	// is its first `div` (child[0] is the h1).
	return page
		.locator('section[aria-labelledby="equipo-application-detail-title"]')
		.last()
		.locator('> div')
		.first()
}

export async function assertEquipoApplicationShowsAppStatus(
	page: Page,
	pattern: RegExp,
): Promise<void> {
	await expect(applicationStatusStrip(page)).toContainText(pattern, {
		timeout: 20_000,
	})
}

export async function openEquipoApplicationActions(page: Page): Promise<void> {
	const root = applicationDetailRoot(page)
	await expect(root).toBeVisible()
	await root
		.getByRole('button', { name: /acciones/i })
		.first()
		.click()
}

export async function dismissEquipoApplicationActionsMenu(
	page: Page,
): Promise<void> {
	await page.keyboard.press('Escape')
}

export async function assertEquipoDocumentRowStatus(
	page: Page,
	fileName: string,
	status: 'pending' | 'approved' | 'rejected',
	containSubstring?: string,
): Promise<void> {
	const row = documentRow(page, fileName)
	if (status === 'pending') {
		await expect(row.getByRole('button', { name: 'Aprobar' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
		await expect(row.getByRole('button', { name: 'Rechazar' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
	} else if (status === 'approved') {
		await expect(row.getByRole('button', { name: 'Aprobar' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)
	} else {
		await expect(row.getByRole('button', { name: 'Rechazar' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)
	}
	if (containSubstring !== undefined) {
		await expect(row).toContainText(containSubstring)
	}
}

export async function assertEquipoDocumentRowDecisionsDisabled(
	page: Page,
	fileName: string,
): Promise<void> {
	const row = documentRow(page, fileName)
	const inertFieldset = row.locator('fieldset[inert]')
	if ((await inertFieldset.count()) > 0) {
		await expect(inertFieldset.first()).toBeVisible()
	}
	await expect(row.locator('button[aria-label^="Aprobar"]')).toHaveAttribute(
		'aria-disabled',
		'true',
	)
	await expect(row.locator('button[aria-label^="Rechazar"]')).toHaveAttribute(
		'aria-disabled',
		'true',
	)
}

export async function selectDocumentDecisionInRow(
	page: Page,
	fileName: string,
	value: 'approve' | 'reject' | 'unchanged',
): Promise<void> {
	if (value === 'unchanged') {
		return
	}
	const ariaLabel = value === 'approve' ? 'Aprobar' : 'Rechazar'
	const row = documentRow(page, fileName)
	const btn = row.locator(`button[aria-label="${ariaLabel}"]`)
	await expect(btn).toBeVisible()
	await btn.click({ force: true })
	if (value === 'reject') {
		await expect(row.locator('textarea')).toBeVisible()
	} else {
		await expect(btn).toHaveAttribute('aria-pressed', 'true')
	}
}

export async function typeDocumentRejectionReasonInRow(
	page: Page,
	fileName: string,
	text: string,
): Promise<void> {
	const row = documentRow(page, fileName)
	await row.locator('textarea').fill(text)
}

export async function submitEquipoDocumentReviewForm(
	page: Page,
): Promise<void> {
	const submit = documentsReviewSubmitButton(page)
	await expect(submit).toBeVisible()
	await expect(submit).toBeEnabled()
	await submit.click()
}

export async function clickEquipoDocumentReviewSubmitByName(
	page: Page,
	name: RegExp,
): Promise<void> {
	const submit = documentsReviewActionBar(page)
		.getByRole('button', { name })
		.first()
	await expect(submit).toBeVisible()
	await expect(submit).toBeEnabled()
	await submit.click()
}

export async function clickDocumentReviewAuthorizeOnly(
	page: Page,
): Promise<void> {
	const submit = documentsReviewSubmitButton(page)
	await expect(submit).toBeVisible()
	await expect(submit).toBeEnabled()
	await expect(submit).toHaveAccessibleName(/autorizar la solicitud/i)
	await submit.click()
}

export async function expectDocumentReviewBarSubmitName(
	page: Page,
	pattern: RegExp,
): Promise<void> {
	const submit = documentsReviewSubmitButton(page)
	await expect(submit).toHaveAccessibleName(pattern)
}
