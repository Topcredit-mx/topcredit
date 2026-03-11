/**
 * Maps validation codes (from backend) to next-intl namespace + key.
 * Only the frontend knows about translation keys; backend only uses codes.
 */

import { useTranslations } from 'next-intl'
import type messages from '~/messages/es.json'
import {
	ValidationCode,
	type ValidationCode as ValidationCodeType,
} from './validation-codes'

type AdminKey = keyof (typeof messages)['admin']
type DashboardApplicationsKey =
	keyof (typeof messages)['dashboard']['applications']
type AppKey = keyof (typeof messages)['app']

type CodeMapping =
	| { namespace: 'admin'; key: AdminKey }
	| { namespace: 'dashboard.applications'; key: DashboardApplicationsKey }
	| { namespace: 'app'; key: AppKey }

const CODE_TO_I18N: Record<ValidationCodeType, CodeMapping> = {
	[ValidationCode.COMPANY_NAME_REQUIRED]: {
		namespace: 'admin',
		key: 'company-name-required',
	},
	[ValidationCode.COMPANY_NAME_MAX]: {
		namespace: 'admin',
		key: 'company-name-max',
	},
	[ValidationCode.COMPANY_DOMAIN_REQUIRED]: {
		namespace: 'admin',
		key: 'company-domain-required',
	},
	[ValidationCode.COMPANY_DOMAIN_FORMAT]: {
		namespace: 'admin',
		key: 'company-domain-format',
	},
	[ValidationCode.COMPANY_DOMAIN_DUPLICATE]: {
		namespace: 'admin',
		key: 'company-domain-duplicate',
	},
	[ValidationCode.COMPANY_RATE_REQUIRED]: {
		namespace: 'admin',
		key: 'company-rate-required',
	},
	[ValidationCode.COMPANY_RATE_NUMBER]: {
		namespace: 'admin',
		key: 'company-rate-number',
	},
	[ValidationCode.COMPANY_RATE_POSITIVE]: {
		namespace: 'admin',
		key: 'company-rate-positive',
	},
	[ValidationCode.COMPANY_BORROWING_CAPACITY_MIN]: {
		namespace: 'admin',
		key: 'company-borrowing-capacity-min',
	},
	[ValidationCode.COMPANY_BORROWING_CAPACITY_MAX]: {
		namespace: 'admin',
		key: 'company-borrowing-capacity-max',
	},
	[ValidationCode.COMPANY_FREQUENCY]: {
		namespace: 'admin',
		key: 'company-frequency',
	},
	[ValidationCode.APPLICATION_TERM_REQUIRED]: {
		namespace: 'dashboard.applications',
		key: 'application-term-required',
	},
	[ValidationCode.APPLICATION_VALUE_REQUIRED]: {
		namespace: 'dashboard.applications',
		key: 'application-value-required',
	},
	[ValidationCode.APPLICATION_VALUE_POSITIVE]: {
		namespace: 'dashboard.applications',
		key: 'application-value-positive',
	},
	[ValidationCode.APPLICATION_INVALID]: {
		namespace: 'dashboard.applications',
		key: 'application-invalid',
	},
	[ValidationCode.DOCUMENT_TYPE_INVALID]: {
		namespace: 'dashboard.applications',
		key: 'document-type-invalid',
	},
	[ValidationCode.DOCUMENT_STATUS_INVALID]: {
		namespace: 'dashboard.applications',
		key: 'document-status-invalid',
	},
	[ValidationCode.APPLICATIONS_DOCUMENT_INVALID]: {
		namespace: 'app',
		key: 'applications-document-invalid',
	},
	[ValidationCode.APPLICATIONS_DOCUMENT_REJECTION_REASON_REQUIRED]: {
		namespace: 'app',
		key: 'applications-document-rejection-reason-required',
	},
	[ValidationCode.APPLICATIONS_ERROR_GENERIC]: {
		namespace: 'app',
		key: 'applications-error-generic',
	},
	[ValidationCode.APPLICATIONS_REASON_REQUIRED]: {
		namespace: 'app',
		key: 'applications-reason-required',
	},
	[ValidationCode.APPLICATIONS_NOT_FOUND]: {
		namespace: 'app',
		key: 'applications-not-found',
	},
	[ValidationCode.APPLICATIONS_ERROR_TRANSITION]: {
		namespace: 'app',
		key: 'applications-error-transition',
	},
}

function isValidationCode(s: string): s is ValidationCodeType {
	return s in CODE_TO_I18N
}

/** Action state that may return { error?: string } with validation codes. */
type StateWithError = { error?: string } | null

/**
 * Resolve action state error to a translated message, or null if none.
 * Use when displaying a single error from useActionState where the action returns validation codes.
 */
export function getResolvedError(
	state: StateWithError,
	resolve: (code: string) => string,
	options?: { treatEmptyAsNone?: boolean },
): string | null {
	if (state == null || !('error' in state)) return null
	const err = state.error
	if (err == null) return null
	if (options?.treatEmptyAsNone && err === '') return null
	return resolve(err)
}

/**
 * Resolves a validation code to the translated string.
 * Use in forms and anywhere server returns a code; pass the result to FieldError as message=.
 */
export function useResolveValidationError(): (code: string) => string {
	const tAdmin = useTranslations('admin')
	const tDashboardApps = useTranslations('dashboard.applications')
	const tApp = useTranslations('app')

	return (code: string) => {
		if (!isValidationCode(code)) return code
		const { namespace, key } = CODE_TO_I18N[code]
		if (namespace === 'admin') return tAdmin(key)
		if (namespace === 'dashboard.applications') return tDashboardApps(key)
		return tApp(key)
	}
}
