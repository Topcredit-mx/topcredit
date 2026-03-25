export const EQUIPO_APPLICATION_DETAIL_LOAD_MS = 15_000

/** Pre-auth package has 3 document types; server refresh must run before authorize unlocks. */
export const EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT = 3

export function assertEquipoApplicationDetailLoaded() {
	cy.contains(/detalle de solicitud/i).should('be.visible')
}

export function openEquipoApplicationActions() {
	cy.get('[data-equipo-application-detail]', {
		timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
	}).should('be.visible')
	cy.get('[data-equipo-application-primary-actions="trigger"]', {
		timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
	})
		.first()
		.should('be.visible')
		.click()
}

export function dismissEquipoApplicationActionsMenu() {
	cy.get('body').type('{esc}')
	cy.get('body').should('not.have.attr', 'data-scroll-locked')
}

export function assertEquipoDocumentRowStatus(
	fileName: string,
	status: string,
	containSubstring?: string,
	getOptions?: { timeout?: number },
) {
	const row = cy
		.get(
			`[data-equipo-application-documents-list] li[data-document-file-name="${fileName}"]`,
			getOptions,
		)
		.first()
		.should('have.attr', 'data-status', status)
	if (containSubstring !== undefined) {
		row.and('contain', containSubstring)
	}
}

export function withinEquipoDocumentRowByFileName(
	fileName: string,
	fn: () => void,
) {
	cy.get(
		`[data-equipo-application-documents-list] li[data-document-file-name="${fileName}"]`,
	)
		.first()
		.should('be.visible')
		.scrollIntoView()
		.within(fn)
}

export function selectDocumentDecisionInRow(
	fileName: string,
	value: 'approve' | 'reject' | 'unchanged',
) {
	if (value === 'unchanged') {
		return
	}
	withinEquipoDocumentRowByFileName(fileName, () => {
		cy.get(`[data-document-decision-button="${value}"]`)
			.should('be.visible')
			.click({ force: true })
		if (value === 'reject') {
			cy.get('textarea', { timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS }).should(
				'be.visible',
			)
		} else {
			cy.get(`[data-document-decision-button="${value}"]`).should(
				'have.attr',
				'aria-pressed',
				'true',
			)
		}
	})
}

/** Approve every listed file in one submit (bulk document decisions + authorize when applicable). */
export function approveAuthorizationPackageDocumentsInOneSubmit(
	fileNames: readonly string[],
) {
	for (const fileName of fileNames) {
		selectDocumentDecisionInRow(fileName, 'approve')
	}
	cy.get('[data-documents-review-submit]')
		.should('have.attr', 'data-documents-review-kind', 'save-and-authorize')
		.should('be.visible')
		.click()
	for (const fileName of fileNames) {
		assertEquipoDocumentRowStatus(fileName, 'approved', undefined, {
			timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
		})
	}
}

export function assertEquipoDocumentRowsSortedByDocumentType() {
	cy.get('[data-equipo-application-documents-list] > li').then(($lis) => {
		const types = $lis
			.map((_, el) => el.getAttribute('data-document-type'))
			.get()
			.filter((t): t is string => t != null && t.length > 0)
		const sorted = [...types].sort((a, b) => a.localeCompare(b))
		expect(types).to.deep.equal(sorted)
	})
}

export function typeDocumentRejectionReasonInRow(
	fileName: string,
	text: string,
) {
	withinEquipoDocumentRowByFileName(fileName, () => {
		cy.get('textarea').type(text)
	})
}

export function submitEquipoDocumentReviewForm() {
	cy.get('[data-documents-review-submit]')
		.should('be.visible')
		.should('not.be.disabled')
		.click()
}

export function clickDocumentReviewAuthorizeOnly() {
	cy.get(
		'[data-documents-review-submit][data-documents-review-kind="authorize-only"]',
		{
			timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
		},
	)
		.should('be.visible')
		.should('not.be.disabled')
		.click()
}
