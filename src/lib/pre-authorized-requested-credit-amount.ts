import { Decimal } from '~/lib/decimal'
import { ValidationCode } from '~/lib/validation-codes'

export type ValidateRequestedPreAuthorizedCreditAmountResult =
	| { ok: true; amount: string }
	| { ok: false; error: string }

function parsePositiveDecimal(value: string): Decimal | null {
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

export function validateRequestedPreAuthorizedCreditAmount(
	requestedRaw: string,
	maxPreAuthorizedAmount: string,
): ValidateRequestedPreAuthorizedCreditAmountResult {
	const requested = parsePositiveDecimal(requestedRaw)
	if (requested == null) {
		return {
			ok: false,
			error: ValidationCode.CUENTA_APPLICATION_REQUESTED_CREDIT_INVALID,
		}
	}

	const maxAmount = parsePositiveDecimal(maxPreAuthorizedAmount)
	if (maxAmount == null) {
		return {
			ok: false,
			error: ValidationCode.APPLICATIONS_FINANCIAL_TERMS_REQUIRED,
		}
	}

	if (requested.gt(maxAmount)) {
		return {
			ok: false,
			error: ValidationCode.CUENTA_APPLICATION_REQUESTED_CREDIT_EXCEEDS_PREAUTH,
		}
	}

	return { ok: true, amount: requested.toFixed(2) }
}

export function formatCreditAmountInputValue(amount: string): string {
	const parsed = parsePositiveDecimal(amount)
	if (parsed == null) {
		return ''
	}
	return parsed.toFixed(2)
}
