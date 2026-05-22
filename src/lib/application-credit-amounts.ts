import { Decimal } from '~/lib/decimal'

export type ApplicationCreditAmounts = {
	preAuthorizedAmount: string | null
	applicantRequestedAmount: string | null
	operativeAmount: string | null
	hasReducedApplicantRequest: boolean
}

function parseAmount(value: string): Decimal | null {
	const trimmed = value.trim()
	if (trimmed === '') {
		return null
	}
	const n = Number.parseFloat(trimmed)
	if (Number.isNaN(n) || n <= 0) {
		return null
	}
	return new Decimal(trimmed)
}

export function resolveApplicationCreditAmounts(
	creditAmount: string | null,
	applicantRequestedCreditAmount: string | null,
): ApplicationCreditAmounts {
	if (creditAmount == null) {
		return {
			preAuthorizedAmount: null,
			applicantRequestedAmount: applicantRequestedCreditAmount,
			operativeAmount: applicantRequestedCreditAmount,
			hasReducedApplicantRequest: false,
		}
	}

	const operativeAmount = applicantRequestedCreditAmount ?? creditAmount
	const requested = applicantRequestedCreditAmount
	const preAuthorized = parseAmount(creditAmount)
	const requestedParsed = requested == null ? null : parseAmount(requested)
	const hasReducedApplicantRequest =
		requestedParsed != null &&
		preAuthorized != null &&
		requestedParsed.lt(preAuthorized)

	return {
		preAuthorizedAmount: creditAmount,
		applicantRequestedAmount: applicantRequestedCreditAmount,
		operativeAmount,
		hasReducedApplicantRequest,
	}
}
