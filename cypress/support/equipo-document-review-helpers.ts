export const EQUIPO_APPLICATION_DETAIL_LOAD_MS = 15_000

export const EQUIPO_DOCUMENTS_SAVE_BUTTON_RE = /guardar cambios en documentos/i

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

export function withinEquipoDocumentRowByFileName(
	fileName: string,
	fn: () => void,
) {
	cy.get(
		`[data-equipo-application-documents-list] li[data-document-file-name="${fileName}"]`,
	)
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

/** Approve every listed file in one submit (bulk document decisions). */
export function approveAuthorizationPackageDocumentsInOneSubmit(
	fileNames: readonly string[],
) {
	for (const fileName of fileNames) {
		selectDocumentDecisionInRow(fileName, 'approve')
	}
	submitEquipoDocumentReviewForm()
	for (const fileName of fileNames) {
		cy.get(
			`[data-equipo-application-documents-list] li[data-document-file-name="${fileName}"]`,
			{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
		).should('have.attr', 'data-status', 'approved')
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
	cy.contains('button', EQUIPO_DOCUMENTS_SAVE_BUTTON_RE)
		.should('be.visible')
		.click()
}

export function waitForEquipoAuthorizationPackageApprovedInUi() {
	cy.get(
		'[data-equipo-application-documents-list] > li[data-status="approved"]',
		{
			timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
		},
	).should('have.length', EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT)
}

export function clickAuthorizeApplicationWhenReady() {
	cy.get('[data-slot="dropdown-menu-content"][data-state="open"]', {
		timeout: 15_000,
	})
		.should('be.visible')
		.within(() => {
			cy.get('[data-authorize-menu-item="ready"]', { timeout: 15_000 })
				.should('be.visible')
				.click({ force: true })
		})
}
