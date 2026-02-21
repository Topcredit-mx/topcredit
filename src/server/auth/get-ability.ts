import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type {
	AbilityContext,
	AppAbility,
	ApplicantEligibilityData,
} from '~/lib/abilities'
import { defineAbilityFor } from '~/lib/abilities'
import { requireAuth } from '~/lib/auth-utils'
import { db } from '~/server/db'
import { userRoles } from '~/server/db/schema'
import { getUserCompanyAssignments } from '~/server/scopes'
import { getApplicantEligibilityData } from './eligibility'

export type AbilityResult = {
	ability: AppAbility
	assignedCompanyIds: number[] | 'all'
}

/** Fetch current user's roles from DB (not JWT) so role changes take effect immediately. Cached per request per userId. */
export const getRolesFromDb = cache(
	async (userId: number): Promise<string[]> => {
		const rows = await db
			.select({ role: userRoles.role })
			.from(userRoles)
			.where(eq(userRoles.userId, userId))
		return rows.length > 0 ? rows.map((r) => r.role) : ['applicant']
	},
)

export const getAbility = cache(async (): Promise<AbilityResult> => {
	const session = await requireAuth()
	const userId = session.user.id
	const roles = await getRolesFromDb(userId)

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
	return {
		ability: defineAbilityFor(ctx),
		assignedCompanyIds,
	}
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
