import { join } from 'node:path'
import { expect, type Locator, type Page } from '@playwright/test'

export const SAMPLE_DOCUMENT_WEBP = join(
	process.cwd(),
	'e2e/fixtures/sample-document.webp',
)
export const SAMPLE_DOCUMENT_FILE_NAME = 'sample-document.webp'

export const BROWSE_FILES_BUTTON = /examinar archivos/i

export const DOCUMENT_UPLOAD_STATUS = {
	pendingReview: /pendiente/i,
	uploaded: /cargado/i,
} as const

export const DOCUMENT_UPLOAD_EMPTY_STATUS = /sin cargar/i

export function postToCuentaApplicationUrl(id: number): RegExp {
	return new RegExp(`/cuenta/applications/${id}(?:/|$)`)
}

export async function waitForSuccessfulPost(
	page: Page,
	pattern: RegExp,
): Promise<void> {
	const response = await page.waitForResponse((res) => {
		if (res.request().method() !== 'POST') {
			return false
		}
		try {
			return pattern.test(new URL(res.url()).pathname)
		} catch {
			return false
		}
	})
	expect(response.status()).toBeLessThan(400)
}

export async function waitForPostToCuentaApplications(
	page: Page,
): Promise<void> {
	await waitForSuccessfulPost(page, /\/cuenta\/applications/)
}

export async function expectFileUploadControlIdle(
	container: Locator,
	browseButtonName: RegExp = BROWSE_FILES_BUTTON,
): Promise<void> {
	await expect(
		container.locator('button').filter({ hasText: /cargando/i }),
	).toHaveCount(0)
	await expect(
		container.locator('button').filter({ hasText: browseButtonName }),
	).toBeEnabled()
}

export async function expectDocumentUploadEmpty(
	container: Locator,
	params: {
		statusPattern?: RegExp | null
		fileName?: string
		browseButtonName?: RegExp
	} = {},
): Promise<void> {
	const fileName = params.fileName ?? SAMPLE_DOCUMENT_FILE_NAME
	if (params.statusPattern !== null) {
		await expect(
			container.getByText(params.statusPattern ?? DOCUMENT_UPLOAD_EMPTY_STATUS),
		).toBeVisible()
	}
	await expect(container.getByText(fileName)).toHaveCount(0)
	await expectFileUploadControlIdle(container, params.browseButtonName)
}

export async function expectDocumentUploadSuccess(
	container: Locator,
	params: {
		fileName?: string
		statusPattern: RegExp
	},
): Promise<void> {
	const fileName = params.fileName ?? SAMPLE_DOCUMENT_FILE_NAME
	await expect(
		container.locator('button').filter({ hasText: /cargando/i }),
	).toHaveCount(0)
	await expect(container.getByText(params.statusPattern)).toBeVisible()
	await expect(container.getByText(fileName)).toBeVisible()
}

export async function expectLocalFileSelectionVisible(
	container: Locator,
	params: {
		fileName?: string
		browseButtonName?: RegExp
	} = {},
): Promise<void> {
	const fileName = params.fileName ?? SAMPLE_DOCUMENT_FILE_NAME
	await expectFileUploadControlIdle(container, params.browseButtonName)
	await expect(container.getByText(fileName)).toBeVisible()
}

export async function uploadDocumentViaFileInput(params: {
	page: Page
	container: Locator
	fileInput: Locator
	postPattern: RegExp
	statusPattern: RegExp
	filePath?: string
	fileName?: string
	browseButtonName?: RegExp
	emptyStatusPattern?: RegExp | null
	skipEmptyAssertion?: boolean
}): Promise<void> {
	if (!params.skipEmptyAssertion) {
		await expectDocumentUploadEmpty(params.container, {
			statusPattern: params.emptyStatusPattern,
			fileName: params.fileName,
			browseButtonName: params.browseButtonName,
		})
	}
	const uploadPromise = waitForSuccessfulPost(params.page, params.postPattern)
	await params.fileInput.setInputFiles(params.filePath ?? SAMPLE_DOCUMENT_WEBP)
	await uploadPromise
	await expectDocumentUploadSuccess(params.container, {
		fileName: params.fileName,
		statusPattern: params.statusPattern,
	})
}

export async function pickLocalDocumentFile(params: {
	container: Locator
	fileInput: Locator
	filePath?: string
	fileName?: string
	browseButtonName?: RegExp
	emptyStatusPattern?: RegExp | null
	skipEmptyAssertion?: boolean
}): Promise<void> {
	if (!params.skipEmptyAssertion) {
		await expectDocumentUploadEmpty(params.container, {
			statusPattern: params.emptyStatusPattern ?? null,
			fileName: params.fileName,
			browseButtonName: params.browseButtonName,
		})
	}
	await params.fileInput.setInputFiles(params.filePath ?? SAMPLE_DOCUMENT_WEBP)
	await expectLocalFileSelectionVisible(params.container, {
		fileName: params.fileName,
		browseButtonName: params.browseButtonName,
	})
}

export function applicationDocumentSlot(
	page: Page,
	documentType:
		| 'official-id'
		| 'proof-of-address'
		| 'bank-statement'
		| 'payroll-receipt'
		| 'contract'
		| 'authorization',
): Locator {
	return page
		.locator(
			`section[aria-labelledby="cuenta-application-doc-${documentType}"]`,
		)
		.first()
}

export async function expectInitialIntakeDocumentsPendingOnDetail(
	page: Page,
): Promise<void> {
	const documentTypes = [
		'official-id',
		'proof-of-address',
		'bank-statement',
	] as const
	for (const documentType of documentTypes) {
		const slot = applicationDocumentSlot(page, documentType)
		await slot.scrollIntoViewIfNeeded()
		await expectDocumentUploadSuccess(slot, {
			statusPattern: DOCUMENT_UPLOAD_STATUS.pendingReview,
		})
	}
}

export async function expectDisbursementReceiptSuccess(
	page: Page,
	params: {
		transferReference: string
		fileName?: string
	},
): Promise<void> {
	const fileName = params.fileName ?? SAMPLE_DOCUMENT_FILE_NAME
	await expect(page.getByText(/dispersado/i).first()).toBeVisible()
	await expect(page.getByText(params.transferReference).first()).toBeVisible()
	await expect(page.getByText(fileName).first()).toBeVisible()
}
