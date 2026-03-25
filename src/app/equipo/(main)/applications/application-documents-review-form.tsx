'use client'

import { CheckCircle2, Eye, FileText, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { startTransition, useActionState, useEffect, useState } from 'react'
import {
	type ApplyDocumentDecisionsState,
	applyDocumentDecisionsAction,
} from '~/app/equipo/(main)/applications/actions'
import { Button } from '~/components/ui/button'
import { FieldError } from '~/components/ui/field'
import { Textarea } from '~/components/ui/textarea'
import { EQUIPO_DOCUMENT_TYPE_KEYS, isDocumentType } from '~/lib/i18n-keys'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import type { DocumentStatus } from '~/server/db/schema'

export type ReviewFormDocument = {
	id: number
	documentType: string
	status: DocumentStatus
	fileName: string
	url: string
	hasBlobContent: boolean
	rejectionReason: string | null
}

export function ApplicationDocumentsReviewForm({
	applicationId,
	documents,
}: {
	applicationId: number
	documents: readonly ReviewFormDocument[]
}) {
	const t = useTranslations('equipo')
	const router = useRouter()
	const resolveError = useResolveValidationError()
	const [state, submit, pending] = useActionState<
		ApplyDocumentDecisionsState,
		FormData
	>(applyDocumentDecisionsAction, null)

	const [decisionById, setDecisionById] = useState<
		Record<number, 'unchanged' | 'approve' | 'reject'>
	>(() => {
		const o: Record<number, 'unchanged' | 'approve' | 'reject'> = {}
		for (const d of documents) {
			o[d.id] = 'unchanged'
		}
		return o
	})
	const [reasonById, setReasonById] = useState<Record<number, string>>(() => {
		const o: Record<number, string> = {}
		for (const d of documents) {
			o[d.id] = d.rejectionReason ?? ''
		}
		return o
	})
	const [localError, setLocalError] = useState<string | null>(null)

	useEffect(() => {
		if (state != null && !('error' in state)) {
			router.refresh()
		}
	}, [state, router])

	const displayError = getResolvedError(state, resolveError)
	const serverError = displayError ?? undefined

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setLocalError(null)
		const decisions: {
			documentId: number
			status: 'approved' | 'rejected'
			rejectionReason: string | null
		}[] = []
		for (const doc of documents) {
			const choice = decisionById[doc.id] ?? 'unchanged'
			if (choice === 'unchanged') continue
			if (choice === 'approve') {
				decisions.push({
					documentId: doc.id,
					status: 'approved',
					rejectionReason: null,
				})
			} else {
				const reason = (reasonById[doc.id] ?? '').trim()
				if (reason.length === 0) {
					setLocalError(t('applications-document-rejection-reason-required'))
					return
				}
				decisions.push({
					documentId: doc.id,
					status: 'rejected',
					rejectionReason: reason,
				})
			}
		}
		if (decisions.length === 0) {
			setLocalError(t('applications-document-decisions-required'))
			return
		}
		const fd = new FormData()
		fd.set('payload', JSON.stringify({ applicationId, decisions }))
		startTransition(() => {
			submit(fd)
		})
	}

	const combinedError = localError ?? serverError

	return (
		<form
			data-documents-review-form
			onSubmit={handleSubmit}
			className="space-y-4"
		>
			{combinedError ? (
				<FieldError message={combinedError} className="text-sm" role="alert" />
			) : null}
			<ul className="space-y-3" data-equipo-application-documents-list>
				{documents.map((doc) => (
					<DocumentReviewRow
						key={doc.id}
						doc={doc}
						decision={decisionById[doc.id] ?? 'unchanged'}
						reason={reasonById[doc.id] ?? ''}
						onDecisionChange={(id, next) => {
							setDecisionById((prev) => ({ ...prev, [id]: next }))
						}}
						onReasonChange={(id, value) => {
							setReasonById((prev) => ({ ...prev, [id]: value }))
						}}
					/>
				))}
			</ul>
			<div className="flex justify-end border-border/60 border-t pt-4">
				<Button type="submit" disabled={pending} data-documents-review-submit>
					{pending
						? t('applications-documents-review-submitting')
						: t('applications-documents-review-submit')}
				</Button>
			</div>
		</form>
	)
}

