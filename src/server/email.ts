import { Resend } from 'resend'
import { OTPTemplate } from '~/components/email/otp-template'
import { env } from '~/env'
import { getLocationFromIP } from '~/lib/ip-location'

const resend = new Resend(env.RESEND_API_KEY)

const isDev = process.env.NODE_ENV === 'development'
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
