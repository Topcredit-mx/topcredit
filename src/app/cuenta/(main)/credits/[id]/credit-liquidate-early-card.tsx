'use client'

import { HandCoins } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { liquidateCreditEarlyAction } from '~/app/cuenta/(main)/credits/actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { SectionCard } from '~/components/ui/section-card'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'

const initialDialogState: { error?: string; success?: boolean } = {}

export function CreditLiquidateEarlyCard({
	creditId,
	liquidationAmountFormatted,
	outstandingPrincipalFormatted,
}: {
	creditId: number
	liquidationAmountFormatted: string
	outstandingPrincipalFormatted: string
}) {
	const t = useTranslations('cuenta.credits')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [dialogState, setDialogState] = useState(initialDialogState)
	const [pending, startTransition] = useTransition()

	useEffect(() => {
		if (!open) {
			setDialogState(initialDialogState)
		}
	}, [open])

	const errorMessage =
		dialogState.error == null ? null : resolveError(dialogState.error)

	function submitLiquidation() {
		const fd = new FormData()
		fd.set('creditId', String(creditId))
		startTransition(() => {
			void liquidateCreditEarlyAction({}, fd).then((next) => {
				setDialogState(next)
				if (next.success) {
					setOpen(false)
					router.refresh()
				}
			})
		})
	}

	return (
		<SectionCard
			className="mt-6"
			icon={HandCoins}
			title={t('liquidate-section-title')}
		>
			<div className="space-y-4 text-slate-600 text-sm leading-relaxed">
				<p>{t('liquidate-intro')}</p>
				<dl className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-2">
					<div>
						<dt className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							{t('liquidate-label-without-capital')}
						</dt>
						<dd className="mt-1 font-semibold text-lg text-slate-900">
							{liquidationAmountFormatted}
						</dd>
					</div>
					<div>
						<dt className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							{t('liquidate-label-principal-remaining')}
						</dt>
						<dd className="mt-1 font-semibold text-lg text-slate-900">
							{outstandingPrincipalFormatted}
						</dd>
					</div>
				</dl>
				<p className="text-slate-500 text-xs">{t('liquidate-footnote')}</p>
				<AlertDialog
					open={open}
					onOpenChange={(next) => {
						setOpen(next)
					}}
				>
					<AlertDialogTrigger asChild>
						<Button type="button" variant="brand" className="h-11 px-6">
							{t('liquidate-open-dialog')}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('liquidate-dialog-title')}</AlertDialogTitle>
							<AlertDialogDescription asChild>
								<div className="space-y-3 text-left text-slate-600 text-sm">
									<p>{t('liquidate-dialog-body')}</p>
									<p>
										<span className="font-semibold text-slate-800">
											{t('liquidate-label-without-capital')}:
										</span>{' '}
										{liquidationAmountFormatted}
									</p>
									<p>
										<span className="font-semibold text-slate-800">
											{t('liquidate-label-principal-remaining')}:
										</span>{' '}
										{outstandingPrincipalFormatted}
									</p>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AuthInlineError
							message={errorMessage}
							className="px-0"
							reserveHeight={false}
						/>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={pending}>
								{t('liquidate-dialog-cancel')}
							</AlertDialogCancel>
							<Button
								type="button"
								variant="brand"
								disabled={pending}
								className="h-10"
								onClick={submitLiquidation}
							>
								{pending
									? t('liquidate-dialog-confirm-pending')
									: t('liquidate-dialog-confirm')}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</SectionCard>
	)
}
