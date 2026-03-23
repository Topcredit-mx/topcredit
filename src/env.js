import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		NODE_ENV: z
			.enum(['development', 'test', 'production'])
			.default('development'),
		EMAIL_FROM: z.email(),
		RESEND_API_KEY: z.string(),
		AUTH_SECRET: z.string(),
		INNGEST_EVENT_KEY: z.string().optional(),
		E2E_OTP_CODE: z.string().length(6).regex(/^\d+$/).optional(),
		BLOB_READ_WRITE_TOKEN: z.string().optional(),
	},

	client: {},

	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		EMAIL_FROM: process.env.EMAIL_FROM,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		AUTH_SECRET: process.env.AUTH_SECRET,
		INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
		E2E_OTP_CODE: process.env.E2E_OTP_CODE,
		BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
})
