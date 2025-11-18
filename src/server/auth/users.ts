'use server'

import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import type { Role } from '~/lib/auth-utils'
import { getClientIP } from '~/lib/ip-location'
import {
	generateBackupCodes,
	generateTotpSetup,
	hashBackupCodes,
	verifyBackupCode,
	verifyTotpToken,
} from '~/lib/totp'
import { db } from '~/server/db'
import { emailOtps, userRoles, users } from '~/server/db/schema'
import { sendGenericEmail, sendOtpEmail } from '~/server/email'
import { checkRateLimit, updateRateLimitCounters } from './lib'
import { initializeUserRoles } from './role-management'

export async function getUserByEmail(email: string) {
	const user = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.then((res) => res[0] || null)

	if (!user) return null

	// Fetch user roles from junction table
	const roles = await db
		.select({ role: userRoles.role })
		.from(userRoles)
		.where(eq(userRoles.userId, user.id))
		.then((res) => res.map((r) => r.role as Role))

	return {
		...user,
		roles: roles.length > 0 ? roles : (['customer'] as Role[]), // Default to customer if no roles assigned
	}
}

export async function registerUser(_prevState: unknown, formData: FormData) {
	const email = formData.get('email') as string
	const name = formData.get('name') as string

	if (!email || !name) {
		return { message: 'Email and name are required' }
	}

	const [newUser] = await db.insert(users).values({ email, name }).returning()

	// Assign default customer role to new user
	if (newUser) {
		await initializeUserRoles(newUser.id)
	}

	const ip = await getClientIP()
	await sendOtp(email, ip)
	redirect(`/verify-otp?email=${encodeURIComponent(email)}`)
}

export async function sendOtpForm(_prevState: unknown, formData: FormData) {
	const email = formData.get('email') as string

	if (!email) {
		return { message: 'Email is required' }
	}

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) redirect('/signup')

	if (user.totpEnabled) {
		redirect(`/verify-totp?email=${encodeURIComponent(email)}`)
	}

	try {
		const rateLimitAction = checkRateLimit(
			user.lastOtpSentAt,
			user.loginFailedAttempts,
		)

		await updateRateLimitCounters(
			user.id,
			rateLimitAction,
			user.loginFailedAttempts,
		)

		const ip = await getClientIP()
		await sendOtp(email, ip)
	} catch (error) {
		return {
			message: error instanceof Error ? error.message : 'Rate limit exceeded',
		}
	}

	redirect(`/verify-otp?email=${encodeURIComponent(email)}`)
}

export async function sendOtp(email: string, ipAddress: string) {
	await db.delete(emailOtps).where(eq(emailOtps.email, email))

	const otp = String(randomInt(100000, 999999))
	const hashedOtp = await bcrypt.hash(otp, 12)

	await db.insert(emailOtps).values({
		email,
		code: hashedOtp, // Store hashed OTP
		ipAddress,
		expiresAt: new Date(Date.now() + 5 * 60 * 1000),
	})

	// Send the plain OTP in email
	await sendOtpEmail(email, otp, ipAddress)
}

export async function verifyOtp(email: string, otp: string) {
	const otpRecord = await db.query.emailOtps.findFirst({
		where: eq(emailOtps.email, email),
	})

	if (!otpRecord) {
		throw new Error('Invalid OTP')
	}

	// Check if OTP has expired
	if (otpRecord.expiresAt < new Date()) {
		await db.delete(emailOtps).where(eq(emailOtps.id, otpRecord.id))
		throw new Error('OTP has expired')
	}

	// Compare the provided OTP with the hashed one
	const isValid = await bcrypt.compare(otp, otpRecord.code)

	if (!isValid) {
		throw new Error('Invalid OTP')
	}

	// Get user to check if email is already verified
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	// Only set emailVerified if it's not already set
	const updateData: { loginFailedAttempts: number; emailVerified?: Date } = {
		loginFailedAttempts: 0,
	}
	if (user && !user.emailVerified) {
		updateData.emailVerified = new Date()
	}

	// Reset retry count and conditionally set email as verified
	await db.update(users).set(updateData).where(eq(users.email, email))

	await db.delete(emailOtps).where(eq(emailOtps.id, otpRecord.id))
}

// ==============================================================================
// TOTP (Google Authenticator) Actions
// ==============================================================================

/**
 * Initiate TOTP setup - generate secret and QR code for user
 */
export async function initiateTotpSetup(email: string) {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) {
		throw new Error('User not found')
	}

	if (user.totpEnabled) {
		throw new Error('TOTP is already enabled for this user')
	}

	// Generate TOTP setup data
	const totpSetup = await generateTotpSetup(email)

	// Store the secret in database (not enabled yet - pending verification)
	await db
		.update(users)
		.set({
			totpSecret: totpSetup.secret,
			totpEnabled: false, // Not enabled until verification
		})
		.where(eq(users.id, user.id))

	return {
		qrCodeUrl: totpSetup.qrCodeUrl,
		manualEntryKey: totpSetup.manualEntryKey,
	}
}

/**
 * Verify TOTP setup with a test token
 */
export async function verifyTotpSetup(email: string, token: string) {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user || !user.totpSecret) {
		throw new Error('TOTP setup not initiated')
	}

	if (user.totpEnabled) {
		throw new Error('TOTP is already enabled')
	}

	// Verify the token against the secret
	const isValid = verifyTotpToken(token, user.totpSecret)

	if (!isValid) {
		throw new Error('Invalid TOTP token')
	}

	// Generate backup codes
	const backupCodes = await generateBackupCodes()
	const hashedBackupCodes = await hashBackupCodes(backupCodes)

	// Enable TOTP and store backup codes
	await db
		.update(users)
		.set({
			totpEnabled: true,
			mfaMethod: 'totp',
			totpBackupCodes: JSON.stringify(hashedBackupCodes),
			loginFailedAttempts: 0, // Reset on successful setup
		})
		.where(eq(users.id, user.id))

	return { backupCodes } // Return plain text codes for user to save
}

