import { Resend } from 'resend'
import { ApplicationStatusTemplate } from '~/components/email/application-status-template'
import { ApplicationSubmittedTemplate } from '~/components/email/application-submitted-template'
import { OTPTemplate } from '~/components/email/otp-template'
import { env } from '~/env'
import type { EmailEventPayload } from '~/inngest/client'
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

function resolveRecipient(email: string): string {
	return isDev ? DEV_EMAIL : email
}
function resolveSubject(subject: string, intendedRecipient: string): string {
	return isDev ? `[DEV] ${subject} (for ${intendedRecipient})` : subject
}
function resolveBody(body: string, intendedRecipient: string): string {
	return isDev ? `[DEV MODE]\nTarget: ${intendedRecipient}\n\n${body}` : body
}

export async function sendOtpEmail(
	email: string,
	code: string,
	ipAddress: string,
) {
	const { t } = await getEmailT()
	const location = await getLocationFromIP(ipAddress)

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: resolveRecipient(email),
		subject: resolveSubject(t('otp.subject'), email),
		text: resolveBody(t('otp.textBody', { code }), email),
		react: OTPTemplate({
			fullName: email,
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
	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: resolveRecipient(email),
		subject: resolveSubject(subject, email),
		text: resolveBody(body, email),
	})
}

export async function sendApplicationSubmittedEmail(
	email: string,
	params: { creditAmountFormatted: string; termLabel: string },
) {
	const { t } = await getEmailT()
	const { creditAmountFormatted, termLabel } = params
	const subject = t('applicationSubmitted.subject')
	const text = t('applicationSubmitted.textBody', {
		creditAmountFormatted,
		termLabel,
	})

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: resolveRecipient(email),
		subject: resolveSubject(subject, email),
		text: resolveBody(text, email),
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
		to: resolveRecipient(email),
		subject: resolveSubject(subject, email),
		text: resolveBody(text, email),
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
	| { type: 'otp'; email: string; code: string; ipAddress: string }

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
		case 'otp':
			await sendOtpEmail(data.email, data.code, data.ipAddress)
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
	let event: EmailEventPayload
	switch (data.type) {
		case 'application-submitted':
			event = {
				name: 'email/application.submitted',
				data: {
					email: data.email,
					creditAmountFormatted: data.creditAmountFormatted,
					termLabel: data.termLabel,
				},
			}
			break
		case 'application-status':
			event = {
				name: 'email/application.status',
				data: {
					email: data.email,
					status: data.status,
					creditAmountFormatted: data.creditAmountFormatted,
					termLabel: data.termLabel,
					reason: data.reason ?? null,
				},
			}
			break
		case 'otp':
			event = {
				name: 'email/otp',
				data: {
					email: data.email,
					code: data.code,
					ipAddress: data.ipAddress,
				},
			}
			break
		default: {
			const _: never = data
			throw new Error(`Unknown email event type: ${JSON.stringify(data)}`)
		}
	}
	await inngest.send(event)
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

export async function sendOtpEvent(
	email: string,
	code: string,
	ipAddress: string,
): Promise<void> {
	await sendEmailEvent({ type: 'otp', email, code, ipAddress })
}
