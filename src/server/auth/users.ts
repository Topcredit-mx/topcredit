'use server'

import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getClientIP } from '~/lib/ip-location'
import { generateBackupCodes, hashBackupCodes } from '~/lib/totp'
import { db } from '~/server/db'
import { emailOtps, userRoles, users } from '~/server/db/schema'
import { sendOtpEvent } from '~/server/email'
import { fromErrorToFormState } from '~/server/errors/errors'
import { getAbility, requireAbility, subject } from './ability'
import { checkRateLimit, updateRateLimitCounters } from './rate-limit'
import { getRequiredUser } from './session'

export async function getUserByEmail(email: string) {
	const user = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.then((res) => res[0] || null)

	if (!user) return null

	const roles = await db
		.select({ role: userRoles.role })
		.from(userRoles)
		.where(eq(userRoles.userId, user.id))
		.then((res) => res.map((r) => r.role))

	return {
		...user,
		roles,
	}
}

export async function sendOtp(email: string, ipAddress: string) {
	await db.delete(emailOtps).where(eq(emailOtps.email, email))

	const otp = String(randomInt(100000, 999999))
	const hashedOtp = await bcrypt.hash(otp, 12)

	await db.insert(emailOtps).values({
		email,
		code: hashedOtp,
		ipAddress,
		expiresAt: new Date(Date.now() + 5 * 60 * 1000),
	})

	await sendOtpEvent(email, otp, ipAddress)
}

export async function disableTotpSetup(email: string) {
	const sessionUser = await getRequiredUser()
	const { ability } = await getAbility()
	requireAbility(ability, 'update', subject('User', { id: sessionUser.id }))

	if (sessionUser.email?.toLowerCase() !== email.toLowerCase()) {
		throw new Error('User not found')
	}

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) {
		throw new Error('User not found')
	}

	await db
		.update(users)
		.set({
			totpSecret: null,
			totpEnabled: false,
			totpBackupCodes: null,
			mfaMethod: 'email',
		})
		.where(eq(users.id, user.id))
}

export async function generateNewBackupCodes(email: string) {
	const sessionUser = await getRequiredUser()
	const { ability } = await getAbility()
	requireAbility(ability, 'update', subject('User', { id: sessionUser.id }))

	if (sessionUser.email?.toLowerCase() !== email.toLowerCase()) {
		throw new Error('User not found')
	}

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user || !user.totpEnabled) {
		throw new Error('TOTP not enabled for this user')
	}

	const backupCodes = await generateBackupCodes()
	const hashedBackupCodes = await hashBackupCodes(backupCodes)

	await db
		.update(users)
		.set({
			totpBackupCodes: JSON.stringify(hashedBackupCodes),
		})
		.where(eq(users.id, user.id))

	return { backupCodes }
}

const emailChangeSchema = z.object({
	newEmail: z
		.string()
		.min(1, 'El correo electrónico es requerido')
		.email('El correo electrónico debe tener un formato válido'),
})

export async function sendEmailChangeOtp(
	_prevState: unknown,
	formData: FormData,
): Promise<{
	errors?: Record<string, string>
	message?: string
	step?: 'otp'
}> {
	try {
		const sessionUser = await getRequiredUser()
		const { ability } = await getAbility()
		requireAbility(ability, 'update', subject('User', { id: sessionUser.id }))

		if (!sessionUser.email) {
			return { message: 'Usuario no autenticado' }
		}
		const currentEmail = sessionUser.email

		const data = emailChangeSchema.parse({
			newEmail: formData.get('newEmail'),
		})

		if (data.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
			return {
				errors: {
					newEmail: 'El nuevo correo debe ser diferente al actual',
				},
			}
		}

		const existingUser = await db.query.users.findFirst({
			where: eq(users.email, data.newEmail),
		})

		if (existingUser) {
			return {
				errors: {
					newEmail: 'Este correo electrónico ya está registrado.',
				},
			}
		}

		const user = await db.query.users.findFirst({
			where: eq(users.email, currentEmail),
		})

		if (!user) {
			return { message: 'Usuario actual no encontrado' }
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
		await sendOtp(data.newEmail, ip)
		return { step: 'otp' }
	} catch (error) {
		return fromErrorToFormState(error)
	}
}

const otpVerificationSchema = z.object({
	newEmail: z
		.string()
		.email('El correo electrónico debe tener un formato válido'),
	otp: z.string().length(6, 'El código OTP debe tener 6 dígitos'),
})

export async function verifyEmailChangeOtp(
	_prevState: unknown,
	formData: FormData,
): Promise<{
	errors?: Record<string, string>
	message?: string
	success?: boolean
}> {
	try {
		const sessionUser = await getRequiredUser()
		const { ability } = await getAbility()
		requireAbility(ability, 'update', subject('User', { id: sessionUser.id }))

		if (!sessionUser.email) {
			return { message: 'Usuario no autenticado' }
		}
		const currentEmail = sessionUser.email

		const data = otpVerificationSchema.parse({
			newEmail: formData.get('newEmail'),
			otp: formData.get('otp'),
		})

		const otpRecord = await db.query.emailOtps.findFirst({
			where: eq(emailOtps.email, data.newEmail),
		})

		if (!otpRecord) {
			return {
				errors: {
					otp: 'Código OTP inválido',
				},
			}
		}

		if (otpRecord.expiresAt < new Date()) {
			await db.delete(emailOtps).where(eq(emailOtps.id, otpRecord.id))
			return {
				errors: {
					otp: 'El código OTP ha expirado',
				},
			}
		}

		const isValid = await bcrypt.compare(data.otp, otpRecord.code)

		if (!isValid) {
			return {
				errors: {
					otp: 'Código OTP inválido',
				},
			}
		}

		const existingUser = await db.query.users.findFirst({
			where: eq(users.email, data.newEmail),
		})

		if (existingUser) {
			return {
				errors: {
					newEmail: 'Este correo electrónico ya está registrado.',
				},
			}
		}

		await db
			.update(users)
			.set({
				email: data.newEmail,
				emailVerified: new Date(),
				loginFailedAttempts: 0,
			})
			.where(eq(users.email, currentEmail))

		await db.delete(emailOtps).where(eq(emailOtps.id, otpRecord.id))
		return { success: true }
	} catch (error) {
		return fromErrorToFormState(error)
	}
}
