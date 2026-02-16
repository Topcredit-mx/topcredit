'use server'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { isEligibleForNewCredit } from '~/lib/abilities'
import {
	generateBackupCodes,
	generateTotpSetup,
	hashBackupCodes,
	verifyBackupCode,
	verifyTotpToken,
} from '~/lib/totp'
import { getClientIP } from '~/lib/ip-location'
import { db } from '~/server/db'
import { emailOtps, users } from '~/server/db/schema'
import { sendGenericEmail } from '~/server/email'
import { getApplicantEligibilityData } from './eligibility'
import { getUserByEmail, sendOtp } from './users'
import { checkRateLimit, updateRateLimitCounters } from './lib'
import { initializeUserRoles } from './role-management'

/**
 * Auth mutations that run without a session (no CASL context).
 * Kept in one file so it's clear these use custom checks, not getAbility().
 */

export async function registerUser(
	_prevState: unknown,
	formData: FormData,
): Promise<{ message?: string }> {
	const email = formData.get('email') as string
	const name = formData.get('name') as string

	if (!email || !name) {
		return { message: 'Email and name are required' }
	}

	const eligibility = await getApplicantEligibilityData(email)
	if (!isEligibleForNewCredit(eligibility)) {
		return {
			message:
				'Tu correo no está asociado a una empresa con crédito disponible. No puedes registrarte.',
		}
	}

	const [newUser] = await db.insert(users).values({ email, name }).returning()

	if (newUser) {
		await initializeUserRoles(newUser.id)
	}

	const ip = await getClientIP()
	await sendOtp(email, ip)
	redirect(`/verify-otp?email=${encodeURIComponent(email)}`)
}

export async function sendOtpForm(
	_prevState: unknown,
	formData: FormData,
): Promise<{ message?: string }> {
	const email = formData.get('email') as string

	if (!email) {
		return { message: 'Email is required' }
	}

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) redirect('/signup')

	const userWithRoles = await getUserByEmail(email)
	if (userWithRoles?.roles?.includes('applicant')) {
		const eligibility = await getApplicantEligibilityData(email)
		if (!isEligibleForNewCredit(eligibility)) {
			return {
				message:
					'Tu cuenta no tiene acceso al crédito. Contacta a tu empresa o a soporte.',
			}
		}
	}

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

export async function resendOtp(email: string): Promise<{
	success: boolean
	message: string
}> {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) {
		return { success: false, message: 'Usuario no encontrado' }
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
		return { success: true, message: 'Código reenviado exitosamente' }
	} catch (error) {
		return {
			success: false,
			message:
				error instanceof Error ? error.message : 'Límite de intentos excedido',
		}
	}
}

export async function verifyOtp(email: string, otp: string): Promise<void> {
	const otpRecord = await db.query.emailOtps.findFirst({
		where: eq(emailOtps.email, email),
	})

	if (!otpRecord) {
		throw new Error('Invalid OTP')
	}

	if (otpRecord.expiresAt < new Date()) {
		await db.delete(emailOtps).where(eq(emailOtps.id, otpRecord.id))
		throw new Error('OTP has expired')
	}

	const isValid = await bcrypt.compare(otp, otpRecord.code)
	if (!isValid) {
		throw new Error('Invalid OTP')
	}

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	const updateData: { loginFailedAttempts: number; emailVerified?: Date } = {
		loginFailedAttempts: 0,
	}
	if (user && !user.emailVerified) {
		updateData.emailVerified = new Date()
	}

	await db.update(users).set(updateData).where(eq(users.email, email))
	await db.delete(emailOtps).where(eq(emailOtps.id, otpRecord.id))
}

export async function initiateTotpSetup(email: string): Promise<{
	qrCodeUrl: string
	manualEntryKey: string
}> {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) {
		throw new Error('User not found')
	}

	if (user.totpEnabled) {
		throw new Error('TOTP is already enabled for this user')
	}

	const totpSetup = await generateTotpSetup(email)

	await db
		.update(users)
		.set({
			totpSecret: totpSetup.secret,
			totpEnabled: false,
		})
		.where(eq(users.id, user.id))

	return {
		qrCodeUrl: totpSetup.qrCodeUrl,
		manualEntryKey: totpSetup.manualEntryKey,
	}
}

export async function verifyTotpSetup(
	email: string,
	token: string,
): Promise<{ backupCodes: string[] }> {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user || !user.totpSecret) {
		throw new Error('TOTP setup not initiated')
	}

	if (user.totpEnabled) {
		throw new Error('TOTP is already enabled')
	}

	const isValid = verifyTotpToken(token, user.totpSecret)
	if (!isValid) {
		throw new Error('Invalid TOTP token')
	}

	const backupCodes = await generateBackupCodes()
	const hashedBackupCodes = await hashBackupCodes(backupCodes)

	await db
		.update(users)
		.set({
			totpEnabled: true,
			mfaMethod: 'totp',
			totpBackupCodes: JSON.stringify(hashedBackupCodes),
			loginFailedAttempts: 0,
		})
		.where(eq(users.id, user.id))

	return { backupCodes }
}

export async function verifyTotpLogin(email: string, token: string): Promise<void> {
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

export async function verifyBackupCodeLogin(
	email: string,
	backupCode: string,
): Promise<void> {
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user || !user.totpEnabled || !user.totpBackupCodes) {
		throw new Error('TOTP not enabled or no backup codes available')
	}

	const storedCodes = JSON.parse(user.totpBackupCodes) as string[]
	const { isValid, usedIndex } = await verifyBackupCode(backupCode, storedCodes)

	if (!isValid) {
		await db
			.update(users)
			.set({ loginFailedAttempts: user.loginFailedAttempts + 1 })
			.where(eq(users.id, user.id))
		throw new Error('Invalid backup code')
	}

	if (usedIndex !== undefined) {
		storedCodes[usedIndex] = ''
		await db
			.update(users)
			.set({
				totpBackupCodes: JSON.stringify(storedCodes),
				loginFailedAttempts: 0,
			})
			.where(eq(users.id, user.id))
	}

	const remainingCodes = storedCodes.filter((code) => code !== '').length
	if (remainingCodes < 3) {
		await sendGenericEmail({
			email,
			subject: 'Warning: Low Backup Codes',
			body: `You have only ${remainingCodes} backup codes remaining. Please generate new backup codes in your account settings to ensure you can access your account if needed.`,
		})
	}
}