function DocumentReviewRow({
	doc,
	decision,
	reason,
	onDecisionChange,
	onReasonChange,
}: {
	doc: ReviewFormDocument
	decision: 'unchanged' | 'approve' | 'reject'
	reason: string
	onDecisionChange: (
		id: number,
		next: 'unchanged' | 'approve' | 'reject',
	) => void
	onReasonChange: (id: number, value: string) => void
}) {
	const t = useTranslations('equipo')
	const decisionLabel = t('applications-documents-review-decision-label')
	const typeLabel = isDocumentType(doc.documentType)
		? t(EQUIPO_DOCUMENT_TYPE_KEYS[doc.documentType])
		: doc.documentType
	const documentLinkLabel = t('applications-document-link')

	const approveLooksActive =
		decision === 'approve' ||
		(decision === 'unchanged' && doc.status === 'approved')
	const rejectLooksActive =
		decision === 'reject' ||
		(decision === 'unchanged' && doc.status === 'rejected')

	return (
		<li
			className="flex flex-col gap-2 border-border/60 border-b py-3 last:border-b-0"
			data-document-review-row={doc.id}
			data-document-file-name={doc.fileName}
			data-document-type={doc.documentType}
			data-status={doc.status}
		>
			<div className="flex min-h-8 w-full flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-3">
				<div className="flex min-h-8 min-w-0 flex-1 items-center gap-3">
					<FileText
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					<span className="shrink-0 text-muted-foreground">{typeLabel}:</span>
					<span className="flex min-w-0 flex-1 items-center gap-1.5">
						<span className="min-w-0 truncate text-muted-foreground">
							{doc.fileName}
						</span>
						{doc.hasBlobContent ? (
							<Button
								variant="ghost"
								size="icon"
								className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
								asChild
							>
								<a
									href={doc.url}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={documentLinkLabel}
								>
									<Eye className="size-4" />
								</a>
							</Button>
						) : null}
					</span>
				</div>
				<fieldset className="flex shrink-0 items-center gap-1 self-end border-0 p-0 sm:self-auto">
					<legend className="sr-only">{`${decisionLabel} (${typeLabel})`}</legend>
					<Button
						type="button"
						variant={approveLooksActive ? 'default' : 'outline'}
						size="icon"
						className="size-9 shrink-0"
						aria-pressed={approveLooksActive}
						data-document-decision-button="approve"
						aria-label={t('applications-document-action-approve')}
						onClick={() => {
							if (decision === 'approve') {
								onDecisionChange(doc.id, 'unchanged')
							} else {
								onDecisionChange(doc.id, 'approve')
							}
						}}
					>
						<CheckCircle2 className="size-4" aria-hidden />
					</Button>
					<Button
						type="button"
						variant={rejectLooksActive ? 'destructive' : 'outline'}
						size="icon"
						className="size-9 shrink-0"
						aria-pressed={rejectLooksActive}
						data-document-decision-button="reject"
						aria-label={t('applications-document-action-reject')}
						onClick={() => {
							if (decision === 'reject') {
								onDecisionChange(doc.id, 'unchanged')
							} else {
								onDecisionChange(doc.id, 'reject')
							}
						}}
					>
						<XCircle className="size-4" aria-hidden />
					</Button>
				</fieldset>
			</div>
			{decision === 'reject' ? (
				<div className="pl-0 sm:pl-7">
					<label
						className="mb-1 block text-muted-foreground text-xs"
						htmlFor={`doc-reason-${doc.id}`}
					>
						{t('applications-document-rejection-reason-label')}{' '}
						<span className="text-destructive">*</span>
					</label>
					<Textarea
						id={`doc-reason-${doc.id}`}
						name={`rejectionReason-${doc.id}`}
						value={reason}
						onChange={(e) => onReasonChange(doc.id, e.target.value)}
						placeholder={t(
							'applications-document-rejection-reason-placeholder',
						)}
						rows={3}
						className="resize-none"
						maxLength={1000}
						aria-required
					/>
				</div>
			) : null}
			{doc.status === 'rejected' &&
			doc.rejectionReason &&
			decision === 'unchanged' ? (
				<p className="pl-0 text-muted-foreground text-xs sm:pl-7">
					{t('applications-document-rejection-reason-label')}:{' '}
					{doc.rejectionReason}
				</p>
			) : null}
		</li>
	)
}
