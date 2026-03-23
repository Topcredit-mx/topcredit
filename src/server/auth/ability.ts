import {
	AbilityBuilder,
	createMongoAbility,
	type ForcedSubject,
	type MongoAbility,
	subject,
} from '@casl/ability'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import {
	type ApplicantEligibilityData,
	isEligibleForNewApplication,
} from '~/lib/application-rules'
import { getRolesByUserId } from '~/server/db/role-queries'
import type { ApplicationStatus } from '~/server/db/schema'
import { getUserCompanyAssignments } from '~/server/scopes'
import { getApplicantEligibilityData } from './eligibility'
import { requireAuth } from './session'

export { subject }

export type AppAction =
	| 'manage'
	| 'create'
	| 'read'
	| 'update'
	| 'delete'
	| 'uploadDocument'
	| 'setStatusApproved'
	| 'setStatusDenied'
	| 'setStatusInvalidDocumentation'
	| 'setStatusPreAuthorized'
	| 'setStatusAwaitingAuthorization'
	| 'setStatusAuthorized'
export type AppSubject = 'Company' | 'User' | 'Admin' | 'Application' | 'all'

export type CompanySubject = { id: number } & ForcedSubject<'Company'>
export type UserSubject = { id: number } & ForcedSubject<'User'>
export type ApplicationSubject = {
	id: number
	applicantId: number
	companyId?: number
	status?: ApplicationStatus
} & ForcedSubject<'Application'>

export type AppAbility = MongoAbility<
	[AppAction, AppSubject | CompanySubject | UserSubject | ApplicationSubject]
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
	const isApplicant = ctx.roles.includes('applicant')
	const hasCompanyAssignments = ctx.assignedCompanyIds.length > 0

	can('read', 'User', { id: ctx.userId })
	can('update', 'User', { id: ctx.userId })

	if (isApplicant) {
		if (isEligibleForNewApplication(ctx.applicantEligibilityData)) {
			can('create', 'Application')
		}
		can('read', 'Application', { applicantId: ctx.userId })
		can('uploadDocument', 'Application', { applicantId: ctx.userId })
		can('setStatusAwaitingAuthorization', 'Application', {
			applicantId: ctx.userId,
			status: 'pre-authorized',
		})
		return build()
	}

	if (isAdmin) {
		can('manage', 'all')
		can('setStatusApproved', 'Application', {
			status: { $in: ['new', 'pending'] },
		})
		can('setStatusDenied', 'Application', {
			status: {
				$in: [
					'new',
					'pending',
					'approved',
					'pre-authorized',
					'awaiting-authorization',
				],
			},
		})
		can('setStatusInvalidDocumentation', 'Application', {
			status: { $in: ['new', 'pending'] },
		})
		can('setStatusPreAuthorized', 'Application', { status: 'approved' })
		can('setStatusAuthorized', 'Application', {
			status: 'awaiting-authorization',
		})
		cannot('setStatusApproved', 'Application', {
			status: { $nin: ['new', 'pending'] },
		})
		cannot('setStatusInvalidDocumentation', 'Application', {
			status: { $nin: ['new', 'pending'] },
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
		})
		can('setStatusApproved', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: { $in: ['new', 'pending'] },
		})
		can('setStatusDenied', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: { $in: ['new', 'pending'] },
		})
		can('setStatusInvalidDocumentation', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: { $in: ['new', 'pending'] },
		})
	}

	if (isPreAuthorizations && hasCompanyAssignments) {
		can('read', 'Company', { id: { $in: ctx.assignedCompanyIds } })
		can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
		can('update', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
		})
		can('setStatusPreAuthorized', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'approved',
		})
		can('setStatusDenied', 'Application', {
			companyId: { $in: ctx.assignedCompanyIds },
			status: 'approved',
		})
	}

	return build()
}

export type AbilityResult = {
	ability: AppAbility
	assignedCompanyIds: number[]
	isAdmin: boolean
}

export const getAbility = cache(async (): Promise<AbilityResult> => {
	const session = await requireAuth()
	const userId = session.user.id
	const roles = await getRolesByUserId(userId)
	if (roles.length === 0) redirect('/unauthorized')

	const isAdmin = roles.includes('admin')
	const assignedCompanyIds: number[] = isAdmin
		? []
		: roles.includes('agent') ||
				roles.includes('requests') ||
				roles.includes('pre-authorizations')
			? (await getUserCompanyAssignments(userId)).map((c) => c.id)
			: []

	let applicantEligibilityData: ApplicantEligibilityData | null = null
	if (roles.includes('applicant')) {
		const email = session.user.email ?? ''
		applicantEligibilityData = await getApplicantEligibilityData(email)
	}

	const ctx: AbilityContext = {
		roles,
		assignedCompanyIds,
		userId: session.user.id,
		applicantEligibilityData,
	}
	return {
		ability: defineAbilityFor(ctx),
		assignedCompanyIds,
		isAdmin,
	}
})

export function requireAbility(
	ability: AppAbility,
	action: Parameters<AppAbility['can']>[0],
	subj: Parameters<AppAbility['can']>[1],
): void {
	if (!ability.can(action, subj)) {
		redirect('/unauthorized')
	}
}

const STATUS_TO_ACTION: Partial<Record<ApplicationStatus, AppAction>> = {
	approved: 'setStatusApproved',
	denied: 'setStatusDenied',
	'invalid-documentation': 'setStatusInvalidDocumentation',
	'pre-authorized': 'setStatusPreAuthorized',
	authorized: 'setStatusAuthorized',
}

export function getActionForApplicationStatus(
	status: ApplicationStatus,
): AppAction | null {
	return STATUS_TO_ACTION[status] ?? null
}
