/**
 * Email events. When Inngest is configured (INNGEST_EVENT_KEY in production),
 * we send events; Inngest functions run and send the email. When not configured
 * (e.g. dev), we send the email inline so you don't need Inngest or a public URL.
 */
import { env } from '~/env'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	sendApplicationStatusEmail,
	sendApplicationSubmittedEmail,
} from '~/server/email'

const INNGEST_EVENT_KEY = env.INNGEST_EVENT_KEY

/** Event data we send to Inngest and pass to the function handler. */
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

/** Sends the email for the given event data. Used by Inngest functions and by inline fallback. */
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
