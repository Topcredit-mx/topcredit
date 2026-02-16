import { redirect } from 'next/navigation'
import type { AppAbility } from '~/lib/abilities'
import { type AbilityContext, defineAbilityFor } from '~/lib/abilities'
import { requireAuth } from '~/lib/auth-utils'
import { getUserCompanyAssignments } from '~/server/scopes'

export async function getAbility(): Promise<AppAbility> {
	const session = await requireAuth()
	const userId = session.user.id
	const roles = session.user.roles ?? []

	const assignedCompanyIds: number[] | 'all' = roles.includes('admin')
		? 'all'
		: roles.includes('agent')
			? (await getUserCompanyAssignments(userId)).map((c) => c.id)
			: []

	const ctx: AbilityContext = {
		roles,
		assignedCompanyIds,
		userId: session.user.id,
	}
	return defineAbilityFor(ctx)
}

export function requireAbility(
	ability: AppAbility,
	action: Parameters<AppAbility['can']>[0],
	subject: Parameters<AppAbility['can']>[1],
): void {
	if (!ability.can(action, subject)) {
		redirect('/unauthorized')
	}
}
