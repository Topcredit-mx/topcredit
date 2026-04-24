'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { formatCurrencyMxn } from '~/lib/utils'
import type { OverduePaymentLine } from '~/server/queries'

export type OverduePaymentPickGroup = {
	creditId: number
	employeeName: string
	payments: OverduePaymentLine[]
}

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	groups: OverduePaymentPickGroup[]
	variant: 'installments' | 'deductions'
	isPending: boolean
	onConfirm: (paymentIds: number[]) => void
}

function allIds(groups: OverduePaymentPickGroup[]): number[] {
	return groups.flatMap((g) => g.payments.map((p) => p.id))
}

export function PickOverduePaymentsDialog({
	open,
	onOpenChange,
	groups,
	variant,
	isPending,
	onConfirm,
}: Props) {
	const t = useTranslations('equipo')
	const tCommon = useTranslations('common')
	const [selected, setSelected] = useState<Set<number>>(new Set())

	useEffect(() => {
		if (open) {
			setSelected(new Set(allIds(groups)))
		}
	}, [open, groups])

	const count = selected.size
	const titleKey =
		variant === 'installments'
			? 'overdue-pick-payments-title-installments'
			: 'overdue-pick-payments-title-deductions'

	function toggleId(id: number) {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}

	function handleConfirm() {
		if (count === 0) return
		onConfirm([...selected])
	}

	const confirmLabel =
		variant === 'installments'
			? count === 1
				? t('installments-bulk-confirm-one')
				: t('installments-bulk-confirm-many', { count })
			: count === 1
				? t('deductions-bulk-confirm-one')
				: t('deductions-bulk-confirm-many', { count })

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t(titleKey)}</DialogTitle>
					<DialogDescription>
						{t('overdue-pick-payments-description')}
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-[min(24rem,50vh)] space-y-4 overflow-y-auto pr-1">
					{groups.map((g) => (
						<div className="space-y-2" key={g.creditId}>
							<p className="font-medium text-foreground text-sm">
								{t('overdue-pick-payments-credit', {
									creditId: g.creditId,
									name: g.employeeName,
								})}
							</p>
							<ul className="space-y-2">
								{g.payments.map((p) => {
									const checked = selected.has(p.id)
									return (
										<li
											className="flex items-start gap-3 rounded-md border border-border/80 bg-muted/30 px-3 py-2"
											key={p.id}
										>
											<Checkbox
												checked={checked}
												onCheckedChange={() => {
													toggleId(p.id)
												}}
												aria-label={t('overdue-pick-payments-line-aria', {
													id: p.id,
												})}
											/>
											<div className="min-w-0 flex-1 text-sm">
												<div className="text-muted-foreground text-xs">
													{t('overdue-pick-payments-due')}{' '}
													<FormattedDate value={p.dueDate} format="date" />
												</div>
												<div className="mt-0.5 font-medium tabular-nums">
													{formatCurrencyMxn(p.amount)}
												</div>
											</div>
										</li>
									)
								})}
							</ul>
						</div>
					))}
				</div>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						{tCommon('cancel')}
					</Button>
					<Button
						type="button"
						disabled={count === 0 || isPending}
						onClick={handleConfirm}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
