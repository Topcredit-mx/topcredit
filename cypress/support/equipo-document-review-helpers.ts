/** Pre-auth package has 3 document types; server refresh must run before authorize unlocks. */
export const EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT = 3

/** Initial intake types already approved before the authorization package (realistic E2E). */
export const EQUIPO_INITIAL_INTAKE_DOCUMENT_COUNT = 3

/** Rows on awaiting-authorization detail: approved intake + authorization package (latest per type). */
export const EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT =
	EQUIPO_INITIAL_INTAKE_DOCUMENT_COUNT + EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT

const EQUIPO_APPLICATION_DETAIL_ROOT =
	'[aria-labelledby="equipo-application-detail-title"]'

export const EQUIPO_DOCUMENTS_CARD_SCOPE = '#equipo-application-documents-card'

export const EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE = `${EQUIPO_DOCUMENTS_CARD_SCOPE} form`

export function assertEquipoApplicationDetailLoaded() {
	cy.contains('h1', /detalle de solicitud/i).should('be.visible')
}

export function assertEquipoApplicationShowsAppStatus(pattern: RegExp) {
	cy.get(EQUIPO_APPLICATION_DETAIL_ROOT)
		.find('[role="status"]')
		.first()
		.should('be.visible')
		.invoke('text')
		.should('match', pattern)
}

export function openEquipoApplicationActions() {
	cy.get(EQUIPO_APPLICATION_DETAIL_ROOT).should('be.visible')
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
) {
	cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE).within(() => {
		cy.contains('li', fileName)
			.first()
			.within(() => {
				if (status === 'pending') {
					cy.get('button[aria-label="Aprobar"]').should(
						'have.attr',
						'aria-pressed',
						'false',
					)
					cy.get('button[aria-label="Rechazar"]').should(
						'have.attr',
						'aria-pressed',
						'false',
					)
				} else if (status === 'approved') {
					cy.get('button[aria-label="Aprobar"]').should(
						'have.attr',
						'aria-pressed',
						'true',
					)
				} else {
					cy.get('button[aria-label="Rechazar"]').should(
						'have.attr',
						'aria-pressed',
						'true',
					)
				}
			})
	})
	if (containSubstring !== undefined) {
		cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE).within(() => {
			cy.contains('li', fileName).first().should('contain', containSubstring)
		})
	}
}

export function assertEquipoDocumentRowDecisionsDisabled(fileName: string) {
	withinEquipoDocumentRowByFileName(fileName, () => {
		cy.get('fieldset').should('have.attr', 'inert')
		cy.get('button[aria-label^="Aprobar"]').should(
			'have.attr',
			'aria-disabled',
			'true',
		)
		cy.get('button[aria-label^="Rechazar"]').should(
			'have.attr',
			'aria-disabled',
			'true',
		)
	})
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
			cy.get('textarea').should('be.visible')
		} else {
			cy.get(`button[aria-label="${ariaLabel}"]`).should(
				'have.attr',
				'aria-pressed',
				'true',
			)
		}
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
	cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
		.find('.border-t.pt-4 button[type="submit"]')
		.first()
		.should('be.visible')
		.should('not.be.disabled')
		.click()
}

export function clickDocumentReviewAuthorizeOnly() {
	cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
		.find('.border-t.pt-4 button[type="submit"]')
		.first()
		.should('be.visible')
		.should('not.be.disabled')
		.should(($el) => {
			expect($el.text().trim()).to.match(/^autorizar$/i)
		})
		.click()
}
