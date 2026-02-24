// biome-ignore lint/correctness/noUnusedImports: this should be here
import NextAuth from 'next-auth'
import type { Role } from '~/server/auth/session'

declare module 'next-auth' {
	interface Session {
		user: {
			id: number
			name?: string | null
			email?: string | null
			image?: string | null
			roles: Role[]
		}
	}

	interface User {
		id: number
		roles: Role[]
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		roles?: Role[]
	}
}
