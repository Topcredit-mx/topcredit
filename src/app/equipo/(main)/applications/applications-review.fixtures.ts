import type { ApplicationStatus } from '~/server/db/schema'

export const agentForReview = {
	name: 'Agent Review',
	email: 'agent.review@example.com',
	roles: ['agent', 'requests'] as const,
}

export const preAuthAgentForReview = {
	name: 'Preauth Review',
	email: 'preauth.review@example.com',
	roles: ['agent', 'pre-authorizations'] as const,
}

export const adminForReview = {
	name: 'Admin Review',
	email: 'admin.review@example.com',
	roles: ['agent', 'admin'] as const,
}

export const authorizationsAgentForReview = {
	name: 'Authorizations Review',
	email: 'authorizations.review@example.com',
	roles: ['agent', 'authorizations'] as const,
}

export const applicantAuthzAwaiting = {
	name: 'Applicant Authz',
	email: 'applicant.authz@reviewcompany.com',
	roles: ['applicant'] as const,
}

export const applicantAuthzDeny = {
	name: 'Applicant Authz Deny',
	email: 'applicant.authz.deny@reviewcompany.com',
	roles: ['applicant'] as const,
}

export const applicantAuthzAdmin = {
	name: 'Applicant Authz Admin',
	email: 'applicant.authz.admin@reviewcompany.com',
	roles: ['applicant'] as const,
}

export const applicantForReview = {
	name: 'Applicant For Review',
	email: 'applicant.review@reviewcompany.com',
	roles: ['applicant'] as const,
}

export const applicantA2 = {
	name: 'Applicant A2',
	email: 'applicant.a2@reviewcompany.com',
	roles: ['applicant'] as const,
}
export const applicantA3 = {
	name: 'Applicant A3',
	email: 'applicant.a3@reviewcompany.com',
	roles: ['applicant'] as const,
}
export const applicantA4 = {
	name: 'Applicant A4',
	email: 'applicant.a4@reviewcompany.com',
	roles: ['applicant'] as const,
}
export const applicantA5 = {
	name: 'Applicant A5',
	email: 'applicant.a5@reviewcompany.com',
	roles: ['applicant'] as const,
}

export const applicantPreAuth = {
	name: 'Applicant Preauth',
	email: 'applicant.preauth@reviewcompany.com',
	roles: ['applicant'] as const,
}

export const applicantForReviewB = {
	name: 'Applicant Other Company',
	email: 'applicant.review@othercompany.com',
	roles: ['applicant'] as const,
}

export const applicantForReviewC = {
	name: 'Applicant Admin-Only Company',
	email: 'applicant.review@adminonly.com',
	roles: ['applicant'] as const,
}

export const applicantForReviewD = {
	name: 'Applicant Inactive Company',
	email: 'applicant.review@inactivecompany.com',
	roles: ['applicant'] as const,
}

type CompanyFixture = {
	name: string
	domain: string
	rate: string
	borrowingCapacityRate: string | null
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	active: boolean
}

export const companyForReview: CompanyFixture = {
	name: 'E2E Review Company',
	domain: 'reviewcompany.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: true,
}

export const companyForReviewB: CompanyFixture = {
	name: 'Other Company',
	domain: 'othercompany.com',
	rate: '0.02',
	borrowingCapacityRate: null,
	employeeSalaryFrequency: 'monthly',
	active: true,
}

export const companyForReviewC: CompanyFixture = {
	name: 'Admin-Only Company',
	domain: 'adminonly.com',
	rate: '0.02',
	borrowingCapacityRate: null,
	employeeSalaryFrequency: 'monthly',
	active: true,
}

export const companyForReviewD: CompanyFixture = {
	name: 'Inactive Company',
	domain: 'inactivecompany.com',
	rate: '0.02',
	borrowingCapacityRate: null,
	employeeSalaryFrequency: 'monthly',
	active: false,
}

export const allReviewApplicants = [
	applicantForReview,
	applicantA2,
	applicantA3,
	applicantA4,
	applicantA5,
	applicantPreAuth,
	applicantAuthzAwaiting,
	applicantAuthzDeny,
	applicantAuthzAdmin,
	applicantForReviewB,
	applicantForReviewC,
	applicantForReviewD,
]

