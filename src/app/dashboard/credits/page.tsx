import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { subject } from '~/lib/abilities'
import { getAbility, requireAbility } from '~/server/auth/get-ability'
import { getRequiredApplicantUser } from '~/server/auth/lib'
import { getCreditsByBorrowerId } from '~/server/queries'

const STATUS_KEYS: Record<string, string> = {
	new: 'status-new',
	pending: 'status-pending',
	'invalid-documentation': 'status-invalid-documentation',
	authorized: 'status-authorized',
	denied: 'status-denied',
	dispersed: 'status-dispersed',
	settled: 'status-settled',
	defaulted: 'status-defaulted',
}

export default async function CreditsListPage() {
	const [ability, user] = await Promise.all([
		getAbility(),
		getRequiredApplicantUser(),
	])
	requireAbility(
		ability,
		'read',
		subject('Credit', { id: 0, borrowerId: user.id }),
	)
	const creditsList = await getCreditsByBorrowerId(user.id)
	const tCredits = await getTranslations('dashboard.credits')

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
						{tCredits('title')}
					</h1>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{creditsList.length === 0 ? (
					<Card className="p-8 text-center">
						<p className="text-gray-600">{tCredits('empty')}</p>
						<Button asChild className="mt-4">
							<Link href="/dashboard/credits/new">
								{tCredits('new-application')}
							</Link>
						</Button>
					</Card>
				) : (
					<>
						<div className="mb-4 flex justify-end">
							<Button asChild>
								<Link href="/dashboard/credits/new">
									{tCredits('new-application')}
								</Link>
							</Button>
						</div>
						<Card>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b bg-gray-50 text-left text-gray-600 text-sm">
											<th className="px-4 py-3 font-medium">
												{tCredits('th-status')}
											</th>
											<th className="px-4 py-3 font-medium">
												{tCredits('th-amount')}
											</th>
											<th className="px-4 py-3 font-medium">
												{tCredits('th-date')}
											</th>
										</tr>
									</thead>
									<tbody>
										{creditsList.map((credit) => (
											<tr
												key={credit.id}
												className="border-b last:border-0 hover:bg-gray-50"
											>
												<td className="px-4 py-3">
													{tCredits(STATUS_KEYS[credit.status] ?? 'status-new')}
												</td>
												<td className="px-4 py-3">
													{Number(credit.creditAmount).toLocaleString('es-MX', {
														style: 'currency',
														currency: 'MXN',
													})}
												</td>
												<td className="px-4 py-3 text-gray-600">
													{new Date(credit.createdAt).toLocaleDateString(
														'es-MX',
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Card>
					</>
				)}
			</main>
		</div>
	)
}
