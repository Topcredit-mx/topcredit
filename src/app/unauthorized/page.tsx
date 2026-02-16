import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { getTranslations } from 'next-intl/server'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { authOptions } from '~/server/auth/config'

export default async function UnauthorizedPage() {
	const t = await getTranslations('unauthorized')
	const tAuth = await getTranslations('auth')
	const session = await getServerSession(authOptions)

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<Card className="w-full max-w-md p-8 text-center">
				<div className="mb-6 flex justify-center">
					<div className="rounded-full bg-red-100 p-4">
						<AlertCircle className="h-12 w-12 text-red-600" />
					</div>
				</div>

				<h1 className="mb-2 font-bold text-3xl text-gray-900">{t('title')}</h1>

				<p className="mb-6 text-gray-600">{t('description')}</p>

				{session?.user ? (
					<div className="space-y-3">
						<p className="text-gray-500 text-sm">{t('contact-admin')}</p>
						<Button asChild className="w-full">
							<Link href="/">{t('back-home')}</Link>
						</Button>
					</div>
				) : (
					<div className="space-y-3">
						<p className="text-gray-500 text-sm">{t('need-login')}</p>
						<Button asChild className="w-full">
							<Link href="/login">{tAuth('login')}</Link>
						</Button>
					</div>
				)}
			</Card>
		</div>
	)
}
