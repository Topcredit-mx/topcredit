import { Banknote } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import { getCreditsByApplicantId } from '~/server/queries'

function formatListDate(d: Date) {
	return d.toLocaleDateString('es-MX', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

export default async function CreditsPage() {
	const user = await getRequiredApplicantUser()
	const t = await getTranslations('cuenta.credits')
	const tCuentaNav = await getTranslations('cuenta')

	const creditsList = await getCreditsByApplicantId(user.id)
	const activeCredits = creditsList.filter((c) => c.status === 'dispersed')
	const completedCredits = creditsList.filter((c) => c.status === 'settled')

	const sections = [
		{ titleKey: 'section-active-title' as const, items: activeCredits },
		{ titleKey: 'section-completed-title' as const, items: completedCredits },
	].filter((s) => s.items.length > 0)

	return (
		<main className={cn(shell.applicantMainMax, 'pb-8')}>
			<header className="mb-8">
				<ShellBackLink href="/cuenta">← {tCuentaNav('nav-home')}</ShellBackLink>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('title')}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
					{t('description')}
				</p>
			</header>

			{creditsList.length > 0 ? (
				<div className="flex flex-col gap-10">
					{sections.map((section) => (
						<section key={section.titleKey} className="min-w-0">
							<h2 className="mb-4 font-semibold text-lg text-slate-900 tracking-tight">
								{t(section.titleKey)}
							</h2>
							<div
								className={cn(
									shell.elevatedCard,
									'-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0',
								)}
							>
								<table className="w-full min-w-[44rem] text-left text-sm">
									<thead>
										<tr className="border-slate-100 border-b text-muted-foreground text-xs uppercase tracking-wider">
											<th className="px-6 py-3 font-medium" scope="col">
												{t('th-amount')}
											</th>
											<th className="px-6 py-3 font-medium" scope="col">
												{t('th-status')}
											</th>
											<th className="px-6 py-3 font-medium" scope="col">
												{t('th-date')}
											</th>
											<th className="px-6 py-3 font-medium" scope="col">
												{t('th-next-payment')}
											</th>
											<th className="px-6 py-3 font-medium" scope="col">
												{t('th-progress')}
											</th>
											<th className="px-6 py-3 font-medium" scope="col">
												{t('th-outstanding')}
											</th>
										</tr>
									</thead>
									<tbody>
										{section.items.map((credit) => (
											<tr
												key={credit.id}
												className="border-slate-50 border-b last:border-0"
											>
												<td className="px-6 py-4 text-sm">
													<Link
														href={`/cuenta/credits/${credit.id}`}
														className="font-medium text-slate-800 underline-offset-2 hover:underline"
													>
														{formatCurrencyMxn(credit.transferAmount)}
													</Link>
												</td>
												<td className="px-6 py-4 text-muted-foreground text-sm">
													{credit.status === 'settled' ? (
														<Badge variant="secondary">
															{t('status-settled')}
														</Badge>
													) : (
														<Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600">
															{t('status-dispersed')}
														</Badge>
													)}
												</td>
												<td className="px-6 py-4 text-muted-foreground text-sm">
													{formatListDate(credit.disbursementDate)}
												</td>
												<td className="px-6 py-4 text-muted-foreground text-sm">
													{credit.nextDueDate != null &&
													credit.nextAmount != null ? (
														<>
															<span className="block text-slate-800">
																{formatListDate(credit.nextDueDate)}
															</span>
															<span className="mt-0.5 block text-muted-foreground text-xs">
																{formatCurrencyMxn(credit.nextAmount)}
															</span>
														</>
													) : (
														<span className="text-muted-foreground">
															{t('list-next-payment-none')}
														</span>
													)}
												</td>
												<td className="px-6 py-4 text-muted-foreground text-sm">
													{credit.paymentTotal > 0 ? (
														t('progress-payments', {
															confirmed: credit.paymentConfirmed,
															total: credit.paymentTotal,
														})
													) : (
														<span className="text-muted-foreground">
															{t('list-next-payment-none')}
														</span>
													)}
												</td>
												<td className="px-6 py-4 text-slate-800 text-sm tabular-nums">
													{credit.outstandingAmount != null ? (
														formatCurrencyMxn(credit.outstandingAmount)
													) : (
														<span className="text-muted-foreground">
															{t('list-next-payment-none')}
														</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>
					))}
				</div>
			) : (
				<div className={cn(shell.elevatedCard, 'overflow-hidden')}>
					<div className="flex flex-col items-center gap-4 px-6 py-14 text-center sm:px-10">
						<div
							className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm"
							aria-hidden
						>
							<Banknote className="size-7 text-slate-500" />
						</div>
						<p className="font-medium text-lg text-slate-900">
							{t('empty-title')}
						</p>
						<p className="max-w-md text-pretty text-slate-600 text-sm leading-relaxed">
							{t('empty-body')}
						</p>
						<Button
							asChild
							variant="outline"
							className="mt-2 h-11 border-slate-200 px-6 font-semibold text-slate-800 hover:bg-slate-50"
						>
							<Link href="/cuenta/applications">
								{t('empty-applications-cta')}
							</Link>
						</Button>
					</div>
				</div>
			)}

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
