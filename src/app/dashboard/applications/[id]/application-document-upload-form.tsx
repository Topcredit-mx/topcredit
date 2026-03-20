'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { uploadApplicationDocumentAction } from '~/app/dashboard/applications/actions'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { DASHBOARD_DOCUMENT_TYPE_KEYS } from '~/lib/i18n-keys'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { DocumentType } from '~/server/db/schema'

const FILE_INPUT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'

interface ApplicationDocumentUploadFormProps {
	applicationId: number
	allowedDocumentTypes: readonly DocumentType[]
	fixedDocumentType?: DocumentType
	triggerTitle: string
	triggerDescription: string
	triggerButtonLabel?: string
	compact?: boolean
}

const initialFormState = {
	errors: undefined as Record<string, string> | undefined,
	message: undefined as string | undefined,
	success: undefined as boolean | undefined,
}

export function ApplicationDocumentUploadForm({
	applicationId,
	allowedDocumentTypes,
	fixedDocumentType,
	triggerTitle,
	triggerDescription,
	triggerButtonLabel,
	compact = false,
}: ApplicationDocumentUploadFormProps) {
	const t = useTranslations('dashboard.applications')
	const tCommon = useTranslations('common')
	const resolveError = useResolveValidationError()
	const showInlineForm = compact && fixedDocumentType != null

	const [state, action, pending] = useActionState(
		uploadApplicationDocumentAction,
		initialFormState,
	)

	const [documentType, setDocumentType] = useState<string>(
		fixedDocumentType ?? '',
	)
	const [isOpen, setIsOpen] = useState(showInlineForm)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const documentTypeId = useId()
	const fileId = useId()

	useEffect(() => {
		if (state.message || state.errors) {
			setIsOpen(true)
		}
		if (state.success) {
			setDocumentType(fixedDocumentType ?? '')
			setIsOpen(showInlineForm)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}
		}
	}, [
		fixedDocumentType,
		showInlineForm,
		state.errors,
		state.message,
		state.success,
	])

	return (
		<div
			className={
				compact
					? ''
					: 'min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-muted/20 shadow-sm'
			}
		>
			{!isOpen ? (
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className={
						compact
							? 'flex w-full flex-col items-start gap-3 rounded-xl border border-dashed bg-background/70 px-4 py-4 text-left transition-colors hover:bg-background'
							: 'flex min-h-56 w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-muted-foreground/20 border-dashed bg-muted/30 px-6 py-8 text-center transition-colors hover:border-muted-foreground/40 hover:bg-muted/50'
					}
				>
					<div className="flex size-14 items-center justify-center rounded-full bg-background shadow-sm">
						<Plus className="size-7 text-muted-foreground" aria-hidden />
					</div>
					<div className="space-y-2">
						<h3 className="font-semibold text-base">{triggerTitle}</h3>
						<p className="max-w-xs text-muted-foreground text-sm">
							{triggerDescription}
						</p>
					</div>
				</button>
			) : (
				<form
					action={action}
					className={compact ? 'space-y-3' : 'space-y-4 p-5'}
					noValidate
				>
					<input type="hidden" name="applicationId" value={applicationId} />
					<input type="hidden" name="documentType" value={documentType} />

					{state.message && !state.errors && (
						<FieldError
							message={resolveError(state.message)}
							className="rounded-xl bg-destructive/15 p-3"
						/>
					)}

					{fixedDocumentType ? null : (
						<Field data-invalid={!!state.errors?.documentType}>
							<FieldLabel htmlFor={documentTypeId}>
								{t('label-document-type')}{' '}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Select
								value={documentType || undefined}
								onValueChange={(value) => setDocumentType(value)}
							>
								<SelectTrigger
									id={documentTypeId}
									aria-required="true"
									aria-invalid={!!state.errors?.documentType}
									className="w-full bg-background"
								>
									<SelectValue placeholder={t('placeholder-document-type')} />
								</SelectTrigger>
								<SelectContent>
									{allowedDocumentTypes.map((type) => (
										<SelectItem key={type} value={type}>
											{t(DASHBOARD_DOCUMENT_TYPE_KEYS[type])}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{state.errors?.documentType && (
								<FieldError message={resolveError(state.errors.documentType)} />
							)}
						</Field>
					)}

					{compact ? (
						<div className="space-y-2">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
								<Field data-invalid={!!state.errors?.file} className="flex-1">
									<div className="rounded-xl border border-dashed bg-background/70 p-3">
										<input
											ref={fileInputRef}
											id={fileId}
											type="file"
											name="file"
											accept={FILE_INPUT_ACCEPT}
											className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
											aria-invalid={!!state.errors?.file}
										/>
									</div>
								</Field>
								<Button
									type="submit"
									size="sm"
									disabled={pending || !documentType}
								>
									{pending
										? tCommon('loading')
										: (triggerButtonLabel ?? t('submit-upload'))}
								</Button>
							</div>
							{state.errors?.file && (
								<FieldError message={resolveError(state.errors.file)} />
							)}
						</div>
					) : (
						<>
							<Field data-invalid={!!state.errors?.file}>
								<FieldLabel htmlFor={fileId}>
									{t('label-file')} <span className="text-destructive">*</span>
								</FieldLabel>
								<div className="rounded-2xl border border-dashed bg-background p-3">
									<input
										ref={fileInputRef}
										id={fileId}
										type="file"
										name="file"
										accept={FILE_INPUT_ACCEPT}
										className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
										aria-invalid={!!state.errors?.file}
									/>
								</div>
								{state.errors?.file && (
									<FieldError message={resolveError(state.errors.file)} />
								)}
							</Field>

							<div className="flex items-center justify-between gap-3">
								{showInlineForm ? null : (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setIsOpen(false)}
										disabled={pending}
									>
										{tCommon('cancel')}
									</Button>
								)}
								<Button
									type="submit"
									size="sm"
									disabled={pending || !documentType}
								>
									{pending
										? tCommon('loading')
										: (triggerButtonLabel ?? t('submit-upload'))}
								</Button>
							</div>
						</>
					)}
				</form>
			)}
		</div>
	)
}
