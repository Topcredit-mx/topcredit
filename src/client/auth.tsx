'use client'

import type { SessionProviderProps } from 'next-auth/react'
import {
	signIn as nextAuthSignIn,
	signOut as nextAuthSignOut,
	SessionProvider,
	useSession as useNextAuthSession,
} from 'next-auth/react'

export function AuthSessionProvider(props: SessionProviderProps) {
	return <SessionProvider {...props} />
}

export const useAuthSession = useNextAuthSession

export const authSignIn = nextAuthSignIn

export const authSignOut = nextAuthSignOut
