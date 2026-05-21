'use client'

import { FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useId, useRef, useState } from 'react'
import { ApplicantDocumentFileDisplay } from '~/components/applicant-document-file-display'
import { Button } from '~/components/ui/button'
import { APPLICATION_DOCUMENT_ACCEPT } from '~/lib/application-document-intake'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import {
	type DisburseFormState,
	disburseApplicationFormAction,
} from './actions'

interface DisburseFormProps {
	applicationId: number
	creditAmount: string
}

export function DisburseForm({
	applicationId,
	creditAmount,
}: DisburseFormProps) {
	const t = useTranslations('equipo')
	const tCommon = useTranslations('common')
	const resolveError = useResolveValidationError()
	const receiptFileId = useId()
	const receiptFileRef = useRef<HTMLInputElement>(null)
	const [selectedReceiptName, setSelectedReceiptName] = useState<string | null>(
		null,
	)
	const [state, formAction, isPending] = useActionState<
		DisburseFormState,
		FormData
	>(disburseApplicationFormAction, {})

	const displayError = getResolvedError(state, resolveError)

	function onReceiptSelected() {
		const input = receiptFileRef.current
		const file = input?.files?.[0]
		setSelectedReceiptName(file?.name ?? null)
	}

	return (
		<form action={formAction} className="flex flex-col gap-3" noValidate>
			<input type="hidden" name="applicationId" value={applicationId} />
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="disburseAmount"
					className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
				>
					{t('disburse-amount')}
				</label>
				<input
					id="disburseAmount"
					type="text"
					value={creditAmount}
					readOnly
					className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm shadow-sm"
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="transferReference"
					className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
				>
					{t('disburse-transfer-reference')}
				</label>
				<input
					id="transferReference"
					name="transferReference"
					type="text"
					required
					disabled={isPending}
					className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
				/>
			</div>
			<div className={shell.applicantDocumentUploadTile}>
				<div className={shell.applicantDocumentTileIconWell} aria-hidden>
					<FileText className="size-6" />
				</div>
				<label
					htmlFor={receiptFileId}
					className="cursor-pointer font-semibold text-slate-900 text-sm leading-snug"
				>
					{t('disburse-receipt')} <span className="text-destructive">*</span>
				</label>
				{selectedReceiptName ? (
					<ApplicantDocumentFileDisplay fileName={selectedReceiptName} />
				) : null}
				<input
					ref={receiptFileRef}
					id={receiptFileId}
					name="receipt"
					type="file"
					required
					accept={APPLICATION_DOCUMENT_ACCEPT}
					className="sr-only"
					tabIndex={-1}
					disabled={isPending}
					onChange={onReceiptSelected}
				/>
				<Button
					type="button"
					variant="secondary"
					className={cn(shell.applicantDocumentTileActionButton, 'mt-2')}
					disabled={isPending}
					aria-label={
						isPending ? tCommon('loading') : t('disburse-browse-files')
					}
					onClick={() => receiptFileRef.current?.click()}
				>
					{isPending ? tCommon('loading') : t('disburse-browse-files')}
				</Button>
			</div>
			{displayError ? (
				<p className="text-destructive text-sm">{displayError}</p>
			) : null}
			<Button type="submit" disabled={isPending} size="sm">
				{isPending ? t('disburse-submitting') : t('disburse-submit')}
			</Button>
		</form>
	)
}
