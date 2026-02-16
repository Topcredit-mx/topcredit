import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import {
	getUserByEmail,
	verifyBackupCodeLogin,
	verifyOtp,
	verifyTotpLogin,
} from './users'

export const authOptions = {
	providers: [
		CredentialsProvider({
			id: 'email-otp',
			credentials: {
				email: { label: 'Email', type: 'text' },
				otp: { label: 'OTP', type: 'text' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.otp) return null

				await verifyOtp(credentials.email, credentials.otp)
				return await getUserByEmail(credentials.email)
			},
		}),
		CredentialsProvider({
			id: 'totp',
			name: 'TOTP',
			credentials: {
				email: { label: 'Email', type: 'text' },
				totp: { label: 'TOTP', type: 'text' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.totp) return null

				await verifyTotpLogin(credentials.email, credentials.totp)
				return await getUserByEmail(credentials.email)
			},
		}),
		CredentialsProvider({
			id: 'backup-code',
			name: 'Backup Code',
			credentials: {
				email: { label: 'Email', type: 'text' },
				backupCode: { label: 'Backup Code', type: 'text' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.backupCode) return null

				await verifyBackupCodeLogin(credentials.email, credentials.backupCode)
				return await getUserByEmail(credentials.email)
			},
		}),
	],
	callbacks: {
		async session({ session, token }) {
			if (session.user) {
				// Normalize id to number once here so session.user.id is always number app-wide
				const id = Number(token.sub)
				if (!Number.isInteger(id)) {
					throw new Error('Invalid session: missing or invalid user id')
				}
				session.user.id = id
				if (token.roles?.length) {
					session.user.roles = token.roles
				} else {
					session.user.roles = ['applicant']
				}
			}
			return session
		},
		async jwt({ token, user }) {
			if (user) {
				token.sub = String(user.id)
				token.roles = user.roles
			}
			return token
		},
	},
	session: {
		strategy: 'jwt',
	},
} satisfies NextAuthOptions
