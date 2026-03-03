import {
	AbilityBuilder,
	createMongoAbility,
	type ForcedSubject,
	type MongoAbility,
	type MongoQuery,
	subject,
} from '@casl/ability'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { ApplicantEligibilityData } from '~/lib/application-rules'
import { isEligibleForNewApplication } from '~/lib/application-rules'
import { db } from '~/server/db'
import { userRoles } from '~/server/db/schema'
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
export type AppSubject = 'Company' | 'User' | 'Admin' | 'Application' | 'all'

export type CompanySubject = { id: number } & ForcedSubject<'Company'>
export type UserSubject = { id: number } & ForcedSubject<'User'>
export type ApplicationSubject = {
	id: number
	applicantId: number
	companyId?: number
} & ForcedSubject<'Application'>

export type AppAbility = MongoAbility<
	[AppAction, AppSubject | CompanySubject | UserSubject | ApplicationSubject]
>

export type AbilityContext = {
	roles: string[]
	assignedCompanyIds: number[] | 'all'
	userId?: number
	applicantEligibilityData?: ApplicantEligibilityData | null
}

function companyIdCondition(ids: number[]): MongoQuery<CompanySubject> {
	return { id: { $in: ids } }
}

export function defineAbilityFor(ctx: AbilityContext): AppAbility {
	const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

	const isAdmin = ctx.roles.includes('admin')
	const isAgent = ctx.roles.includes('agent')
	const isApplicant = ctx.roles.includes('applicant')

	if (isAdmin) {
		can('manage', 'all')
		return build()
	}

	if (isApplicant && ctx.userId != null) {
		if (isEligibleForNewApplication(ctx.applicantEligibilityData)) {
			can('create', 'Application')
		}
		can('read', 'Application', { applicantId: ctx.userId })
		can('uploadDocument', 'Application', { applicantId: ctx.userId })
		can('update', 'User', { id: ctx.userId })
		return build()
	}

	if (isAgent && ctx.userId != null) {
		can('update', 'User', { id: ctx.userId })
		if (ctx.assignedCompanyIds === 'all') {
			can('manage', 'Company')
			can('manage', 'Application')
		} else if (ctx.assignedCompanyIds.length > 0) {
			const condition = companyIdCondition(ctx.assignedCompanyIds)
			can('read', 'Company', condition)
			can('update', 'Company', condition)
			can('read', 'Application', { companyId: { $in: ctx.assignedCompanyIds } })
			can('update', 'Application', {
				companyId: { $in: ctx.assignedCompanyIds },
			})
		}
	}

	return build()
}

export type AbilityResult = {
	ability: AppAbility
	assignedCompanyIds: number[] | 'all'
}

/** Roles from DB (not JWT) so role changes take effect immediately. */
export const getRolesFromDb = cache(
	async (userId: number): Promise<string[]> => {
		const rows = await db
			.select({ role: userRoles.role })
			.from(userRoles)
			.where(eq(userRoles.userId, userId))
		return rows.length > 0 ? rows.map((r) => r.role) : []
	},
)

export const getAbility = cache(async (): Promise<AbilityResult> => {
	const session = await requireAuth()
	const userId = session.user.id
	const roles = await getRolesFromDb(userId)
	if (roles.length === 0) redirect('/unauthorized')

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
	subj: Parameters<AppAbility['can']>[1],
): void {
	if (!ability.can(action, subj)) {
		redirect('/unauthorized')
	}
}
