import { EventSchemas, Inngest } from 'inngest'
import type { ApplicationStatus } from '~/server/db/schema'

type EmailApplicationSubmitted = {
	data: {
		email: string
		creditAmountFormatted: string
		termLabel: string
	}
}

type EmailApplicationStatus = {
	data: {
		email: string
		status: ApplicationStatus
		creditAmountFormatted: string
		termLabel: string
		reason?: string | null
	}
}

type EmailOtp = {
	data: { email: string; code: string; ipAddress: string }
}

type Events = {
	'email/application.submitted': EmailApplicationSubmitted
	'email/application.status': EmailApplicationStatus
	'email/otp': EmailOtp
}

export type EmailEventPayload =
	| { name: 'email/application.submitted'; data: Events['email/application.submitted']['data'] }
	| { name: 'email/application.status'; data: Events['email/application.status']['data'] }
	| { name: 'email/otp'; data: Events['email/otp']['data'] }

export const inngest = new Inngest({
	id: 'topcredit',
	schemas: new EventSchemas().fromRecord<Events>(),
})
