import { Banknote } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent } from '~/components/ui/card'
import { resolveApplicationCreditAmounts } from '~/lib/application-credit-amounts'
import { formatCurrencyMxn } from '~/lib/utils'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	EQUIPO_DETAIL_STAT_CARD_CLASS,
	EQUIPO_DETAIL_STAT_CONTENT_CLASS,
} from '../detail-layout-classes'

type EquipoApplicationCreditAmountStatsProps = {
	creditAmount: string | null
	applicantRequestedCreditAmount: string | null
	status: ApplicationStatus
}

function AmountStatCard({
	label,
	amount,
	pendingLabel,
}: {
	label: string
	amount: string | null
	pendingLabel: string
}) {
	return (
		<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
			<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
				<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
					<Banknote className="size-3.5" aria-hidden />
					{label}
				</p>
				<p className="mt-1.5 font-semibold text-lg">
					{amount ? (
						<>
							{formatCurrencyMxn(amount)}{' '}
							<span className="font-normal text-muted-foreground text-sm">
								MXN
							</span>
						</>
					) : (
						pendingLabel
					)}
				</p>
			</CardContent>
		</Card>
	)
}

export async function EquipoApplicationCreditAmountStats({
	creditAmount,
	applicantRequestedCreditAmount,
	status,
}: EquipoApplicationCreditAmountStatsProps) {
	const t = await getTranslations('equipo')
	const pendingLabel = t('applications-detail-value-pending')
	const amounts = resolveApplicationCreditAmounts(
		creditAmount,
		applicantRequestedCreditAmount,
	)

	if (
		status === 'awaiting-authorization' &&
		amounts.hasReducedApplicantRequest
	) {
		return (
			<>
				<AmountStatCard
					label={t('applications-detail-pre-authorized-amount')}
					amount={amounts.preAuthorizedAmount}
					pendingLabel={pendingLabel}
				/>
				<AmountStatCard
					label={t('applications-detail-applicant-requested-amount')}
					amount={amounts.applicantRequestedAmount}
					pendingLabel={pendingLabel}
				/>
			</>
		)
	}

	return (
		<AmountStatCard
			label={t('applications-detail-amount')}
			amount={amounts.operativeAmount}
			pendingLabel={pendingLabel}
		/>
	)
}
