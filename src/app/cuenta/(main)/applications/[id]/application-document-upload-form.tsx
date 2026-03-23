'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useRef } from 'react'
import { uploadApplicationDocumentAction } from '~/app/cuenta/(main)/applications/actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Button } from '~/components/ui/button'
import { FieldError } from '~/components/ui/field'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { DocumentType } from '~/server/db/schema'

const FILE_INPUT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'

interface ApplicationDocumentUploadFormProps {
	applicationId: number
	fixedDocumentType: DocumentType
	pickFileButtonLabel: string
	compact?: boolean
	embedInTileChrome?: boolean
}

const initialFormState = {
	errors: undefined as Record<string, string> | undefined,
	message: undefined as string | undefined,
	success: undefined as boolean | undefined,
}

export function ApplicationDocumentUploadForm({
	applicationId,
	fixedDocumentType,
	pickFileButtonLabel,
	compact = false,
	embedInTileChrome = false,
}: ApplicationDocumentUploadFormProps) {
	const tCommon = useTranslations('common')
	const resolveError = useResolveValidationError()

	const [state, action, pending] = useActionState(
		uploadApplicationDocumentAction,
		initialFormState,
	)

	const formRef = useRef<HTMLFormElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (state.errors?.file && fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [state.errors?.file])

	useEffect(() => {
		if (state.success && fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [state.success])

	function onFileSelected() {
		const input = fileInputRef.current
		if (input?.files && input.files.length > 0) {
			formRef.current?.requestSubmit()
		}
	}

	return (
		<div className={cn('min-w-0', compact && 'w-full')}>
			<form
				ref={formRef}
				action={action}
				className="flex w-full min-w-0 flex-col gap-0"
				noValidate
			>
				<input type="hidden" name="applicationId" value={applicationId} />
				<input type="hidden" name="documentType" value={fixedDocumentType} />
				<input
					ref={fileInputRef}
					type="file"
					name="file"
					accept={FILE_INPUT_ACCEPT}
					className="sr-only"
					tabIndex={-1}
					onChange={onFileSelected}
					disabled={pending}
					aria-hidden
				/>
				<Button
					type="button"
					variant="secondary"
					className={cn(
						shell.applicantDocumentTileActionButton,
						embedInTileChrome && 'mt-2',
					)}
					disabled={pending}
					aria-label={pickFileButtonLabel}
					onClick={() => fileInputRef.current?.click()}
				>
					{pending ? tCommon('loading') : pickFileButtonLabel}
				</Button>

				<div className="mt-1.5 flex min-h-7 w-full flex-col justify-start gap-1">
					<AuthInlineError
						message={
							state.message && !state.errors
								? resolveError(state.message)
								: null
						}
						align="start"
						className="px-0"
						reserveHeight={false}
					/>
					{state.errors?.file ? (
						<FieldError message={resolveError(state.errors.file)} />
					) : null}
				</div>
			</form>
		</div>
	)
}
