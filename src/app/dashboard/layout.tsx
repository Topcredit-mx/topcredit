import type { ReactNode } from 'react'
import { getRequiredApplicantUser } from '~/server/auth/session'

export default async function DashboardRootLayout({
	children,
}: {
	children: ReactNode
}) {
	await getRequiredApplicantUser()
	return children
}
