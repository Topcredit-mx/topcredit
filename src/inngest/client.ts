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

type Events = {
	'email/application.submitted': EmailApplicationSubmitted
	'email/application.status': EmailApplicationStatus
}

export const inngest = new Inngest({
	id: 'topcredit',
	schemas: new EventSchemas().fromRecord<Events>(),
})
