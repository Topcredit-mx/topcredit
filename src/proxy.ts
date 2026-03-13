import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
	authMiddlewareMatcher,
	isAuthPath,
	redirectLoggedInFromAuthRoutes,
	withAppAuth,
} from '~/server/auth/middleware'

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
	const path = req.nextUrl.pathname
	const redirect = await redirectLoggedInFromAuthRoutes(req)
	if (redirect) return redirect
	// Auth paths: allow through (unauth users see login/landing). Protected paths: require auth.
	if (isAuthPath(path)) return NextResponse.next()
	return withAppAuth(req as Parameters<typeof withAppAuth>[0], event)
}

export const config = {
	matcher: authMiddlewareMatcher,
}
