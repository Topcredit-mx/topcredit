'use client'

import { CheckCircle2, Eye, FileText, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
	startTransition,
	useActionState,
	useEffect,
	useMemo,
	useState,
} from 'react'
import {
	type ApplyDocumentDecisionsState,
	applyDocumentDecisionsAction,
} from '~/app/equipo/(main)/applications/actions'
import { Button } from '~/components/ui/button'
import { FieldError } from '~/components/ui/field'
import { Textarea } from '~/components/ui/textarea'
import {
	INITIAL_APPLICATION_DOCUMENT_TYPES,
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
} from '~/lib/application-document-intake'
import {
	isAuthorizationPackageFullyApproved,
	isInitialIntakeFullyApproved,
} from '~/lib/authorization-package-readiness'
import { EQUIPO_DOCUMENT_TYPE_KEYS, isDocumentType } from '~/lib/i18n-keys'
import { cn } from '~/lib/utils'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import type {
	ApplicationStatus,
	DocumentStatus,
	DocumentType,
} from '~/server/db/schema'

export type ReviewFormDocument = {
	id: number
	documentType: DocumentType
	status: DocumentStatus
	fileName: string
	url: string
	hasBlobContent: boolean
	rejectionReason: string | null
	createdAt: Date
	canSetStatus: boolean
}

function effectiveStatusForRow(
	doc: ReviewFormDocument,
	decision: 'unchanged' | 'approve' | 'reject',
): DocumentStatus {
	if (decision === 'unchanged') return doc.status
	if (decision === 'approve') return 'approved'
	return 'rejected'
}

function buildProjectedPackageRows(
	documents: readonly ReviewFormDocument[],
	decisionById: Record<number, 'unchanged' | 'approve' | 'reject'>,
): {
	documentType: DocumentType
	status: DocumentStatus
	createdAt: Date
	hasBlobContent: boolean
}[] {
	return documents.map((doc) => ({
		documentType: doc.documentType,
		status: effectiveStatusForRow(doc, decisionById[doc.id] ?? 'unchanged'),
		createdAt: doc.createdAt,
		hasBlobContent: doc.hasBlobContent,
	}))
}

const INITIAL_INTAKE_TYPE_SET = new Set<DocumentType>(
	INITIAL_APPLICATION_DOCUMENT_TYPES,
)
const AUTHORIZATION_PACKAGE_TYPE_SET = new Set<DocumentType>(
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
)

function partitionDocumentsForReviewForm(
	documents: readonly ReviewFormDocument[],
): {
	initialIntake: ReviewFormDocument[]
	authorizationPackage: ReviewFormDocument[]
	other: ReviewFormDocument[]
} {
	const initialIntake: ReviewFormDocument[] = []
	const authorizationPackage: ReviewFormDocument[] = []
	const other: ReviewFormDocument[] = []
	for (const doc of documents) {
		if (INITIAL_INTAKE_TYPE_SET.has(doc.documentType)) {
			initialIntake.push(doc)
		} else if (AUTHORIZATION_PACKAGE_TYPE_SET.has(doc.documentType)) {
			authorizationPackage.push(doc)
		} else {
			other.push(doc)
		}
	}
	return {
		initialIntake,
		authorizationPackage,
		other,
	}
}

function sortDocumentsByTranslatedTypeLabel(
	documents: readonly ReviewFormDocument[],
	getTypeLabel: (doc: ReviewFormDocument) => string,
	locale: string,
): ReviewFormDocument[] {
	return [...documents].sort((a, b) =>
		getTypeLabel(a).localeCompare(getTypeLabel(b), locale, {
			sensitivity: 'base',
		}),
	)
}

