'use client'

import type { ReactNode } from 'react'
import { AuthSessionProvider } from '~/client/auth'

export function Providers({ children }: { children: ReactNode }) {
	return <AuthSessionProvider>{children}</AuthSessionProvider>
}
