import {
	AbilityBuilder,
	createMongoAbility,
	type ForcedSubject,
	type MongoAbility,
	subject,
} from '@casl/ability'
import {
	INITIAL_APPLICATION_DOCUMENT_TYPES,
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
} from '~/lib/application-document-intake'
import {
	type ApplicantEligibilityData,
	isEligibleForNewApplication,
} from '~/lib/application-rules'
import type {
	ApplicationStatus,
	CreditStatus,
	DocumentType,
} from '~/server/db/schema'

export { subject }

export type AppAction =
	| 'manage'
	| 'create'
	| 'read'
	| 'update'
	| 'delete'
	| 'uploadDocument'
	| 'setApplicationDocumentStatus'
	| 'setStatusApproved'
	| 'setStatusDenied'
	| 'setStatusPreAuthorized'
	| 'setStatusAwaitingAuthorization'
	| 'setStatusAuthorized'
	| 'setFirstDiscountDate'
	| 'reopenAuthorizationReview'
	| 'disburse'
	| 'confirmHrDeduction'
	| 'confirmInstallment'
	| 'requestLiquidation'
	| 'acceptLiquidationRequest'
	| 'denyLiquidationRequest'
export type AppSubject =
	| 'Company'
	| 'User'
	| 'Admin'
	| 'Application'
	| 'ApplicationDocument'
	| 'Credit'
	| 'CreditPayment'
	| 'CreditLiquidationRequest'
	| 'all'

export type CompanySubject = { id: number } & ForcedSubject<'Company'>
export type UserSubject = { id: number } & ForcedSubject<'User'>
export type ApplicationSubject = {
	id: number
	applicantId: number
	companyId?: number
	status?: ApplicationStatus
	firstDiscountDate?: Date | null
} & ForcedSubject<'Application'>

export type ApplicationDocumentSubject = {
	documentType: DocumentType
	applicationId: number
	applicantId: number
	companyId: number
	applicationStatus: ApplicationStatus
} & ForcedSubject<'ApplicationDocument'>

export type CreditSubject = {
	id: number
	applicantId: number
	companyId?: number
	status?: CreditStatus
} & ForcedSubject<'Credit'>

export type CreditPaymentSubject = {
	id: number
	companyId: number
} & ForcedSubject<'CreditPayment'>

export type CreditLiquidationRequestSubject = {
	id: number
	creditId: number
	applicantId: number
	companyId: number
	status: 'pending' | 'accepted' | 'denied'
} & ForcedSubject<'CreditLiquidationRequest'>

export type AppAbility = MongoAbility<
	[
		AppAction,
		(
			| AppSubject
			| CompanySubject
			| UserSubject
			| ApplicationSubject
			| ApplicationDocumentSubject
			| CreditSubject
			| CreditPaymentSubject
			| CreditLiquidationRequestSubject
		),
	]
>

export type AbilityContext = {
	roles: string[]
	assignedCompanyIds: number[]
	userId?: number
	applicantEligibilityData?: ApplicantEligibilityData | null
}