export function ApplicationDocumentsReviewForm({
	applicationId,
	documents,
	applicationStatus,
	canApplyFollowUpActions,
	canFollowUpApprove,
	canFollowUpAuthorize,
	authorizationPackageFullyApproved,
	initialIntakeFullyApproved,
}: {
	applicationId: number
	documents: readonly ReviewFormDocument[]
	applicationStatus: ApplicationStatus
	canApplyFollowUpActions: boolean
	canFollowUpApprove: boolean
	canFollowUpAuthorize: boolean
	authorizationPackageFullyApproved: boolean
	initialIntakeFullyApproved: boolean
}) {
	const t = useTranslations('equipo')
	const locale = useLocale()
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

	const { submitPlan } = useMemo(() => {
		let dirty = false
		for (const doc of documents) {
			if (!doc.canSetStatus) continue
			const dec = decisionById[doc.id] ?? 'unchanged'
			if (dec !== 'unchanged') {
				dirty = true
				break
			}
		}

		const projected = buildProjectedPackageRows(documents, decisionById)
		const hasRejectInBatch = projected.some((r) => r.status === 'rejected')

		const projectsAuthPackageComplete =
			applicationStatus === 'awaiting-authorization' &&
			isAuthorizationPackageFullyApproved(projected)
		const projectsInitialComplete =
			applicationStatus === 'pending' && isInitialIntakeFullyApproved(projected)

		const showAuthorizeOnly =
			!dirty &&
			canApplyFollowUpActions &&
			canFollowUpAuthorize &&
			authorizationPackageFullyApproved &&
			applicationStatus === 'awaiting-authorization'
		const showApproveOnly =
			!dirty &&
			canApplyFollowUpActions &&
			canFollowUpApprove &&
			initialIntakeFullyApproved &&
			applicationStatus === 'pending'

		let followUpStatus: 'approved' | 'authorized' | undefined
		if (dirty && !hasRejectInBatch) {
			if (projectsAuthPackageComplete && canFollowUpAuthorize) {
				followUpStatus = 'authorized'
			} else if (projectsInitialComplete && canFollowUpApprove) {
				followUpStatus = 'approved'
			}
		}
		if (showAuthorizeOnly) {
			followUpStatus = 'authorized'
		}
		if (showApproveOnly) {
			followUpStatus = 'approved'
		}

		type Plan =
			| { kind: 'request-changes' }
			| {
					kind: 'save-and-authorize' | 'save-and-approve' | 'save-only'
					followUpStatus?: 'approved' | 'authorized'
			  }
			| { kind: 'authorize-only' }
			| { kind: 'approve-only' }
			| { kind: 'idle' }

		let plan: Plan
		if (hasRejectInBatch && dirty) {
			plan = { kind: 'request-changes' }
		} else if (showAuthorizeOnly) {
			plan = { kind: 'authorize-only' }
		} else if (showApproveOnly) {
			plan = { kind: 'approve-only' }
		} else if (dirty) {
			plan = {
				kind:
					followUpStatus === 'authorized'
						? 'save-and-authorize'
						: followUpStatus === 'approved'
							? 'save-and-approve'
							: 'save-only',
				followUpStatus,
			}
		} else {
			plan = { kind: 'idle' }
		}

		const submitEnabled = dirty || showAuthorizeOnly || showApproveOnly

		return { submitPlan: { plan, submitEnabled, followUpStatus } }
	}, [
		documents,
		decisionById,
		applicationStatus,
		canApplyFollowUpActions,
		canFollowUpApprove,
		canFollowUpAuthorize,
		authorizationPackageFullyApproved,
		initialIntakeFullyApproved,
	])

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setLocalError(null)

		const { plan, followUpStatus, submitEnabled } = submitPlan
		if (!submitEnabled) {
			return
		}

		if (plan.kind === 'authorize-only') {
			const fd = new FormData()
			fd.set(
				'payload',
				JSON.stringify({
					applicationId,
					decisions: [],
					followUpStatus: 'authorized',
				}),
			)
			startTransition(() => {
				submit(fd)
			})
			return
		}

		if (plan.kind === 'approve-only') {
			const fd = new FormData()
			fd.set(
				'payload',
				JSON.stringify({
					applicationId,
					decisions: [],
					followUpStatus: 'approved',
				}),
			)
			startTransition(() => {
				submit(fd)
			})
			return
		}

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

		const payload: {
			applicationId: number
			decisions: typeof decisions
			followUpStatus?: 'approved' | 'authorized'
		} = { applicationId, decisions }
		if (
			plan.kind === 'save-and-authorize' ||
			plan.kind === 'save-and-approve'
		) {
			if (followUpStatus != null) {
				payload.followUpStatus = followUpStatus
			}
		}

		const fd = new FormData()
		fd.set('payload', JSON.stringify(payload))
		startTransition(() => {
			submit(fd)
		})
	}

	const combinedError = localError ?? serverError

	const { initialIntake, authorizationPackage, other } = useMemo(() => {
		const raw = partitionDocumentsForReviewForm(documents)
		const typeLabelForSort = (doc: ReviewFormDocument) =>
			isDocumentType(doc.documentType)
				? t(EQUIPO_DOCUMENT_TYPE_KEYS[doc.documentType])
				: doc.documentType
		return {
			initialIntake: sortDocumentsByTranslatedTypeLabel(
				raw.initialIntake,
				typeLabelForSort,
				locale,
			),
			authorizationPackage: sortDocumentsByTranslatedTypeLabel(
				raw.authorizationPackage,
				typeLabelForSort,
				locale,
			),
			other: sortDocumentsByTranslatedTypeLabel(
				raw.other,
				typeLabelForSort,
				locale,
			),
		}
	}, [documents, locale, t])

	const buttonLabel = (() => {
		const { plan } = submitPlan
		if (plan.kind === 'request-changes') {
			return t('applications-documents-review-request-changes')
		}
		if (plan.kind === 'authorize-only') {
			return t('applications-documents-review-authorize-only')
		}
		if (plan.kind === 'approve-only') {
			return t('applications-documents-review-approve-only')
		}
		if (plan.kind === 'save-and-authorize') {
			return t('applications-documents-review-save-and-authorize')
		}
		if (plan.kind === 'save-and-approve') {
			return t('applications-documents-review-save-and-approve')
		}
		return t('applications-documents-review-submit')
	})()

	const buttonVariant = (() => {
		const { plan } = submitPlan
		if (plan.kind === 'request-changes') {
			return 'destructive' as const
		}
		if (
			plan.kind === 'save-and-authorize' ||
			plan.kind === 'authorize-only' ||
			plan.kind === 'save-and-approve' ||
			plan.kind === 'approve-only'
		) {
			return 'default' as const
		}
		return 'secondary' as const
	})()

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{combinedError ? (
				<FieldError message={combinedError} className="text-sm" role="alert" />
			) : null}
			<div className="space-y-6">
				{initialIntake.length > 0 ? (
					<div className="space-y-2">
						<h3 className="font-medium text-foreground text-sm">
							{t('applications-documents-section-initial-intake')}
						</h3>
						<ul className="space-y-0 divide-y divide-border/60 border-border/60 border-b">
							{initialIntake.map((doc) => (
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
									notPermittedHint={t(
										'applications-document-review-not-permitted',
									)}
								/>
							))}
						</ul>
					</div>
				) : null}
				{authorizationPackage.length > 0 ? (
					<div
						className={cn(
							'space-y-2',
							initialIntake.length > 0 && 'border-border/60 border-t pt-4',
						)}
					>
						<h3 className="font-medium text-foreground text-sm">
							{t('applications-documents-section-authorization-package')}
						</h3>
						<ul className="space-y-0 divide-y divide-border/60 border-border/60 border-b">
							{authorizationPackage.map((doc) => (
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
									notPermittedHint={t(
										'applications-document-review-not-permitted',
									)}
								/>
							))}
						</ul>
					</div>
				) : null}
				{other.length > 0 ? (
					<div
						className={cn(
							'space-y-2',
							(initialIntake.length > 0 || authorizationPackage.length > 0) &&
								'border-border/60 border-t pt-4',
						)}
					>
						<h3 className="font-medium text-foreground text-sm">
							{t('applications-documents-section-other')}
						</h3>
						<ul className="space-y-0 divide-y divide-border/60 border-border/60 border-b">
							{other.map((doc) => (
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
									notPermittedHint={t(
										'applications-document-review-not-permitted',
									)}
								/>
							))}
						</ul>
					</div>
				) : null}
			</div>
			<div className="flex justify-end border-border/60 border-t pt-4">
				<Button
					type="submit"
					variant={buttonVariant}
					disabled={pending || !submitPlan.submitEnabled}
				>
					{pending
						? t('applications-documents-review-submitting')
						: buttonLabel}
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
	notPermittedHint,
}: {
	doc: ReviewFormDocument
	decision: 'unchanged' | 'approve' | 'reject'
	reason: string
	onDecisionChange: (
		id: number,
		next: 'unchanged' | 'approve' | 'reject',
	) => void
	onReasonChange: (id: number, value: string) => void
	notPermittedHint: string
}) {
	const t = useTranslations('equipo')
	const canSetStatus = doc.canSetStatus
	const decisionLabel = t('applications-documents-review-decision-label')
	const typeLabel = isDocumentType(doc.documentType)
		? t(EQUIPO_DOCUMENT_TYPE_KEYS[doc.documentType])
		: doc.documentType
	const documentLinkLabel = t('applications-document-link')

	const approveSemanticActive =
		decision === 'approve' ||
		(decision === 'unchanged' && doc.status === 'approved')
	const rejectSemanticActive =
		decision === 'reject' ||
		(decision === 'unchanged' && doc.status === 'rejected')

	const approveLabel = canSetStatus
		? t('applications-document-action-approve')
		: `${t('applications-document-action-approve')}. ${notPermittedHint}`
	const rejectLabel = canSetStatus
		? t('applications-document-action-reject')
		: `${t('applications-document-action-reject')}. ${notPermittedHint}`

	return (
		<li className="flex flex-col gap-2 py-3">
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
				<fieldset
					className={cn(
						'flex shrink-0 items-center gap-1 self-end border-0 p-0 sm:ml-auto sm:self-auto',
						!canSetStatus &&
							'cursor-not-allowed opacity-[0.52] saturate-[0.65]',
					)}
					inert={!canSetStatus ? true : undefined}
					title={canSetStatus ? undefined : notPermittedHint}
				>
					<legend className="sr-only">{`${decisionLabel} (${typeLabel})`}</legend>
					<Button
						type="button"
						variant={approveSemanticActive ? 'default' : 'outline'}
						size="icon"
						className="size-9 shrink-0"
						aria-pressed={approveSemanticActive}
						aria-disabled={!canSetStatus}
						aria-label={approveLabel}
						tabIndex={canSetStatus ? undefined : -1}
						onClick={() => {
							if (!canSetStatus) return
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
						variant={rejectSemanticActive ? 'destructive' : 'outline'}
						size="icon"
						className="size-9 shrink-0"
						aria-pressed={rejectSemanticActive}
						aria-disabled={!canSetStatus}
						aria-label={rejectLabel}
						tabIndex={canSetStatus ? undefined : -1}
						onClick={() => {
							if (!canSetStatus) return
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
			{decision === 'reject' && canSetStatus ? (
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
