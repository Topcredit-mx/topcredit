import type { ReactNode } from 'react'
import { getRequiredUser } from '~/server/auth/session'

export default async function SettingsRootLayout({
	children,
}: {
	children: ReactNode
}) {
	await getRequiredUser()
	return children
}
