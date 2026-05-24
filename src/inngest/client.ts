import { eventType, Inngest, staticSchema } from 'inngest'
import type { ApplicationStatus, DocumentType } from '~/server/db/schema'

type EmailApplicationSubmittedData = {
	email: string
	creditAmountFormatted: string
	termLabel: string
}

type EmailApplicationStatusData = {
	email: string
	status: ApplicationStatus
	creditAmountFormatted: string
	termLabel: string
	reason?: string | null
}

type EmailApplicationDocumentsRejectedData = {
	email: string
	items: { documentType: DocumentType; reason: string }[]
}

type EmailOtpData = { email: string; code: string; ipAddress: string }

export const emailApplicationSubmittedEvent = eventType(
	'email/application.submitted',
	{ schema: staticSchema<EmailApplicationSubmittedData>() },
)

export const emailApplicationStatusEvent = eventType(
	'email/application.status',
	{ schema: staticSchema<EmailApplicationStatusData>() },
)

export const emailApplicationDocumentsRejectedEvent = eventType(
	'email/application.documentsRejected',
	{ schema: staticSchema<EmailApplicationDocumentsRejectedData>() },
)

export const emailOtpEvent = eventType('email/otp', {
	schema: staticSchema<EmailOtpData>(),
})

export const queueBulkConfirmProcessEvent = eventType(
	'queue/bulkConfirm.process',
	{ schema: staticSchema<{ jobId: number }>() },
)

export const inngest = new Inngest({
	id: 'topcredit',
	checkpointing: {
		maxRuntime: '50s',
	},
})
