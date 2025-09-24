import { DrizzleAdapter } from '@auth/drizzle-adapter'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '~/server/db'
import {
	getUserByEmail,
	verifyBackupCodeLogin,
	verifyOtp,
	verifyTotpLogin,
} from './actions'

export const authOptions = {
	adapter: DrizzleAdapter(db),
	providers: [
		CredentialsProvider({
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'text' },
				otp: { label: 'OTP', type: 'text' },
				totp: { label: 'TOTP', type: 'text' },
				backupCode: { label: 'Backup Code', type: 'text' },
			},
			async authorize(credentials) {
				if (!credentials?.email) return null

				try {
					// Check if this is backup code verification
					if (credentials.backupCode) {
						await verifyBackupCodeLogin(
							credentials.email,
							credentials.backupCode,
						)
					} else if (credentials.totp) {
						await verifyTotpLogin(credentials.email, credentials.totp)
					} else if (credentials.otp) {
						await verifyOtp(credentials.email, credentials.otp)
					} else {
						return null
					}

					return await getUserByEmail(credentials.email)
				} catch (error) {
					// NextAuth will handle this and redirect with error
					console.log('Authentication failed:', error)
					return null
				}
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
