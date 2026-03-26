import type { AppAbility } from '~/lib/define-ability-for'
import { subject } from '~/lib/define-ability-for'
import type { ApplicationStatus, DocumentType } from '~/server/db/schema'

export function canSetApplicationDocumentReviewStatus(
	ability: AppAbility,
	documentType: DocumentType,
	application: {
		id: number
		applicantId: number
		companyId: number
		status: ApplicationStatus
	},
): boolean {
	return ability.can(
		'setApplicationDocumentStatus',
		subject('ApplicationDocument', {
			documentType,
			applicationId: application.id,
			applicantId: application.applicantId,
			companyId: application.companyId,
			applicationStatus: application.status,
		}),
	)
}
