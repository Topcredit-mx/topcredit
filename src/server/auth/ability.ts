import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { ApplicantEligibilityData } from '~/lib/application-rules'
import {
	type AbilityContext,
	type AppAbility,
	type AppAction,
	defineAbilityFor,
} from '~/lib/define-ability-for'
import { getRolesByUserId } from '~/server/db/role-queries'
import type { ApplicationStatus } from '~/server/db/schema'
import { getUserCompanyAssignments } from '~/server/scopes'
import { getApplicantEligibilityData } from './eligibility'
import { requireAuth } from './session'

export {
	type AbilityContext,
	type AppAbility,
	type AppAction,
	type ApplicationSubject,
	type AppSubject,
	type CompanySubject,
	defineAbilityFor,
	subject,
	type UserSubject,
} from '~/lib/define-ability-for'

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
		: roles.includes('agent') &&
				(roles.includes('requests') ||
					roles.includes('pre-authorizations') ||
					roles.includes('authorizations') ||
					roles.includes('hr') ||
					roles.includes('dispersions'))
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
	'pre-authorized': 'setStatusPreAuthorized',
	authorized: 'setStatusAuthorized',
	disbursed: 'disburse',
}

export function getActionForApplicationStatus(
	status: ApplicationStatus,
): AppAction | null {
	return STATUS_TO_ACTION[status] ?? null
}
