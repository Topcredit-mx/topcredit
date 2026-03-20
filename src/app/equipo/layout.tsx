import type { ReactNode } from 'react'
import { getRequiredAgentUser } from '~/server/auth/session'

export default async function AppRootLayout({
	children,
}: {
	children: ReactNode
}) {
	await getRequiredAgentUser()
	return children
}
