import { Resend } from 'resend'
import { ApplicationStatusTemplate } from '~/components/email/application-status-template'
import { ApplicationSubmittedTemplate } from '~/components/email/application-submitted-template'
import { OTPTemplate } from '~/components/email/otp-template'
import { env } from '~/env'
import { isNotifyStatus } from '~/lib/application-rules'
import { getEmailTranslations } from '~/lib/email-i18n'
import { getLocationFromIP } from '~/lib/ip-location'
import type { ApplicationStatus } from '~/server/db/schema'

const resend = new Resend(env.RESEND_API_KEY)

const DEFAULT_LOCALE = 'es'

async function getEmailT() {
	return getEmailTranslations(DEFAULT_LOCALE)
}

const isDev = env.NODE_ENV === 'development'
const DEV_EMAIL = 'david.cantum@proton.me'

export async function sendOtpEmail(
	email: string,
	code: string,
	ipAddress: string,
) {
	const { t } = await getEmailT()
	const location = await getLocationFromIP(ipAddress)

	const targetEmail = isDev ? DEV_EMAIL : email
	const subject = isDev ? `[DEV] OTP for ${email}: ${code}` : t('otp.subject')
	const text = isDev
		? `[DEV MODE]\nTarget email: ${email}\nVerification code: ${code}`
		: t('otp.textBody', { code })

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: targetEmail,
		subject,
		text,
		react: OTPTemplate({
			fullName: isDev ? `[DEV] ${email}` : 'User',
			otpCode: code,
			location,
			ipAddress,
			t,
		}),
	})
}

interface SendGenericEmailParams {
	body: string
	email: string
	subject: string
}

export async function sendGenericEmail({
	body,
	email,
	subject,
}: SendGenericEmailParams) {
	// In dev mode, send all emails to dev email with target info
	const targetEmail = isDev ? DEV_EMAIL : email
	const devSubject = isDev ? `[DEV] ${subject} (for ${email})` : subject
	const devBody = isDev ? `[DEV MODE]\nTarget email: ${email}\n\n${body}` : body

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: targetEmail,
		subject: devSubject,
		text: devBody,
	})
}

export async function sendApplicationSubmittedEmail(
	email: string,
	params: { creditAmountFormatted: string; termLabel: string },
) {
	const { t } = await getEmailT()
	const { creditAmountFormatted, termLabel } = params
	const targetEmail = isDev ? DEV_EMAIL : email
	const subject = isDev
		? `[DEV] Solicitud recibida (for ${email})`
		: t('applicationSubmitted.subject')
	const text = t('applicationSubmitted.textBody', {
		creditAmountFormatted,
		termLabel,
	})

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: targetEmail,
		subject,
		text: isDev ? `[DEV MODE]\nTarget: ${email}\n\n${text}` : text,
		react: ApplicationSubmittedTemplate({
			creditAmountFormatted,
			termLabel,
			t,
		}),
	})
}

export async function sendApplicationStatusEmail(
	email: string,
	params: {
		status: ApplicationStatus
		creditAmountFormatted: string
		termLabel: string
		reason?: string | null
	},
) {
	if (!isNotifyStatus(params.status)) return

	const { t } = await getEmailT()
	const statusLabelText =
		t(`applicationStatus.statusLabel.${params.status}`) || params.status

	const subjectKey = `applicationStatus.subject.${params.status}` as const
	const subject = t(subjectKey)

	const targetEmail = isDev ? DEV_EMAIL : email
	const subjectLine = isDev ? `[DEV] ${subject} (for ${email})` : subject
	const textBody = t('applicationStatus.textBody', {
		creditAmountFormatted: params.creditAmountFormatted,
		termLabel: params.termLabel,
		statusLabel: statusLabelText,
	})
	const text = params.reason
		? `${textBody}\n\n${t('applicationStatus.reasonPrefix')} ${params.reason}`
		: textBody

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: targetEmail,
		subject: subjectLine,
		text,
		react: ApplicationStatusTemplate({
			status: params.status,
			creditAmountFormatted: params.creditAmountFormatted,
			termLabel: params.termLabel,
			reason: params.reason,
			t,
		}),
	})
}
