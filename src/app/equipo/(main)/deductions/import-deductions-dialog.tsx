'use client'

import {
	Check,
	ClipboardList,
	FileSpreadsheet,
	Loader2,
	OctagonAlert,
	TriangleAlert,
	Upload,
	X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ImportCsvPreviewSummary } from '~/components/equipo/import-csv-preview-summary'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type {
	CsvImportParseStats,
	ValidateDeductionsCsvErrorRow,
} from '~/server/mutations'
import {
	confirmDeductionsFromCsvAction,
	validateDeductionsCsvAction,
} from './actions'

type UploadState = { stage: 'upload' }
type PreviewState = {
	stage: 'preview'
	fileName: string
	parseStats: CsvImportParseStats
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
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
		setState({ stage: 'upload' })
		onClose()
	}

	function handleFileSelected(file: File) {
		startTransition(async () => {
			const formData = new FormData()
			formData.set('file', file)
			const result = await validateDeductionsCsvAction(formData)
			if (!result.ok) {
				toast.error(resolveError(result.error))
				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
				return
			}
			setState({
				stage: 'preview',
				fileName: result.fileName,
				parseStats: result.parseStats,
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
			<DialogContent
				className="sm:max-w-2xl"
				aria-describedby={
					state.stage === 'preview' ? 'deductions-import-csv-desc' : undefined
				}
			>
				<DialogHeader className="space-y-3">
					<DialogTitle className="flex items-center gap-2 text-lg">
						<FileSpreadsheet
							className="size-5 shrink-0 text-muted-foreground"
							aria-hidden
						/>
						{t('deductions-import-dialog-title')}
					</DialogTitle>
					{state.stage === 'preview' && (
						<ImportCsvPreviewSummary
							id="deductions-import-csv-desc"
							variant="deductions"
							fileName={state.fileName}
							parseStats={state.parseStats}
						/>
					)}
				</DialogHeader>

				{state.stage === 'upload' && (
					<UploadStage
						fileInputRef={fileInputRef}
						isPending={isPending}
						onFileSelected={handleFileSelected}
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
	onFileSelected,
	t,
}: {
	fileInputRef: React.RefObject<HTMLInputElement | null>
	isPending: boolean
	onFileSelected: (file: File) => void
	t: TFunction
}) {
	return (
		<div className="space-y-4 py-2">
			<div className="space-y-2">
				<label
					htmlFor="import-deduction-file"
					className="flex items-center gap-2 font-medium text-sm"
				>
					<Upload
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					{t('deductions-import-file-label')}
				</label>
				<div
					className={cn(
						'flex min-h-10 items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5',
						isPending && 'pointer-events-none opacity-80',
					)}
				>
					<input
						id="import-deduction-file"
						ref={fileInputRef}
						type="file"
						accept=".csv,text/csv"
						disabled={isPending}
						className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-transparent file:font-medium file:text-foreground"
						onChange={(e) => {
							const file = e.target.files?.[0]
							if (!file || isPending) return
							onFileSelected(file)
						}}
					/>
					{isPending ? (
						<span
							className="flex shrink-0 items-center gap-1.5 pr-1 text-muted-foreground text-xs"
							aria-live="polite"
						>
							<Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
							{t('deductions-import-validating')}
						</span>
					) : null}
				</div>
			</div>
		</div>
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
		total === 1 && state.matchedCount === 1
			? t('deductions-import-ready-one-total')
			: t('deductions-import-ready-many-total', {
					matched: state.matchedCount,
					total,
				})

	return (
		<>
			<div className="space-y-4 py-1">
				{state.warnings.length > 0 && (
					<div className="space-y-2">
						<p className="flex items-center gap-2 font-medium text-amber-700 text-sm">
							<TriangleAlert className="size-4 shrink-0" aria-hidden />
							{t('deductions-import-warnings-title')}
						</p>
						<div className="max-h-56 overflow-auto rounded-md border border-amber-500/20">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50 text-left">
										<th
											scope="col"
											className="px-3 py-2 font-medium text-muted-foreground"
										>
											{t('deductions-import-col-payroll')}
										</th>
										<th
											scope="col"
											className="px-3 py-2 font-medium text-muted-foreground"
										>
											{t('deductions-import-col-amount')}
										</th>
										<th
											scope="col"
											className="px-3 py-2 font-medium text-muted-foreground"
										>
											{t('deductions-import-col-date')}
										</th>
									</tr>
								</thead>
								<tbody>
									{state.warnings.map((w) => (
										<tr key={w.line} className="border-b last:border-0">
											<td className="px-3 py-2 text-slate-800">
												{w.payrollNumber ?? '—'}
											</td>
											<td className="px-3 py-2 text-slate-800">
												{w.amount ?? '—'}
											</td>
											<td className="px-3 py-2 text-slate-800">
												{w.dueDate ?? '—'}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{state.errors.length > 0 && (
					<div className="space-y-2">
						<p className="flex items-center gap-2 font-medium text-destructive text-sm">
							<OctagonAlert className="size-4 shrink-0" aria-hidden />
							{t('deductions-import-errors-title')}
						</p>
						<div className="max-h-56 overflow-auto rounded-md border border-destructive/20">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50 text-left">
										<th
											scope="col"
											className="px-3 py-2 font-medium text-muted-foreground"
										>
											{t('deductions-import-col-payroll')}
										</th>
										<th
											scope="col"
											className="px-3 py-2 font-medium text-muted-foreground"
										>
											{t('deductions-import-col-amount')}
										</th>
										<th
											scope="col"
											className="px-3 py-2 font-medium text-muted-foreground"
										>
											{t('deductions-import-col-date')}
										</th>
										<th
											scope="col"
											className="px-3 py-2 font-medium text-muted-foreground"
										>
											{t('deductions-import-col-error')}
										</th>
									</tr>
								</thead>
								<tbody>
									{state.errors.map((err) => (
										<tr key={err.line} className="border-b last:border-0">
											<td className="px-3 py-2 text-slate-800">
												{err.payrollNumber ?? '—'}
											</td>
											<td className="px-3 py-2 text-slate-800">
												{err.amount ?? '—'}
											</td>
											<td className="px-3 py-2 text-slate-800">
												{err.dueDate ?? '—'}
											</td>
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

			<div className="mt-4 rounded-lg border bg-muted/30 p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
						{state.matchedCount > 0 ? (
							<Check className="size-4 shrink-0 text-emerald-700" aria-hidden />
						) : (
							<ClipboardList
								className="size-4 shrink-0 text-muted-foreground"
								aria-hidden
							/>
						)}
						<p
							className={
								state.matchedCount > 0
									? 'min-w-0 font-medium text-emerald-950'
									: 'min-w-0 font-medium text-muted-foreground'
							}
						>
							{matchedLabel}
						</p>
					</div>
					<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isPending}
						>
							<X className="mr-2 size-4" aria-hidden />
							{t('deductions-import-cancel')}
						</Button>
						{state.matchedCount > 0 ? (
							<Button
								type="button"
								disabled={isPending}
								aria-label={t('deductions-import-confirm-aria', {
									count: state.matchedCount,
								})}
								onClick={() => onConfirm(state.matchedPaymentIds)}
							>
								{isPending ? (
									<>
										<Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
										{t('deductions-import-confirming')}
									</>
								) : (
									<>
										<Check className="mr-2 size-4" aria-hidden />
										{t('deductions-import-confirm-action')}
									</>
								)}
							</Button>
						) : null}
					</div>
				</div>
			</div>
		</>
	)
}
