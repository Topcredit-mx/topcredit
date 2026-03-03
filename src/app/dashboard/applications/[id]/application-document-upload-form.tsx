'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useId, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { uploadApplicationDocument } from '~/server/mutations'

const DOCUMENT_TYPES = ['authorization', 'contract', 'payroll-receipt'] as const

interface ApplicationDocumentUploadFormProps {
	applicationId: number
}

export function ApplicationDocumentUploadForm({
	applicationId,
}: ApplicationDocumentUploadFormProps) {
	const t = useTranslations('dashboard.applications')
	const tCommon = useTranslations('common')

	const [state, action, pending] = useActionState(uploadApplicationDocument, {
		errors: undefined,
		message: undefined,
	})

	const [documentType, setDocumentType] = useState<string>('')

	const documentTypeId = useId()
	const fileId = useId()

	return (
		<form action={action} className="space-y-4" noValidate>
			<input type="hidden" name="applicationId" value={applicationId} />
			<input type="hidden" name="documentType" value={documentType} />

			{state.message && !state.errors && (
				<div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
					{state.message}
				</div>
			)}

			<Field data-invalid={!!state.errors?.documentType}>
				<FieldLabel htmlFor={documentTypeId}>
					{t('label-document-type')} <span className="text-destructive">*</span>
				</FieldLabel>
				<Select
					value={documentType || undefined}
					onValueChange={(value) => setDocumentType(value)}
				>
					<SelectTrigger
						id={documentTypeId}
						aria-required="true"
						aria-invalid={!!state.errors?.documentType}
						className="w-full"
					>
						<SelectValue placeholder={t('placeholder-document-type')} />
					</SelectTrigger>
					<SelectContent>
						{DOCUMENT_TYPES.map((type) => (
							<SelectItem key={type} value={type}>
								{t(`document-type-${type}`)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{state.errors?.documentType && (
					<FieldError>{state.errors.documentType}</FieldError>
				)}
			</Field>

			<Field data-invalid={!!state.errors?.file}>
				<FieldLabel htmlFor={fileId}>
					{t('label-file')} <span className="text-destructive">*</span>
				</FieldLabel>
				<input
					id={fileId}
					type="file"
					name="file"
					className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
					aria-invalid={!!state.errors?.file}
				/>
				{state.errors?.file && <FieldError>{state.errors.file}</FieldError>}
			</Field>

			<Button type="submit" disabled={pending || !documentType}>
				{pending ? tCommon('loading') : t('submit-upload')}
			</Button>
		</form>
	)
}