export const allReviewCompanies = [
	companyForReview,
	companyForReviewB,
	companyForReviewC,
	companyForReviewD,
]

export const agentCompanyDomains = [
	companyForReview.domain,
	companyForReviewB.domain,
	companyForReviewD.domain,
]

type ReviewApplicationStatusHistoryStep = {
	status: ApplicationStatus
	actorEmail: string | null
}

type ReviewApplicationConfig = {
	applicantEmail: string
	companyDomain: string
	creditAmount: string | null
	salaryAtApplication: string
	salaryFrequency?: 'monthly' | 'bi-monthly'
	status?: ApplicationStatus
	statusHistory?: readonly ReviewApplicationStatusHistoryStep[]
}

export const reviewApplicationConfigs: readonly ReviewApplicationConfig[] = [
	{
		applicantEmail: applicantForReview.email,
		companyDomain: companyForReview.domain,
		creditAmount: '25000',
		salaryAtApplication: '40000',
		status: 'pending' as const,
	},
	{
		applicantEmail: applicantA2.email,
		companyDomain: companyForReview.domain,
		creditAmount: '30000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantA3.email,
		companyDomain: companyForReview.domain,
		creditAmount: '35000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantA4.email,
		companyDomain: companyForReview.domain,
		creditAmount: '40000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantA5.email,
		companyDomain: companyForReview.domain,
		creditAmount: '45000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantPreAuth.email,
		companyDomain: companyForReview.domain,
		creditAmount: null,
		salaryAtApplication: '40000',
		status: 'approved' as const,
		statusHistory: [
			{ status: 'pending', actorEmail: applicantPreAuth.email },
			{ status: 'approved', actorEmail: agentForReview.email },
		],
	},
	{
		applicantEmail: applicantAuthzAwaiting.email,
		companyDomain: companyForReview.domain,
		creditAmount: '50000.00',
		salaryAtApplication: '40000',
		status: 'awaiting-authorization' as const,
		statusHistory: [
			{ status: 'pending', actorEmail: applicantAuthzAwaiting.email },
			{ status: 'approved', actorEmail: agentForReview.email },
			{ status: 'pre-authorized', actorEmail: preAuthAgentForReview.email },
			{
				status: 'awaiting-authorization',
				actorEmail: applicantAuthzAwaiting.email,
			},
		],
	},
	{
		applicantEmail: applicantAuthzDeny.email,
		companyDomain: companyForReview.domain,
		creditAmount: '51000.00',
		salaryAtApplication: '40000',
		status: 'awaiting-authorization' as const,
		statusHistory: [
			{ status: 'pending', actorEmail: applicantAuthzDeny.email },
			{ status: 'approved', actorEmail: agentForReview.email },
			{ status: 'pre-authorized', actorEmail: preAuthAgentForReview.email },
			{
				status: 'awaiting-authorization',
				actorEmail: applicantAuthzDeny.email,
			},
		],
	},
	{
		applicantEmail: applicantAuthzAdmin.email,
		companyDomain: companyForReview.domain,
		creditAmount: '52000.00',
		salaryAtApplication: '40000',
		status: 'awaiting-authorization' as const,
		statusHistory: [
			{ status: 'pending', actorEmail: applicantAuthzAdmin.email },
			{ status: 'approved', actorEmail: agentForReview.email },
			{ status: 'pre-authorized', actorEmail: preAuthAgentForReview.email },
			{
				status: 'awaiting-authorization',
				actorEmail: applicantAuthzAdmin.email,
			},
		],
	},
	{
		applicantEmail: applicantForReviewB.email,
		companyDomain: companyForReviewB.domain,
		creditAmount: '15000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantForReviewC.email,
		companyDomain: companyForReviewC.domain,
		creditAmount: '8000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantForReviewD.email,
		companyDomain: companyForReviewD.domain,
		creditAmount: '5000',
		salaryAtApplication: '40000',
	},
] as const
