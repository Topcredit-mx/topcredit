import { useTranslations } from 'next-intl'
import type messages from '~/messages/es.json'
import {
	ValidationCode,
	type ValidationCode as ValidationCodeType,
} from './validation-codes'

const CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE_BULK_PREFIX = `${ValidationCode.CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE}:`

type AdminKey = keyof (typeof messages)['admin']
type CuentaApplicationsKey = keyof (typeof messages)['cuenta']['applications']
type EquipoKey = keyof (typeof messages)['equipo']
type AuthKey = keyof (typeof messages)['auth']

type CodeMapping =
	| { namespace: 'admin'; key: AdminKey }
	| { namespace: 'cuenta.applications'; key: CuentaApplicationsKey }
	| { namespace: 'equipo'; key: EquipoKey }
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
	[ValidationCode.COMPANY_TERM_DURATION_INTEGER]: {
		namespace: 'admin',
		key: 'company-term-duration-integer',
	},
	[ValidationCode.COMPANY_TERM_DURATION_MIN]: {
		namespace: 'admin',
		key: 'company-term-duration-min',
	},
	[ValidationCode.COMPANY_TERM_DURATION_MAX]: {
		namespace: 'admin',
		key: 'company-term-duration-max',
	},
	[ValidationCode.COMPANY_TERM_TYPE_INVALID]: {
		namespace: 'admin',
		key: 'company-term-type-invalid',
	},
	[ValidationCode.COMPANY_TERM_OFFERING_IN_USE]: {
		namespace: 'admin',
		key: 'company-term-offering-in-use',
	},
	[ValidationCode.COMPANY_TERM_ALREADY_ASSIGNED]: {
		namespace: 'admin',
		key: 'company-term-already-assigned',
	},
	[ValidationCode.APPLICATION_TERM_REQUIRED]: {
		namespace: 'cuenta.applications',
		key: 'application-term-required',
	},
	[ValidationCode.APPLICATION_SALARY_FREQUENCY_INVALID]: {
		namespace: 'cuenta.applications',
		key: 'application-salary-frequency-invalid',
	},
	[ValidationCode.APPLICATION_VALUE_REQUIRED]: {
		namespace: 'cuenta.applications',
		key: 'application-value-required',
	},
	[ValidationCode.APPLICATION_VALUE_POSITIVE]: {
		namespace: 'cuenta.applications',
		key: 'application-value-positive',
	},
	[ValidationCode.APPLICATION_RFC_LENGTH]: {
		namespace: 'cuenta.applications',
		key: 'application-rfc-length',
	},
	[ValidationCode.APPLICATION_RFC_INVALID]: {
		namespace: 'cuenta.applications',
		key: 'application-rfc-invalid',
	},
	[ValidationCode.APPLICATION_CLABE_LENGTH]: {
		namespace: 'cuenta.applications',
		key: 'application-clabe-length',
	},
	[ValidationCode.APPLICATION_CLABE_INVALID]: {
		namespace: 'cuenta.applications',
		key: 'application-clabe-invalid',
	},
	[ValidationCode.APPLICATION_POSTAL_CODE_LENGTH]: {
		namespace: 'cuenta.applications',
		key: 'application-postal-code-length',
	},
	[ValidationCode.APPLICATION_INVALID]: {
		namespace: 'cuenta.applications',
		key: 'application-invalid',
	},
	[ValidationCode.DOCUMENT_TYPE_INVALID]: {
		namespace: 'cuenta.applications',
		key: 'document-type-invalid',
	},
	[ValidationCode.DOCUMENT_STATUS_INVALID]: {
		namespace: 'cuenta.applications',
		key: 'document-status-invalid',
	},
	[ValidationCode.CUENTA_APPLICATION_EMAIL_DOMAIN]: {
		namespace: 'cuenta.applications',
		key: 'error-email-domain',
	},
	[ValidationCode.CUENTA_APPLICATION_COMPANY_NO_RATE]: {
		namespace: 'cuenta.applications',
		key: 'error-company-no-rate',
	},
	[ValidationCode.CUENTA_APPLICATION_COMPANY_NO_TERMS]: {
		namespace: 'cuenta.applications',
		key: 'error-company-no-terms',
	},
	[ValidationCode.CUENTA_APPLICATION_TERM_NOT_AVAILABLE]: {
		namespace: 'cuenta.applications',
		key: 'term-not-available',
	},
	[ValidationCode.CUENTA_APPLICATION_DUPLICATE_WAIT]: {
		namespace: 'cuenta.applications',
		key: 'duplicate-application-wait',
	},
	[ValidationCode.CUENTA_APPLICATION_EXISTING_ACTIVE]: {
		namespace: 'cuenta.applications',
		key: 'existing-active-application',
	},
	[ValidationCode.CUENTA_APPLICATION_NOT_FOUND]: {
		namespace: 'cuenta.applications',
		key: 'application-not-found',
	},
	[ValidationCode.CUENTA_APPLICATION_AUTHORIZATION_PACKAGE_INCOMPLETE]: {
		namespace: 'cuenta.applications',
		key: 'authorization-package-incomplete',
	},
	[ValidationCode.CUENTA_APPLICATION_FILE_REQUIRED]: {
		namespace: 'cuenta.applications',
		key: 'file-required',
	},
	[ValidationCode.CUENTA_APPLICATION_FILE_MAX_SIZE]: {
		namespace: 'cuenta.applications',
		key: 'file-max-size',
	},
	[ValidationCode.FILE_TYPE_UNKNOWN]: {
		namespace: 'cuenta.applications',
		key: 'file-type-unknown',
	},
	[ValidationCode.FILE_TYPE_NOT_ALLOWED]: {
		namespace: 'cuenta.applications',
		key: 'file-type-not-allowed',
	},
	[ValidationCode.APPLICATIONS_DOCUMENT_INVALID]: {
		namespace: 'equipo',
		key: 'applications-document-invalid',
	},
	[ValidationCode.APPLICATIONS_DOCUMENT_REJECTION_REASON_REQUIRED]: {
		namespace: 'equipo',
		key: 'applications-document-rejection-reason-required',
	},
	[ValidationCode.APPLICATIONS_DOCUMENT_DECISIONS_REQUIRED]: {
		namespace: 'equipo',
		key: 'applications-document-decisions-required',
	},
	[ValidationCode.APPLICATIONS_DOCUMENT_REVIEW_FORBIDDEN]: {
		namespace: 'equipo',
		key: 'applications-document-review-forbidden',
	},
	[ValidationCode.APPLICATIONS_ERROR_GENERIC]: {
		namespace: 'equipo',
		key: 'applications-error-generic',
	},
	[ValidationCode.APPLICATIONS_REASON_REQUIRED]: {
		namespace: 'equipo',
		key: 'applications-reason-required',
	},
	[ValidationCode.APPLICATIONS_NOT_FOUND]: {
		namespace: 'equipo',
		key: 'applications-not-found',
	},
	[ValidationCode.APPLICATIONS_ERROR_TRANSITION]: {
		namespace: 'equipo',
		key: 'applications-error-transition',
	},
	[ValidationCode.APPLICATIONS_FINANCIAL_TERMS_REQUIRED]: {
		namespace: 'equipo',
		key: 'applications-financial-terms-required',
	},
	[ValidationCode.APPLICATIONS_REQUESTS_CANNOT_PREAUTH_OR_AUTH]: {
		namespace: 'equipo',
		key: 'applications-requests-cannot-preauth-or-auth',
	},
	[ValidationCode.APPLICATIONS_PREAUTH_EXCEEDS_CAPACITY]: {
		namespace: 'equipo',
		key: 'applications-preauth-exceeds-capacity',
	},
	[ValidationCode.APPLICATIONS_PREAUTH_COMPANY_NO_CAPACITY]: {
		namespace: 'equipo',
		key: 'applications-preauth-company-no-capacity',
	},
	[ValidationCode.APPLICATIONS_AUTHORIZATION_PACKAGE_NOT_APPROVED]: {
		namespace: 'equipo',
		key: 'applications-authorization-package-not-approved',
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
	[ValidationCode.HR_FIRST_DISCOUNT_DATE_REQUIRED]: {
		namespace: 'equipo',
		key: 'HR_FIRST_DISCOUNT_DATE_REQUIRED',
	},
	[ValidationCode.HR_FIRST_DISCOUNT_DATE_INVALID]: {
		namespace: 'equipo',
		key: 'HR_FIRST_DISCOUNT_DATE_INVALID',
	},
	[ValidationCode.HR_ALREADY_APPROVED]: {
		namespace: 'equipo',
		key: 'HR_ALREADY_APPROVED',
	},
	[ValidationCode.DISBURSE_TRANSFER_REFERENCE_REQUIRED]: {
		namespace: 'equipo',
		key: 'DISBURSE_TRANSFER_REFERENCE_REQUIRED',
	},
	[ValidationCode.DISBURSE_RECEIPT_REQUIRED]: {
		namespace: 'equipo',
		key: 'DISBURSE_RECEIPT_REQUIRED',
	},
	[ValidationCode.DISBURSE_HR_NOT_APPROVED]: {
		namespace: 'equipo',
		key: 'DISBURSE_HR_NOT_APPROVED',
	},
	[ValidationCode.CREDIT_PAYMENT_NOT_FOUND]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_NOT_FOUND',
	},
	[ValidationCode.CREDIT_PAYMENT_ALREADY_CONFIRMED]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_ALREADY_CONFIRMED',
	},
	[ValidationCode.CREDIT_PAYMENT_NOT_HR_CONFIRMED]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_NOT_HR_CONFIRMED',
	},
	[ValidationCode.CREDIT_PAYMENT_ALREADY_INSTALLMENT_CONFIRMED]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_ALREADY_INSTALLMENT_CONFIRMED',
	},
	[ValidationCode.CREDIT_PAYMENT_CSV_PARSE_ERROR]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_CSV_PARSE_ERROR',
	},
	[ValidationCode.CREDIT_PAYMENT_CSV_NO_MATCHES]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_CSV_NO_MATCHES',
	},
	[ValidationCode.CREDIT_PAYMENT_BULK_EMPTY]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_BULK_EMPTY',
	},
	[ValidationCode.CREDIT_PAYMENT_BULK_SELECTION_NON_CONTIGUOUS]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_BULK_SELECTION_NON_CONTIGUOUS',
	},
	[ValidationCode.CREDIT_PAYMENT_CONFIRM_FORBIDDEN]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_CONFIRM_FORBIDDEN',
	},
	[ValidationCode.CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE]: {
		namespace: 'equipo',
		key: 'CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE',
	},
	[ValidationCode.CREDIT_NOT_FOUND]: {
		namespace: 'equipo',
		key: 'CREDIT_NOT_FOUND',
	},
	[ValidationCode.CREDIT_DEFAULT_ADMIN_ONLY]: {
		namespace: 'equipo',
		key: 'CREDIT_DEFAULT_ADMIN_ONLY',
	},
	[ValidationCode.CREDIT_DEFAULT_INVALID_STATUS]: {
		namespace: 'equipo',
		key: 'CREDIT_DEFAULT_INVALID_STATUS',
	},
	[ValidationCode.CREDIT_DEFAULT_NOT_LONG_OVERDUE]: {
		namespace: 'equipo',
		key: 'CREDIT_DEFAULT_NOT_LONG_OVERDUE',
	},
	[ValidationCode.CREDIT_DEFAULTED_PAYMENT_ACTION_BLOCKED]: {
		namespace: 'equipo',
		key: 'CREDIT_DEFAULTED_PAYMENT_ACTION_BLOCKED',
	},
	[ValidationCode.CREDIT_RESTORE_NOT_DEFAULTED]: {
		namespace: 'equipo',
		key: 'CREDIT_RESTORE_NOT_DEFAULTED',
	},
}

function isValidationCode(s: string): s is ValidationCodeType {
	return s in CODE_TO_I18N
}

type StateWithError = { error?: string } | null

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

export function useResolveValidationError(): (code: string) => string {
	const tAdmin = useTranslations('admin')
	const tCuentaApplications = useTranslations('cuenta.applications')
	const tEquipo = useTranslations('equipo')
	const tAuth = useTranslations('auth')

	return (code: string) => {
		if (
			code.startsWith(
				CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE_BULK_PREFIX,
			)
		) {
			const idPart = code.slice(
				CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE_BULK_PREFIX.length,
			)
			const paymentId = Number(idPart)
			if (Number.isInteger(paymentId) && paymentId > 0) {
				return tEquipo(
					'CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE_FOR_BULK',
					{
						paymentId: String(paymentId),
					},
				)
			}
		}
		if (!isValidationCode(code)) return code
		const { namespace, key } = CODE_TO_I18N[code]
		if (namespace === 'admin') return tAdmin(key)
		if (namespace === 'cuenta.applications') return tCuentaApplications(key)
		if (namespace === 'auth') return tAuth(key)
		return tEquipo(key)
	}
}
