import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import speakeasy from 'speakeasy'

export interface TotpSetup {
	secret: string
	qrCodeUrl: string
	manualEntryKey: string
}

export async function generateTotpSetup(
	userEmail: string,
	issuer = 'TopCredit',
): Promise<TotpSetup> {
	const secret = speakeasy.generateSecret({
		name: `${issuer} (${userEmail})`,
		issuer,
		length: 32,
	})

	if (!secret.otpauth_url || !secret.base32) {
		throw new Error('Failed to generate TOTP secret')
	}

	const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

	return {
		secret: secret.base32,
		qrCodeUrl,
		manualEntryKey: secret.base32,
	}
}

export function verifyTotpToken(token: string, secret: string): boolean {
	return speakeasy.totp.verify({
		secret,
		encoding: 'base32',
		token,
		window: 1,
	})
}

export async function generateBackupCodes(count = 10): Promise<string[]> {
	const codes: string[] = []

	for (let i = 0; i < count; i++) {
		const code = Math.random().toString(36).substring(2, 10).toUpperCase()
		codes.push(code)
	}

	return codes
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
	const hashedCodes = await Promise.all(
		codes.map((code) => bcrypt.hash(code, 12)),
	)
	return hashedCodes
}

export async function verifyBackupCode(
	inputCode: string,
	hashedCodes: string[],
): Promise<{ isValid: boolean; usedIndex?: number }> {
	for (let i = 0; i < hashedCodes.length; i++) {
		const hashedCode = hashedCodes[i]
		if (hashedCode) {
			const isValid = await bcrypt.compare(inputCode, hashedCode)
			if (isValid) {
				return { isValid: true, usedIndex: i }
			}
		}
	}
	return { isValid: false }
}
