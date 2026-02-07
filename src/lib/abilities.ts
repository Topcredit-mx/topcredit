import {
	AbilityBuilder,
	createMongoAbility,
	type MongoAbility,
	type MongoQuery,
} from '@casl/ability'

export type AppAction = 'manage' | 'create' | 'read' | 'update' | 'delete'
export type AppSubject = 'Company' | 'User' | 'Admin' | 'all'

export type CompanySubject = { __typename: 'Company'; id: number }
export type UserSubject = { __typename: 'User'; id: number }

export type AppAbility = MongoAbility<
	[AppAction, AppSubject | CompanySubject | UserSubject]
>

export type AbilityContext = {
	roles: string[]
	assignedCompanyIds: number[] | 'all'
}

function companyIdCondition(ids: number[]): MongoQuery<CompanySubject> {
	return { id: { $in: ids } }
}

export function defineAbilityFor(ctx: AbilityContext): AppAbility {
	const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

	const isAdmin = ctx.roles.includes('admin')
	const isEmployee = ctx.roles.includes('employee')
	const isCustomer = ctx.roles.includes('customer')

	if (isAdmin) {
		can('manage', 'all')
		return build()
	}

	if (isCustomer) {
		return build()
	}

	if (isEmployee) {
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
