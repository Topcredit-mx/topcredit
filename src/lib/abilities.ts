import {
	AbilityBuilder,
	createMongoAbility,
	type ForcedSubject,
	type MongoAbility,
	type MongoQuery,
	subject,
} from '@casl/ability'

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

/** Data used to decide if an applicant can create an Application (solicitud). Fetched in server; logic lives here. */
export type ApplicantEligibilityData = {
	hasCompany: boolean
	borrowingCapacityRate: number | null
	termOfferingsCount: number
}

export function isEligibleForNewApplication(
	data: ApplicantEligibilityData | null | undefined,
): boolean {
	if (!data) return false
	return (
		data.hasCompany &&
		data.borrowingCapacityRate != null &&
		data.borrowingCapacityRate > 0 &&
		data.termOfferingsCount > 0
	)
}

export type AbilityContext = {
	roles: string[]
	assignedCompanyIds: number[] | 'all'
	userId?: number
	/** For applicants: company/rate/term data so we can gate create Application and reuse elsewhere. */
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
