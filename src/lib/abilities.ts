import {
	AbilityBuilder,
	createMongoAbility,
	type ForcedSubject,
	type MongoAbility,
	type MongoQuery,
	subject,
} from '@casl/ability'
import type { ApplicantEligibilityData } from '~/lib/application-rules'
import { isEligibleForNewApplication } from '~/lib/application-rules'

export { subject }

export type AppAction = 'manage' | 'create' | 'read' | 'update' | 'delete'
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
