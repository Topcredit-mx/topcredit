'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { ValidateDeductionsCsvErrorRow } from '~/server/mutations'
import {
	confirmDeductionsFromCsvAction,
	validateDeductionsCsvAction,
} from './actions'

type UploadState = { stage: 'upload' }
type PreviewState = {
	stage: 'preview'
	matchedPaymentIds: number[]
	matchedCount: number
	errors: ValidateDeductionsCsvErrorRow[]
	warnings: ValidateDeductionsCsvErrorRow[]
}

type DialogState = UploadState | PreviewState

interface ImportDeductionsDialogProps {
	open: boolean
	onClose: () => void
}

export function ImportDeductionsDialog({
	open,
	onClose,
}: ImportDeductionsDialogProps) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [isPending, startTransition] = useTransition()
	const [state, setState] = useState<DialogState>({ stage: 'upload' })
	const fileInputRef = useRef<HTMLInputElement>(null)

	function handleClose() {
		setState({ stage: 'upload' })
		onClose()
	}

	function handleValidate() {
		const file = fileInputRef.current?.files?.[0]
		if (!file) return
		startTransition(async () => {
			const formData = new FormData()
			formData.set('file', file)
			const result = await validateDeductionsCsvAction(formData)
			if (!result.ok) {
				toast.error(resolveError(result.error))
				return
			}
			setState({
				stage: 'preview',
				matchedPaymentIds: result.matchedPaymentIds,
				matchedCount: result.matchedPaymentIds.length,
				errors: result.errors,
				warnings: result.warnings,
			})
		})
	}

	function handleConfirm(paymentIds: number[]) {
		startTransition(async () => {
			const res = await confirmDeductionsFromCsvAction(paymentIds)
			if (res?.error != null) {
				toast.error(resolveError(res.error))
				return
			}
			handleClose()
		})
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>{t('deductions-import-dialog-title')}</DialogTitle>
				</DialogHeader>

				{state.stage === 'upload' && (
					<UploadStage
						fileInputRef={fileInputRef}
						isPending={isPending}
						onValidate={handleValidate}
						onClose={handleClose}
						t={t}
					/>
				)}

				{state.stage === 'preview' && (
					<PreviewStage
						state={state}
						isPending={isPending}
						onConfirm={handleConfirm}
						onClose={handleClose}
						t={t}
					/>
				)}
			</DialogContent>
		</Dialog>
	)
}

type TFunction = ReturnType<typeof useTranslations<'equipo'>>

function UploadStage({
	fileInputRef,
	isPending,
	onValidate,
	onClose,
	t,
}: {
	fileInputRef: React.RefObject<HTMLInputElement | null>
	isPending: boolean
	onValidate: () => void
	onClose: () => void
	t: TFunction
}) {
	return (
		<>
			<div className="space-y-4 py-2">
				<div className="space-y-2">
					<label
						htmlFor="import-deduction-file"
						className="font-medium text-sm"
					>
						{t('deductions-import-file-label')}
					</label>
					<input
						id="import-deduction-file"
						ref={fileInputRef}
						type="file"
						accept=".csv,text/csv"
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
				</div>
			</div>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					disabled={isPending}
				>
					{t('deductions-import-cancel')}
				</Button>
				<Button type="button" onClick={onValidate} disabled={isPending}>
					{isPending
						? t('deductions-import-validating')
						: t('deductions-import-validate')}
				</Button>
			</DialogFooter>
		</>
	)
}

function PreviewStage({
	state,
	isPending,
	onConfirm,
	onClose,
	t,
}: {
	state: PreviewState
	isPending: boolean
	onConfirm: (ids: number[]) => void
	onClose: () => void
	t: TFunction
}) {
	const total = state.matchedCount + state.warnings.length + state.errors.length
	const matchedLabel =
		total === 1
			? t('deductions-import-ready-one-total')
			: t('deductions-import-ready-many-total', {
					matched: state.matchedCount,
					total,
				})

	const confirmLabel =
		state.matchedCount === 1
			? t('deductions-import-confirm-one')
			: t('deductions-import-confirm-many', { count: state.matchedCount })

	return (
		<>
			<div className="space-y-4 py-2">
				{state.matchedCount > 0 && (
					<p className="font-medium text-sm">{matchedLabel}</p>
				)}

				{state.warnings.length > 0 && (
					<div className="space-y-2">
						<p className="font-medium text-amber-600 text-sm">
							{t('deductions-import-warnings-title')}
						</p>
						<div className="max-h-56 overflow-auto rounded-md border">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50 text-left">
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-line')}
										</th>
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-payroll')}
										</th>
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-amount')}
										</th>
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-date')}
										</th>
									</tr>
								</thead>
								<tbody>
									{state.warnings.map((w) => (
										<tr key={w.line} className="border-b last:border-0">
											<td className="px-3 py-2">{w.line}</td>
											<td className="px-3 py-2">{w.payrollNumber ?? '—'}</td>
											<td className="px-3 py-2">{w.amount ?? '—'}</td>
											<td className="px-3 py-2">{w.dueDate ?? '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{state.errors.length > 0 && (
					<div className="space-y-2">
						<p className="font-medium text-destructive text-sm">
							{t('deductions-import-errors-title')}
						</p>
						<div className="max-h-56 overflow-auto rounded-md border">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50 text-left">
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-line')}
										</th>
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-payroll')}
										</th>
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-amount')}
										</th>
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-date')}
										</th>
										<th className="px-3 py-2 font-medium">
											{t('deductions-import-col-error')}
										</th>
									</tr>
								</thead>
								<tbody>
									{state.errors.map((err) => (
										<tr key={err.line} className="border-b last:border-0">
											<td className="px-3 py-2">{err.line}</td>
											<td className="px-3 py-2">{err.payrollNumber ?? '—'}</td>
											<td className="px-3 py-2">{err.amount ?? '—'}</td>
											<td className="px-3 py-2">{err.dueDate ?? '—'}</td>
											<td className="px-3 py-2 text-destructive">
												{err.message === 'no-match'
													? t('deductions-import-error-no-match')
													: err.message}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					disabled={isPending}
				>
					{t('deductions-import-cancel')}
				</Button>
				{state.matchedCount > 0 && (
					<Button
						type="button"
						disabled={isPending}
						onClick={() => onConfirm(state.matchedPaymentIds)}
					>
						{isPending ? t('deductions-import-confirming') : confirmLabel}
					</Button>
				)}
			</DialogFooter>
		</>
	)
}
