import type { Config } from 'drizzle-kit'

export default {
	schema: './src/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		// biome-ignore lint/style/noNonNullAssertion: we need this to ensure this works in Cypress
		url: process.env.DATABASE_URL!,
	},
} satisfies Config
