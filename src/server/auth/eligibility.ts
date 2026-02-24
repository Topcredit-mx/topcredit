import type { ApplicantEligibilityData } from '~/lib/application-rules'
import {
	getCompanyByEmailDomain,
	getTermOfferingsForCompany,
} from '~/server/queries'

export async function getApplicantEligibilityData(
	email: string,
): Promise<ApplicantEligibilityData> {
	const company = await getCompanyByEmailDomain(email)
	const rate =
		company?.borrowingCapacityRate != null
			? Number(company.borrowingCapacityRate)
			: null
	const termOfferingsCount = company
		? (await getTermOfferingsForCompany(company.id)).length
		: 0
	return {
		hasCompany: !!company,
		borrowingCapacityRate: rate,
		termOfferingsCount,
	}
}
