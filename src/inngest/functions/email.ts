import { inngest } from '~/inngest/client'
import { sendEmailFromEventData } from '~/server/email'

export const sendApplicationSubmittedEmail = inngest.createFunction(
	{ id: 'email-application-submitted', retries: 2 },
	{ event: 'email/application.submitted' },
	async ({ event }) => {
		await sendEmailFromEventData({
			type: 'application-submitted',
			email: event.data.email,
			creditAmountFormatted: event.data.creditAmountFormatted,
			termLabel: event.data.termLabel,
		})
	},
)

export const sendApplicationStatusEmail = inngest.createFunction(
	{ id: 'email-application-status', retries: 2 },
	{ event: 'email/application.status' },
	async ({ event }) => {
		await sendEmailFromEventData({
			type: 'application-status',
			email: event.data.email,
			status: event.data.status,
			creditAmountFormatted: event.data.creditAmountFormatted,
			termLabel: event.data.termLabel,
			reason: event.data.reason ?? undefined,
		})
	},
)

export const sendApplicationDocumentsRejectedEmail = inngest.createFunction(
	{ id: 'email-application-documents-rejected', retries: 2 },
	{ event: 'email/application.documentsRejected' },
	async ({ event }) => {
		await sendEmailFromEventData({
			type: 'application-documents-rejected',
			email: event.data.email,
			items: event.data.items,
		})
	},
)

export const sendOtpEmail = inngest.createFunction(
	{ id: 'email-otp', retries: 2 },
	{ event: 'email/otp' },
	async ({ event }) => {
		await sendEmailFromEventData({
			type: 'otp',
			email: event.data.email,
			code: event.data.code,
			ipAddress: event.data.ipAddress,
		})
	},
)