/**
 * Disable TOTP for a user
 */
export async function disableTotpSetup(email: string) {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) {
		throw new Error('User not found')
	}

	// Disable TOTP and clear all TOTP data
	await db
		.update(users)
		.set({
			totpSecret: null,
			totpEnabled: false,
			totpBackupCodes: null,
			mfaMethod: 'email', // Back to email OTP
		})
		.where(eq(users.id, user.id))
}

/**
 * Verify TOTP token during login
 */
export async function verifyTotpLogin(email: string, token: string) {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user || !user.totpSecret || !user.totpEnabled) {
		throw new Error('TOTP not enabled for this user')
	}

	const isValid = verifyTotpToken(token, user.totpSecret)

	if (!isValid) {
		await db
			.update(users)
			.set({ loginFailedAttempts: user.loginFailedAttempts + 1 })
			.where(eq(users.id, user.id))

		throw new Error('Invalid TOTP token')
	}

	await db
		.update(users)
		.set({ loginFailedAttempts: 0 })
		.where(eq(users.id, user.id))
}

/**
 * Verify backup code during login recovery
 */
export async function verifyBackupCodeLogin(email: string, backupCode: string) {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user || !user.totpEnabled || !user.totpBackupCodes) {
		throw new Error('TOTP not enabled or no backup codes available')
	}

	// Parse stored backup codes
	const storedCodes = JSON.parse(user.totpBackupCodes) as string[]

	// Verify the backup code
	const { isValid, usedIndex } = await verifyBackupCode(backupCode, storedCodes)

	if (!isValid) {
		// Increment failed attempts
		await db
			.update(users)
			.set({ loginFailedAttempts: user.loginFailedAttempts + 1 })
			.where(eq(users.id, user.id))

		throw new Error('Invalid backup code')
	}

	// Remove the used backup code (one-time use)
	if (usedIndex !== undefined) {
		storedCodes[usedIndex] = '' // Mark as used with empty string
		await db
			.update(users)
			.set({
				totpBackupCodes: JSON.stringify(storedCodes),
				loginFailedAttempts: 0, // Reset failed attempts on success
			})
			.where(eq(users.id, user.id))
	}

	const remainingCodes = storedCodes.filter((code) => code !== '').length

	if (remainingCodes < 3) {
		// send email to user warning about low backup codes
		await sendGenericEmail({
			email,
			subject: 'Warning: Low Backup Codes',
			body: `You have only ${remainingCodes} backup codes remaining. Please generate new backup codes in your account settings to ensure you can access your account if needed.`,
		})
	}
}

/**
 * Generate new backup codes (invalidates old ones)
 */
export async function generateNewBackupCodes(email: string) {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user || !user.totpEnabled) {
		throw new Error('TOTP not enabled for this user')
	}

	// Generate new backup codes
	const backupCodes = await generateBackupCodes()
	const hashedBackupCodes = await hashBackupCodes(backupCodes)

	// Update database with new backup codes
	await db
		.update(users)
		.set({
			totpBackupCodes: JSON.stringify(hashedBackupCodes),
		})
		.where(eq(users.id, user.id))

	return { backupCodes } // Return plain text codes for user to save
}

// ==============================================================================
// Email Verification and Change Actions
// ==============================================================================

/**
 * Send OTP for email change verification
 */
export async function sendEmailChangeOtp(
	currentEmail: string,
	newEmail: string,
) {
	const existingUser = await db.query.users.findFirst({
		where: eq(users.email, newEmail),
	})

	if (existingUser) {
		throw new Error('Email already in use')
	}

	const user = await db.query.users.findFirst({
		where: eq(users.email, currentEmail),
	})

	if (!user) {
		throw new Error('Current user not found')
	}

	const rateLimitAction = checkRateLimit(
		user.lastOtpSentAt,
		user.loginFailedAttempts,
	)

	await updateRateLimitCounters(
		user.id,
		rateLimitAction,
		user.loginFailedAttempts,
	)

	const ip = await getClientIP()
	await sendOtp(newEmail, ip)
}

/**
 * Verify OTP and change user email
 */
export async function verifyEmailChangeOtp(
	currentEmail: string,
	newEmail: string,
	otp: string,
) {
	// Verify the OTP for the new email
	const otpRecord = await db.query.emailOtps.findFirst({
		where: eq(emailOtps.email, newEmail),
	})

	if (!otpRecord) {
		throw new Error('Invalid OTP')
	}

	// Check if OTP has expired
	if (otpRecord.expiresAt < new Date()) {
		await db.delete(emailOtps).where(eq(emailOtps.id, otpRecord.id))
		throw new Error('OTP has expired')
	}

	// Compare the provided OTP with the hashed one
	const isValid = await bcrypt.compare(otp, otpRecord.code)

	if (!isValid) {
		throw new Error('Invalid OTP')
	}

	// Check if new email is still available (double-check)
	const existingUser = await db.query.users.findFirst({
		where: eq(users.email, newEmail),
	})

	if (existingUser) {
		throw new Error('Email already in use')
	}

	// Update user email and mark as verified
	await db
		.update(users)
		.set({
			email: newEmail,
			emailVerified: new Date(),
			loginFailedAttempts: 0,
		})
		.where(eq(users.email, currentEmail))

	// Clean up OTP record
	await db.delete(emailOtps).where(eq(emailOtps.id, otpRecord.id))
}
