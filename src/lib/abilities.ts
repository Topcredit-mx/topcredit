import {
	AbilityBuilder,
	createMongoAbility,
	type MongoAbility,
	type MongoQuery,
} from '@casl/ability'

export type AppAction = 'manage' | 'create' | 'read' | 'update' | 'delete'
export type AppSubject = 'Company' | 'User' | 'Admin' | 'Credit' | 'all'

export type CompanySubject = { __typename: 'Company'; id: number }
export type UserSubject = { __typename: 'User'; id: number }
export type CreditSubject = {
	__typename: 'Credit'
	id: number
	borrowerId: number
}

export type AppAbility = MongoAbility<
	[AppAction, AppSubject | CompanySubject | UserSubject | CreditSubject]
>

/** Data used to decide if an applicant can create a Credit. Fetched in server; logic lives here. */
export type ApplicantEligibilityData = {
	hasCompany: boolean
	borrowingCapacityRate: number | null
	termOfferingsCount: number
}

export function isEligibleForNewCredit(
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
	/** For applicants: company/rate/term data so we can gate create Credit and reuse elsewhere. */
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
		if (isEligibleForNewCredit(ctx.applicantEligibilityData)) {
			can('create', 'Credit')
		}
		can('read', 'Credit', { borrowerId: ctx.userId })
		can('update', 'User', { id: ctx.userId })
		return build()
	}

	if (isAgent && ctx.userId != null) {
		can('update', 'User', { id: ctx.userId })
		if (ctx.assignedCompanyIds === 'all') {
			can('manage', 'Company')
		} else if (ctx.assignedCompanyIds.length > 0) {
			const condition = companyIdCondition(ctx.assignedCompanyIds)
			can('read', 'Company', condition)
			can('update', 'Company', condition)
		}
	}

	return build()
}

export function isCompanySubject(subject: unknown): subject is CompanySubject {
	return (
		typeof subject === 'object' &&
		subject !== null &&
		'__typename' in subject &&
		(subject as CompanySubject).__typename === 'Company' &&
		typeof (subject as CompanySubject).id === 'number'
	)
}

export function toCompanySubject(company: { id: number }): CompanySubject {
	return { __typename: 'Company', id: company.id }
}

export function toCreditSubject(credit: {
	id: number
	borrowerId: number
}): CreditSubject {
	return {
		__typename: 'Credit',
		id: credit.id,
		borrowerId: credit.borrowerId,
	}
}

export function toUserSubject(user: { id: number }): UserSubject {
	return { __typename: 'User', id: user.id }
}