export function defineAbilityFor(ctx: AbilityContext): AppAbility {
	const { can, cannot, build } = new AbilityBuilder<AppAbility>(
		createMongoAbility,
	)

	if (!ctx.userId) {
		return build()
	}

	const isAdmin = ctx.roles.includes('admin')
	const isAgent = ctx.roles.includes('agent')
	const isRequests = ctx.roles.includes('requests')
	const isPreAuthorizations = ctx.roles.includes('pre-authorizations')
	const isAuthorizations = ctx.roles.includes('authorizations')
	const isApplicant = ctx.roles.includes('applicant')
	const hasCompanyAssignments = ctx.assignedCompanyIds.length > 0

	can('read', 'User', { id: ctx.userId })
	can('update', 'User', { id: ctx.userId })

	if (isApplicant) {
		if (isEligibleForNewApplication(ctx.applicantEligibilityData)) {
			can('create', 'Application')
		}
		can('read', 'Application', { applicantId: ctx.userId })
		can('read', 'Credit', { applicantId: ctx.userId })
		can('read', 'CreditLiquidationRequest', { applicantId: ctx.userId })
		can('requestLiquidation', 'Credit', {
			applicantId: ctx.userId,
			status: 'dispersed',
		})
		can('uploadDocument', 'Application', { applicantId: ctx.userId })
		can('setStatusAwaitingAuthorization', 'Application', {
			applicantId: ctx.userId,
			status: 'pre-authorized',
		})
		return build()
	}

	if (isAdmin) {
		can('manage', 'all')
		can('confirmHrDeduction', 'CreditPayment')
		can('confirmInstallment', 'CreditPayment')
		can('read', 'CreditLiquidationRequest')
		can('acceptLiquidationRequest', 'CreditLiquidationRequest', {
			status: 'pending',
		})
		can('denyLiquidationRequest', 'CreditLiquidationRequest', {
			status: 'pending',
		})
		can('reopenAuthorizationReview', 'Application')
		can('setFirstDiscountDate', 'Application', {
			status: 'authorized',
			firstDiscountDate: null,
		})
		can('disburse', 'Application', { status: 'authorized' })
		can('setApplicationDocumentStatus', 'ApplicationDocument')
		can('setStatusApproved', 'Application', {
			status: 'pending',
		})
		can('setStatusDenied', 'Application', {
			status: {
				$in: [
					'pending',
					'approved',
					'pre-authorized',
					'awaiting-authorization',
				],
			},
		})
		can('setStatusPreAuthorized', 'Application', { status: 'approved' })
		can('setStatusAuthorized', 'Application', {
			status: 'awaiting-authorization',
		})
		cannot('setStatusApproved', 'Application', {
			status: { $ne: 'pending' },
		})
		return build()
	}

	if (isAgent && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
	}

	if (isRequests && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
		can('update', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'pending',
		})
		can('setStatusApproved', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'pending',
		})
		can('setStatusDenied', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'pending',
		})
		can('setApplicationDocumentStatus', 'ApplicationDocument', {
			documentType: { $in: [...INITIAL_APPLICATION_DOCUMENT_TYPES] },
			companyId: { $in: ctx.assignedCompanyIds },
			applicationStatus: 'pending',
		})
	}

	if (isPreAuthorizations && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
		can('update', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: { $in: ['approved', 'pre-authorized'] },
		})
		can('setStatusPreAuthorized', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'approved',
		})
		can('setStatusDenied', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'approved',
		})
		can('setApplicationDocumentStatus', 'ApplicationDocument', {
			documentType: { $in: [...PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES] },
			companyId: { $in: ctx.assignedCompanyIds },
			applicationStatus: { $in: ['approved', 'pre-authorized'] },
		})
	}

	const isHr = ctx.roles.includes('hr')

	if (isHr && isAgent && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
		can('setFirstDiscountDate', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'authorized',
			firstDiscountDate: null,
		})
		can('confirmHrDeduction', 'CreditPayment', {
			companyId: { $in: ctx.assignedCompanyIds },
		})
	}

	const isInstallments = ctx.roles.includes('installments')

	if (isInstallments && isAgent && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
		can('confirmInstallment', 'CreditPayment', {
			companyId: { $in: ctx.assignedCompanyIds },
		})
	}

	const isDispersions = ctx.roles.includes('dispersions')

	if (isDispersions && isAgent && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
		can('disburse', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'authorized',
		})
	}

	const isLiquidations = ctx.roles.includes('liquidations')

	if (isLiquidations && isAgent && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
		can('read', 'CreditLiquidationRequest', {
			companyId: { $in: ctx.assignedCompanyIds },
		})
		can('acceptLiquidationRequest', 'CreditLiquidationRequest', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'pending',
		})
		can('denyLiquidationRequest', 'CreditLiquidationRequest', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'pending',
		})
	}

	if (isAuthorizations && isAgent && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
		can('update', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: {
				$in: ['awaiting-authorization', 'authorized'],
			},
		})
		can('setStatusAuthorized', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'awaiting-authorization',
		})
		can('setStatusDenied', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'awaiting-authorization',
		})
		can('reopenAuthorizationReview', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'authorized',
		})
		can('setApplicationDocumentStatus', 'ApplicationDocument', {
			documentType: { $in: [...PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES] },
			companyId: { $in: ctx.assignedCompanyIds },
			applicationStatus: {
				$in: ['awaiting-authorization', 'authorized'],
			},
		})
	}

	if (
		isAgent &&
		hasCompanyAssignments &&
		(isRequests ||
			isPreAuthorizations ||
			isAuthorizations ||
			isHr ||
			isInstallments ||
			isDispersions ||
			isLiquidations)
	) {
		can('read', 'Credit', { companyId: { $in: ctx.assignedCompanyIds } })
	}

	return build()
}
