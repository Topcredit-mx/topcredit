import { cache } from 'react'
import { redirect } from 'next/navigation'
import type {
	AbilityContext,
	AppAbility,
	ApplicantEligibilityData,
} from '~/lib/abilities'
import { defineAbilityFor } from '~/lib/abilities'
import { requireAuth } from '~/lib/auth-utils'
import { getUserCompanyAssignments } from '~/server/scopes'
import { getApplicantEligibilityData } from './eligibility'

export const getAbility = cache(async (): Promise<AppAbility> => {
	const session = await requireAuth()
	const userId = session.user.id
	const roles = session.user.roles ?? []

	const assignedCompanyIds: number[] | 'all' = roles.includes('admin')
		? 'all'
		: roles.includes('agent')
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
	return defineAbilityFor(ctx)
})

export function requireAbility(
	ability: AppAbility,
	action: Parameters<AppAbility['can']>[0],
	subject: Parameters<AppAbility['can']>[1],
): void {
	if (!ability.can(action, subject)) {
		redirect('/unauthorized')
	}
}
