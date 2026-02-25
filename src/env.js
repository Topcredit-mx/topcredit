import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		DATABASE_URL: z.url(),
		NODE_ENV: z
			.enum(['development', 'test', 'production'])
			.default('development'),
		EMAIL_FROM: z.email(),
		RESEND_API_KEY: z.string(),
		AUTH_URL: z.string().url(),
		AUTH_SECRET: z.string(),
		INNGEST_EVENT_KEY: z.string().optional(),
		/** E2E test mode: fixed OTP, no emails. Use this because next dev forces NODE_ENV=development. */
		E2E_TEST_MODE: z.enum(['true']).optional(),
		/** When E2E test mode, OTP code for E2E login. Required when E2E_TEST_MODE=true; CI sets a random value per run. */
		E2E_OTP_CODE: z
			.string()
			.length(6)
			.regex(/^\d+$/)
			.optional(),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		EMAIL_FROM: process.env.EMAIL_FROM,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		AUTH_URL: process.env.AUTH_URL,
		AUTH_SECRET: process.env.AUTH_SECRET,
		INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
		E2E_TEST_MODE: process.env.E2E_TEST_MODE,
		E2E_OTP_CODE: process.env.E2E_OTP_CODE,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
})
