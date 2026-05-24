import { serve } from 'inngest/next'
import { inngest } from '~/inngest/client'
import {
	sendApplicationDocumentsRejectedEmail,
	sendApplicationStatusEmail,
	sendApplicationSubmittedEmail,
	sendOtpEmail,
} from '~/inngest/functions/email'
import { processQueueBulkConfirmJobFunction } from '~/inngest/functions/queue-bulk-confirm'

export const maxDuration = 60

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		sendApplicationSubmittedEmail,
		sendApplicationStatusEmail,
		sendApplicationDocumentsRejectedEmail,
		sendOtpEmail,
		processQueueBulkConfirmJobFunction,
	],
})
