import { Resend } from 'resend'
import { ApplicationStatusTemplate } from '~/components/email/application-status-template'
import { ApplicationSubmittedTemplate } from '~/components/email/application-submitted-template'
import { OTPTemplate } from '~/components/email/otp-template'
import { env } from '~/env'
import { getLocationFromIP } from '~/lib/ip-location'
import type { ApplicationStatus } from '~/server/db/schema'

const resend = new Resend(env.RESEND_API_KEY)

const isDev = env.NODE_ENV === 'development'
const DEV_EMAIL = 'david.cantum@proton.me'

export async function sendOtpEmail(
	email: string,
	code: string,
	ipAddress: string,
) {
	const location = await getLocationFromIP(ipAddress)

	// In dev mode, send all emails to dev email with target info in subject
	const targetEmail = isDev ? DEV_EMAIL : email
	const subject = isDev
		? `[DEV] OTP for ${email}: ${code}`
		: 'Your One-Time Password'

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: targetEmail,
		subject,
		text: isDev
			? `[DEV MODE]\nTarget email: ${email}\nVerification code: ${code}`
			: `Your verification code is: ${code}`,
		react: OTPTemplate({
			fullName: isDev ? `[DEV] ${email}` : 'User',
			otpCode: code,
			location,
			ipAddress,
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
	const { creditAmountFormatted, termLabel } = params
	const targetEmail = isDev ? DEV_EMAIL : email
	const subject = isDev
		? `[DEV] Solicitud recibida (for ${email})`
		: 'Tu solicitud de crédito fue recibida - Topcredit'

	const text = `Recibimos tu solicitud de crédito.\n\nResumen: Monto ${creditAmountFormatted}, Plazo ${termLabel}.\n\nPróximos pasos: Te notificaremos cuando haya un cambio de estado (pre-autorización, autorización o si necesitamos más datos). Puedes consultar el estado en tu panel en Topcredit.`

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: targetEmail,
		subject,
		text: isDev ? `[DEV MODE]\nTarget: ${email}\n\n${text}` : text,
		react: ApplicationSubmittedTemplate({
			creditAmountFormatted,
			termLabel,
		}),
	})
}

const NOTIFY_STATUSES: ApplicationStatus[] = [
	'pre-authorized',
	'authorized',
	'denied',
	'invalid-documentation',
]

export async function sendApplicationStatusEmail(
	email: string,
	params: {
		status: ApplicationStatus
		creditAmountFormatted: string
		termLabel: string
		reason?: string | null
	},
) {
	if (!NOTIFY_STATUSES.includes(params.status)) return

	const targetEmail = isDev ? DEV_EMAIL : email
	const subjectByStatus: Record<(typeof NOTIFY_STATUSES)[number], string> = {
		'pre-authorized': 'Tu crédito fue pre-autorizado - Topcredit',
		authorized: 'Tu crédito fue autorizado - Topcredit',
		denied: 'Actualización de tu solicitud de crédito - Topcredit',
		'invalid-documentation': 'Tu solicitud requiere documentación - Topcredit',
		new: '',
		pending: '',
	}
	const subject = isDev
		? `[DEV] ${subjectByStatus[params.status]} (for ${email})`
		: subjectByStatus[params.status]

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: targetEmail,
		subject,
		text: `Tu solicitud de crédito (${params.creditAmountFormatted}, ${params.termLabel}) ha sido actualizada a: ${params.status}.${params.reason ? `\n\nMotivo: ${params.reason}` : ''}`,
		react: ApplicationStatusTemplate({
			status: params.status,
			creditAmountFormatted: params.creditAmountFormatted,
			termLabel: params.termLabel,
			reason: params.reason,
		}),
	})
}
