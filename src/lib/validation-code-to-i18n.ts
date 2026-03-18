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
type AuthKey = keyof (typeof messages)['auth']

type CodeMapping =
	| { namespace: 'admin'; key: AdminKey }
	| { namespace: 'dashboard.applications'; key: DashboardApplicationsKey }
	| { namespace: 'app'; key: AppKey }
	| { namespace: 'auth'; key: AuthKey }

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
	[ValidationCode.APPLICATION_RFC_LENGTH]: {
		namespace: 'dashboard.applications',
		key: 'application-rfc-length',
	},
	[ValidationCode.APPLICATION_RFC_INVALID]: {
		namespace: 'dashboard.applications',
		key: 'application-rfc-invalid',
	},
	[ValidationCode.APPLICATION_CLABE_LENGTH]: {
		namespace: 'dashboard.applications',
		key: 'application-clabe-length',
	},
	[ValidationCode.APPLICATION_CLABE_INVALID]: {
		namespace: 'dashboard.applications',
		key: 'application-clabe-invalid',
	},
	[ValidationCode.APPLICATION_POSTAL_CODE_LENGTH]: {
		namespace: 'dashboard.applications',
		key: 'application-postal-code-length',
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
	[ValidationCode.DASHBOARD_APPLICATION_EMAIL_DOMAIN]: {
		namespace: 'dashboard.applications',
		key: 'error-email-domain',
	},
	[ValidationCode.DASHBOARD_APPLICATION_COMPANY_NO_RATE]: {
		namespace: 'dashboard.applications',
		key: 'error-company-no-rate',
	},
	[ValidationCode.DASHBOARD_APPLICATION_COMPANY_NO_TERMS]: {
		namespace: 'dashboard.applications',
		key: 'error-company-no-terms',
	},
	[ValidationCode.DASHBOARD_APPLICATION_TERM_NOT_AVAILABLE]: {
		namespace: 'dashboard.applications',
		key: 'term-not-available',
	},
	[ValidationCode.DASHBOARD_APPLICATION_DUPLICATE_WAIT]: {
		namespace: 'dashboard.applications',
		key: 'duplicate-application-wait',
	},
	[ValidationCode.DASHBOARD_APPLICATION_EXISTING_ACTIVE]: {
		namespace: 'dashboard.applications',
		key: 'existing-active-application',
	},
	[ValidationCode.DASHBOARD_APPLICATION_NOT_FOUND]: {
		namespace: 'dashboard.applications',
		key: 'application-not-found',
	},
	[ValidationCode.DASHBOARD_APPLICATION_FILE_REQUIRED]: {
		namespace: 'dashboard.applications',
		key: 'file-required',
	},
	[ValidationCode.DASHBOARD_APPLICATION_FILE_MAX_SIZE]: {
		namespace: 'dashboard.applications',
		key: 'file-max-size',
	},
	[ValidationCode.FILE_TYPE_UNKNOWN]: {
		namespace: 'dashboard.applications',
		key: 'file-type-unknown',
	},
	[ValidationCode.FILE_TYPE_NOT_ALLOWED]: {
		namespace: 'dashboard.applications',
		key: 'file-type-not-allowed',
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
	[ValidationCode.APPLICATIONS_REQUESTS_CANNOT_PREAUTH_OR_AUTH]: {
		namespace: 'app',
		key: 'applications-requests-cannot-preauth-or-auth',
	},
	[ValidationCode.AUTH_EMAIL_NAME_REQUIRED]: {
		namespace: 'auth',
		key: 'error-email-name-required',
	},
	[ValidationCode.AUTH_EMAIL_REQUIRED]: {
		namespace: 'auth',
		key: 'error-email-required',
	},
	[ValidationCode.AUTH_SIGNUP_EMAIL_NOT_ELIGIBLE]: {
		namespace: 'auth',
		key: 'error-signup-email-not-eligible',
	},
	[ValidationCode.AUTH_LOGIN_NO_CREDIT_ACCESS]: {
		namespace: 'auth',
		key: 'error-login-no-credit-access',
	},
	[ValidationCode.AUTH_RATE_LIMIT_EXCEEDED]: {
		namespace: 'auth',
		key: 'error-rate-limit-exceeded',
	},
	[ValidationCode.AUTH_USER_NOT_FOUND]: {
		namespace: 'auth',
		key: 'error-user-not-found',
	},
	[ValidationCode.AUTH_OTP_RESENT_SUCCESS]: {
		namespace: 'auth',
		key: 'error-otp-resent-success',
	},
	[ValidationCode.AUTH_NOT_AUTHENTICATED]: {
		namespace: 'auth',
		key: 'error-not-authenticated',
	},
	[ValidationCode.AUTH_EMAIL_CHANGE_SAME]: {
		namespace: 'auth',
		key: 'error-email-change-same',
	},
	[ValidationCode.AUTH_EMAIL_ALREADY_REGISTERED]: {
		namespace: 'auth',
		key: 'error-email-already-registered',
	},
	[ValidationCode.AUTH_CURRENT_USER_NOT_FOUND]: {
		namespace: 'auth',
		key: 'error-current-user-not-found',
	},
	[ValidationCode.AUTH_OTP_INVALID]: {
		namespace: 'auth',
		key: 'error-otp-invalid',
	},
	[ValidationCode.AUTH_OTP_EXPIRED]: {
		namespace: 'auth',
		key: 'error-otp-expired',
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
	const tAuth = useTranslations('auth')

	return (code: string) => {
		if (!isValidationCode(code)) return code
		const { namespace, key } = CODE_TO_I18N[code]
		if (namespace === 'admin') return tAdmin(key)
		if (namespace === 'dashboard.applications') return tDashboardApps(key)
		if (namespace === 'auth') return tAuth(key)
		return tApp(key)
	}
}
