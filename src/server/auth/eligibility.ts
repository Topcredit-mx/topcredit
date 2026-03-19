import type { ApplicantEligibilityData } from '~/lib/application-rules'
import { getCompanyByEmailDomain } from '~/server/queries'

export async function getApplicantEligibilityData(
	email: string,
): Promise<ApplicantEligibilityData> {
	const company = await getCompanyByEmailDomain(email)
	return {
		hasCompany: !!company,
	}
}
