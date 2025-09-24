import { Resend } from 'resend'
import { OTPTemplate } from '~/components/email/otp-template'
import { env } from '~/env'
import { getLocationFromIP } from '~/lib/ip-location'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendOtpEmail(
	email: string,
	code: string,
	ipAddress: string,
) {
	const location = await getLocationFromIP(ipAddress)

	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: email,
		subject: 'Your One-Time Password',
		text: `Your verification code is: ${code}`,
		react: OTPTemplate({
			fullName: 'User',
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
	await resend.emails.send({
		from: env.EMAIL_FROM,
		to: email,
		subject: subject,
		text: body,
	})
}
