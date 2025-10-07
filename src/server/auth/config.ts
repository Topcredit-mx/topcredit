import { DrizzleAdapter } from '@auth/drizzle-adapter'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '~/server/db'
import {
	getUserByEmail,
	verifyBackupCodeLogin,
	verifyOtp,
	verifyTotpLogin,
} from './users'

export const authOptions = {
	adapter: DrizzleAdapter(db),
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
			if (session.user && token.sub) {
				session.user.id = Number(token.sub)
			}
			return session
		},
	},
	session: {
		strategy: 'jwt',
	},
} satisfies NextAuthOptions
