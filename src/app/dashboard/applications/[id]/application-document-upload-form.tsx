'use client'

import { Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { uploadApplicationDocumentAction } from '~/app/dashboard/applications/actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
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
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { DocumentType } from '~/server/db/schema'

const FILE_INPUT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'

const fileInputClassName =
	'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive'

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
					? 'min-w-0'
					: 'min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm'
			}
		>
			{!isOpen ? (
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className={cn(
						'w-full text-left transition-colors',
						compact
							? 'flex flex-col items-start gap-3 rounded-xl border border-slate-200 border-dashed bg-slate-50/50 px-4 py-4 hover:border-slate-300 hover:bg-slate-50'
							: 'flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-slate-200 border-dashed bg-slate-50/50 px-6 py-8 text-center hover:border-slate-300 hover:bg-slate-50',
					)}
				>
					<div
						className={cn(
							'flex shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm',
							compact ? 'size-11' : 'size-14',
						)}
						aria-hidden
					>
						<Upload
							className={cn('text-slate-500', compact ? 'size-5' : 'size-7')}
						/>
					</div>
					<div className="space-y-2">
						<h3
							className={cn(
								'font-medium text-slate-900',
								compact ? 'text-sm' : 'text-base',
							)}
						>
							{triggerTitle}
						</h3>
						<p
							className={cn(
								'text-slate-600 leading-snug',
								compact ? 'text-xs' : 'max-w-xs text-sm',
							)}
						>
							{triggerDescription}
						</p>
					</div>
				</button>
			) : (
				<form
					action={action}
					className={compact ? 'space-y-3' : 'space-y-4 px-5 py-5'}
					noValidate
				>
					<input type="hidden" name="applicationId" value={applicationId} />
					<input type="hidden" name="documentType" value={documentType} />

					<AuthInlineError
						message={
							state.message && !state.errors
								? resolveError(state.message)
								: null
						}
						align="start"
						className="px-0"
					/>

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
									className="w-full border-slate-200 bg-white"
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
							{state.errors?.documentType ? (
								<FieldError message={resolveError(state.errors.documentType)} />
							) : null}
						</Field>
					)}

					{compact ? (
						<div className="space-y-2">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
								<Field data-invalid={!!state.errors?.file} className="flex-1">
									<div className="rounded-xl border border-slate-200 border-dashed bg-white p-3 shadow-sm">
										<input
											ref={fileInputRef}
											id={fileId}
											type="file"
											name="file"
											accept={FILE_INPUT_ACCEPT}
											className={fileInputClassName}
											aria-invalid={!!state.errors?.file}
										/>
									</div>
								</Field>
								<Button
									type="submit"
									size="sm"
									className="shrink-0 rounded-lg font-semibold"
									disabled={pending || !documentType}
								>
									{pending
										? tCommon('loading')
										: (triggerButtonLabel ?? t('submit-upload'))}
								</Button>
							</div>
							{state.errors?.file ? (
								<FieldError message={resolveError(state.errors.file)} />
							) : null}
						</div>
					) : (
						<>
							<Field data-invalid={!!state.errors?.file}>
								<FieldLabel htmlFor={fileId}>
									{t('label-file')} <span className="text-destructive">*</span>
								</FieldLabel>
								<div className="rounded-xl border border-slate-200 border-dashed bg-white p-4 shadow-sm">
									<input
										ref={fileInputRef}
										id={fileId}
										type="file"
										name="file"
										accept={FILE_INPUT_ACCEPT}
										className={fileInputClassName}
										aria-invalid={!!state.errors?.file}
									/>
								</div>
								{state.errors?.file ? (
									<FieldError message={resolveError(state.errors.file)} />
								) : null}
							</Field>

							<div className="flex items-center justify-between gap-3 pt-1">
								{showInlineForm ? null : (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className={shell.controlGhostBrand}
										onClick={() => setIsOpen(false)}
										disabled={pending}
									>
										{tCommon('cancel')}
									</Button>
								)}
								<Button
									type="submit"
									size="sm"
									className="ml-auto rounded-lg font-semibold"
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
