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
const INNGEST_EVENT_KEY = env.INNGEST_EVENT_KEY

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

/** Inngest event payload; also used when sending inline (no Inngest). */
export type EmailEventData =
	| {
			type: 'application-submitted'
			email: string
			creditAmountFormatted: string
			termLabel: string
	  }
	| {
			type: 'application-status'
			email: string
			status: ApplicationStatus
			creditAmountFormatted: string
			termLabel: string
			reason?: string | null
	  }

export async function sendEmailFromEventData(
	data: EmailEventData,
): Promise<void> {
	switch (data.type) {
		case 'application-submitted':
			await sendApplicationSubmittedEmail(data.email, {
				creditAmountFormatted: data.creditAmountFormatted,
				termLabel: data.termLabel,
			})
			break
		case 'application-status':
			await sendApplicationStatusEmail(data.email, {
				status: data.status,
				creditAmountFormatted: data.creditAmountFormatted,
				termLabel: data.termLabel,
				reason: data.reason ?? undefined,
			})
			break
		default: {
			const _: never = data
			throw new Error(`Unknown email event type: ${JSON.stringify(data)}`)
		}
	}
}

async function sendEmailEvent(data: EmailEventData): Promise<void> {
	if (!INNGEST_EVENT_KEY) {
		await sendEmailFromEventData(data)
		return
	}
	const { inngest } = await import('~/inngest/client')
	if (data.type === 'application-submitted') {
		await inngest.send({
			name: 'email/application.submitted',
			data: {
				email: data.email,
				creditAmountFormatted: data.creditAmountFormatted,
				termLabel: data.termLabel,
			},
		})
	} else {
		await inngest.send({
			name: 'email/application.status',
			data: {
				email: data.email,
				status: data.status,
				creditAmountFormatted: data.creditAmountFormatted,
				termLabel: data.termLabel,
				reason: data.reason ?? null,
			},
		})
	}
}

export async function sendApplicationSubmittedEvent(
	email: string,
	params: { creditAmountFormatted: string; termLabel: string },
): Promise<void> {
	await sendEmailEvent({
		type: 'application-submitted',
		email,
		creditAmountFormatted: params.creditAmountFormatted,
		termLabel: params.termLabel,
	})
}

export async function sendApplicationStatusEvent(
	email: string,
	params: {
		status: ApplicationStatus
		creditAmountFormatted: string
		termLabel: string
		reason?: string | null
	},
): Promise<void> {
	await sendEmailEvent({
		type: 'application-status',
		email,
		status: params.status,
		creditAmountFormatted: params.creditAmountFormatted,
		termLabel: params.termLabel,
		reason: params.reason ?? null,
	})
}
