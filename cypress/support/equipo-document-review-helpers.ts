export const EQUIPO_APPLICATION_DETAIL_LOAD_MS = 15_000

/** Pre-auth package has 3 document types; server refresh must run before authorize unlocks. */
export const EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT = 3

const EQUIPO_APPLICATION_DETAIL_ROOT =
	'[aria-labelledby="equipo-application-detail-title"]'

export const EQUIPO_DOCUMENTS_CARD_SCOPE = '#equipo-application-documents-card'

export const EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE = `${EQUIPO_DOCUMENTS_CARD_SCOPE} form`

function documentRowStatusPattern(
	status: 'pending' | 'approved' | 'rejected',
): RegExp {
	switch (status) {
		case 'pending':
			return /pendiente/i
		case 'approved':
			return /aprobado/i
		case 'rejected':
			return /rechazado/i
	}
}

export function assertEquipoApplicationDetailLoaded() {
	cy.contains('h1', /detalle de solicitud/i).should('be.visible')
}

export function assertEquipoApplicationShowsAppStatus(
	pattern: RegExp,
	options?: { timeout?: number },
) {
	cy.get(EQUIPO_APPLICATION_DETAIL_ROOT, options)
		.find('[role="status"]')
		.first()
		.should('be.visible')
		.invoke('text')
		.should('match', pattern)
}

export function openEquipoApplicationActions() {
	cy.get(EQUIPO_APPLICATION_DETAIL_ROOT, {
		timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
	}).should('be.visible')
	cy.get(EQUIPO_APPLICATION_DETAIL_ROOT).within(() => {
		cy.contains('button', /acciones/i)
			.first()
			.should('be.visible')
			.click()
	})
}

export function dismissEquipoApplicationActionsMenu() {
	cy.get('body').type('{esc}')
	cy.get('body').should('not.have.attr', 'data-scroll-locked')
}

export function assertEquipoDocumentRowStatus(
	fileName: string,
	status: 'pending' | 'approved' | 'rejected',
	containSubstring?: string,
	getOptions?: { timeout?: number },
) {
	const pattern = documentRowStatusPattern(status)
	cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE, getOptions).within(() => {
		cy.contains('li', fileName)
			.first()
			.within(() => {
				cy.contains(pattern).should('be.visible')
			})
	})
	if (containSubstring !== undefined) {
		cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE, getOptions).within(() => {
			cy.contains('li', fileName).first().should('contain', containSubstring)
		})
	}
}

export function withinEquipoDocumentRowByFileName(
	fileName: string,
	fn: () => void,
) {
	cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE)
		.should('be.visible')
		.within(() => {
			cy.contains('li', fileName)
				.first()
				.should('be.visible')
				.scrollIntoView()
				.within(fn)
		})
}

export function selectDocumentDecisionInRow(
	fileName: string,
	value: 'approve' | 'reject' | 'unchanged',
) {
	if (value === 'unchanged') {
		return
	}
	const ariaLabel = value === 'approve' ? 'Aprobar' : 'Rechazar'
	withinEquipoDocumentRowByFileName(fileName, () => {
		cy.get(`button[aria-label="${ariaLabel}"]`)
			.should('be.visible')
			.click({ force: true })
		if (value === 'reject') {
			cy.get('textarea', { timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS }).should(
				'be.visible',
			)
		} else {
			cy.get(`button[aria-label="${ariaLabel}"]`).should(
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
	cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
		.find('.border-t.pt-4 button[type="submit"]')
		.first()
		.should('be.visible')
		.should('not.be.disabled')
		.should(($btn) => {
			const label = $btn.text().replace(/\s+/g, ' ').trim()
			expect(label).to.match(/guardar y autorizar/i)
		})
		.click()
	for (const fileName of fileNames) {
		assertEquipoDocumentRowStatus(fileName, 'approved', undefined, {
			timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
		})
	}
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
	cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
		.find('.border-t.pt-4 button[type="submit"]')
		.first()
		.should('be.visible')
		.should('not.be.disabled')
		.click()
}

export function clickDocumentReviewAuthorizeOnly() {
	cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE, {
		timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
	})
		.find('.border-t.pt-4 button[type="submit"]')
		.first()
		.should('be.visible')
		.should('not.be.disabled')
		.should(($el) => {
			expect($el.text().trim()).to.match(/^autorizar$/i)
		})
		.click()
}
