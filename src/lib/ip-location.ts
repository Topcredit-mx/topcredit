import { headers } from 'next/headers'

interface LocationData {
	city?: string
	region?: string
	country?: string
	timezone?: string
}

export async function getLocationFromIP(ipAddress: string): Promise<string> {
	if (
		ipAddress === '127.0.0.1' ||
		ipAddress === '::1' ||
		ipAddress.startsWith('192.168.') ||
		ipAddress.startsWith('10.')
	) {
		return 'Local network'
	}

	try {
		const response = await fetch(
			`http://ip-api.com/json/${ipAddress}?fields=city,regionName,country,timezone,status`,
		)

		if (!response.ok) {
			return 'Unknown location'
		}

		const data: LocationData & { status: string } = await response.json()

		if (data.status === 'fail') {
			return 'Unknown location'
		}

		const parts: string[] = []

		if (data.city) {
			parts.push(data.city)
		}

		if (data.region && data.region !== data.city) {
			parts.push(data.region)
		}

		if (data.country) {
			parts.push(data.country)
		}

		return parts.length > 0 ? parts.join(', ') : 'Unknown location'
	} catch (error) {
		console.error('Error fetching location data:', error)
		return 'Unknown location'
	}
}

export async function getCountryFromIP(ipAddress: string): Promise<string> {
	if (
		ipAddress === '127.0.0.1' ||
		ipAddress === '::1' ||
		ipAddress.startsWith('192.168.') ||
		ipAddress.startsWith('10.')
	) {
		return 'Local'
	}

	try {
		const response = await fetch(
			`http://ip-api.com/json/${ipAddress}?fields=country,status`,
		)

		if (!response.ok) {
			return 'Unknown'
		}

		const data: { country?: string; status: string } = await response.json()

		return data.status === 'success' && data.country ? data.country : 'Unknown'
	} catch (error) {
		console.error('Error fetching country data:', error)
		return 'Unknown'
	}
}

export async function getClientIP(): Promise<string> {
	const headersList = await headers()
	const forwarded = headersList.get('x-forwarded-for')
	const realIP = headersList.get('x-real-ip')

	if (forwarded) {
		return forwarded.split(',')[0]?.trim() || '127.0.0.1'
	}

	if (realIP) {
		return realIP
	}

	return '127.0.0.1'
}
