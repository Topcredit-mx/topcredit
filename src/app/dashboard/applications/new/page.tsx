import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, requireAbility } from '~/server/auth/get-ability'
import { getRequiredApplicantUser } from '~/server/auth/lib'
import {
	getCompanyByEmailDomain,
	getTermOfferingsForCompany,
} from '~/server/queries'
import { ApplicationForm } from './application-form'

export default async function NewApplicationPage() {
	const [ability, user] = await Promise.all([
		getAbility(),
		getRequiredApplicantUser(),
	])
	requireAbility(ability, 'create', 'Application')

	const email = user.email ?? ''
	const company = await getCompanyByEmailDomain(email)

	const t = await getTranslations('dashboard.applications')

	if (!company) {
		return (
			<div className="min-h-screen bg-gray-50">
				<header className="bg-white shadow">
					<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
						<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
							{t('title')}
						</h1>
					</div>
				</header>
				<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<Card className="p-6">
						<p className="text-destructive">{t('error-email-domain')}</p>
						<Link
							href="/dashboard"
							className="mt-4 inline-block text-primary underline"
						>
							{t('back-dashboard')}
						</Link>
					</Card>
				</main>
			</div>
		)
	}

	const borrowingCapacityRate = company.borrowingCapacityRate
	if (!borrowingCapacityRate || Number(borrowingCapacityRate) <= 0) {
		return (
			<div className="min-h-screen bg-gray-50">
				<header className="bg-white shadow">
					<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
						<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
							{t('title')}
						</h1>
					</div>
				</header>
				<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<Card className="p-6">
						<p className="text-destructive">{t('error-company-no-rate')}</p>
						<Link
							href="/dashboard"
							className="mt-4 inline-block text-primary underline"
						>
							{t('back-dashboard')}
						</Link>
					</Card>
				</main>
			</div>
		)
	}

	const termOfferings = await getTermOfferingsForCompany(company.id)
	if (termOfferings.length === 0) {
		return (
			<div className="min-h-screen bg-gray-50">
				<header className="bg-white shadow">
					<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
						<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
							{t('title')}
						</h1>
					</div>
				</header>
				<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<Card className="p-6">
						<p className="text-destructive">{t('error-company-no-terms')}</p>
						<Link
							href="/dashboard"
							className="mt-4 inline-block text-primary underline"
						>
							{t('back-dashboard')}
						</Link>
					</Card>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
						{t('title')}
					</h1>
					<p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
				</div>
			</header>
			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<Card className="max-w-lg p-6">
					<ApplicationForm termOfferings={termOfferings} />
				</Card>
			</main>
		</div>
	)
}
