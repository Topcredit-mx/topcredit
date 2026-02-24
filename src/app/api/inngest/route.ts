import { serve } from 'inngest/next'
import { inngest } from '~/inngest/client'
import {
	sendApplicationStatusEmail,
	sendApplicationSubmittedEmail,
	sendOtpEmail,
} from '~/inngest/functions/email'

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		sendApplicationSubmittedEmail,
		sendApplicationStatusEmail,
		sendOtpEmail,
	],
})
