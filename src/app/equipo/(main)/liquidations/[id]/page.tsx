import { ChevronLeft, Receipt } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Badge } from '~/components/ui/badge'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getEquipoLiquidationRequestDetail } from '~/server/queries'
import { LiquidationDetailReview } from './liquidation-detail-review'

export default async function EquipoLiquidationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	getRequiredAgentUser()

	const { id } = await params
	const requestId = Number(id)
	if (!Number.isInteger(requestId) || requestId < 1) {
		notFound()
	}

	const [detail, t] = await Promise.all([
		getEquipoLiquidationRequestDetail(requestId),
		getTranslations('equipo'),
	])

	if (!detail) {
		notFound()
	}

	const statusLabel =
		detail.status === 'pending'
			? t('liquidations-detail-status-pending')
			: detail.status === 'accepted'
				? t('liquidations-detail-status-accepted')
				: t('liquidations-detail-status-denied')

	const statusVariant =
		detail.status === 'accepted'
			? 'default'
			: detail.status === 'denied'
				? 'destructive'
				: 'secondary'

	return (
		<section
			className="mx-auto grid max-w-4xl gap-3 px-1 py-1 sm:px-1.5 sm:py-1.5"
			aria-labelledby="equipo-liquidation-detail-title"
		>
			<div>
				<Link
					href="/equipo/liquidations"
					className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
				>
					<ChevronLeft className="size-3.5" aria-hidden />
					{t('liquidations-detail-back')}
				</Link>
			</div>

			<h1
				id="equipo-liquidation-detail-title"
				className="font-semibold text-2xl text-foreground tracking-tight"
			>
				{t('liquidations-detail-heading')}
			</h1>

			<div className="-mb-1 flex items-center gap-2">
				<span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
					<Receipt className="size-3.5" aria-hidden />
					{t('liquidations-detail-status-label')}
				</span>
				<div role="status" className="inline-flex shrink-0">
					<Badge variant={statusVariant}>{statusLabel}</Badge>
				</div>
			</div>

			<LiquidationDetailReview
				requestId={detail.id}
				creditId={detail.creditId}
				status={detail.status}
				denialReason={detail.denialReason}
				outstandingPrincipal={detail.outstandingPrincipal}
				outstandingFinancing={detail.outstandingFinancing}
				outstandingScheduledTotal={detail.outstandingScheduledTotal}
				pendingInstallmentCount={detail.pendingInstallmentCount}
				confirmedInstallmentCount={detail.confirmedInstallmentCount}
				transferAmount={detail.transferAmount}
				applicantName={detail.applicantName}
				companyName={detail.companyName}
				liquidatedPrincipal={detail.liquidatedPrincipal}
				liquidatedFinancing={detail.liquidatedFinancing}
				liquidatedScheduledTotal={detail.liquidatedScheduledTotal}
			/>
		</section>
	)
}
