'use client'

import { FileText, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef } from 'react'
import { uploadCompanyTemplateAction } from '~/app/equipo/(main)/companies/company-template-actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Field, FieldError } from '~/components/ui/field'
import { APPLICATION_DOCUMENT_ACCEPT } from '~/lib/application-document-intake'
import type { CompanyTemplateKind } from '~/lib/company-templates'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { Company } from '~/server/queries'

const initialState = {} as {
	errors?: { file?: string }
	message?: string
	success?: boolean
}

type CompanyTemplatePick = Pick<
	Company,
	| 'id'
	| 'authorizationTemplateStorageKey'
	| 'authorizationTemplateFileName'
	| 'contractTemplateStorageKey'
	| 'contractTemplateFileName'
>

function TemplateRow({
	company,
	templateKind,
}: {
	company: CompanyTemplatePick
	templateKind: CompanyTemplateKind
}) {
	const t = useTranslations('admin')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const titleId = useId()
	const fileId = useId()
	const fileRef = useRef<HTMLInputElement>(null)
	const [state, action, pending] = useActionState(
		uploadCompanyTemplateAction,
		initialState,
	)

	const titleKey =
		templateKind === 'authorization'
			? ('company-template-authorization-label' as const)
			: ('company-template-contract-label' as const)

	useEffect(() => {
		if (state.success) {
			router.refresh()
			if (fileRef.current) fileRef.current.value = ''
		}
	}, [state.success, router])

	const hasFile =
		templateKind === 'authorization'
			? company.authorizationTemplateStorageKey != null &&
				company.authorizationTemplateFileName != null
			: company.contractTemplateStorageKey != null &&
				company.contractTemplateFileName != null

	const fileName =
		templateKind === 'authorization'
			? company.authorizationTemplateFileName
			: company.contractTemplateFileName

	return (
		<Field>
			<form
				action={action}
				className={cn(shell.applicantDocumentUploadTile, 'items-stretch py-5')}
				aria-labelledby={titleId}
			>
				<input type="hidden" name="companyId" value={company.id} />
				<input type="hidden" name="kind" value={templateKind} />
				<div className={shell.applicantDocumentTileIconWell} aria-hidden>
					<FileText className="size-6" />
				</div>
				<div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
					<label
						id={titleId}
						htmlFor={fileId}
						className="cursor-pointer font-semibold text-slate-900 text-sm leading-snug"
					>
						{t(titleKey)}
					</label>
					<Badge
						variant={hasFile ? 'secondary' : 'outline'}
						className={cn(
							'shrink-0',
							hasFile
								? 'border-emerald-200 bg-emerald-50 text-emerald-800'
								: 'border-amber-200 bg-amber-50 text-amber-900',
						)}
					>
						{hasFile
							? t('company-template-uploaded')
							: t('company-template-missing')}
					</Badge>
				</div>
				{hasFile && fileName ? (
					<p className="mt-1 max-w-full truncate text-muted-foreground text-xs leading-relaxed">
						{t('company-template-current-file', { fileName })}
					</p>
				) : (
					<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
						{t('company-template-missing')}
					</p>
				)}
				<input
					ref={fileRef}
					id={fileId}
					type="file"
					name="file"
					accept={APPLICATION_DOCUMENT_ACCEPT}
					className="sr-only"
					disabled={pending}
					aria-labelledby={titleId}
				/>
				<Button
					type="button"
					variant="secondary"
					className={cn(shell.applicantDocumentTileActionButton, 'mt-4')}
					disabled={pending}
					onClick={() => fileRef.current?.click()}
				>
					<Upload className="size-4" aria-hidden />
					{t('company-template-browse')}
				</Button>
				<Button type="submit" disabled={pending} className="mt-2">
					{pending
						? t('company-template-upload-pending')
						: t('company-template-upload-submit')}
				</Button>
				<AuthInlineError
					message={state.message ? resolveError(state.message) : null}
					align="start"
					className="mt-2 px-0"
					minHeightClass="min-h-5"
				/>
				{state.errors?.file ? (
					<FieldError
						className="mt-2"
						message={resolveError(state.errors.file)}
					/>
				) : null}
			</form>
		</Field>
	)
}

export function CompanyTemplateUploadSection({
	company,
}: {
	company: CompanyTemplatePick
}) {
	const t = useTranslations('admin')

	return (
		<section
			className="mt-10 space-y-6 border-border border-t pt-8"
			aria-labelledby="company-templates-heading"
		>
			<h2
				id="company-templates-heading"
				className="font-semibold text-lg text-slate-900"
			>
				{t('company-templates-section-title')}
			</h2>
			<div className="grid gap-5 md:grid-cols-2">
				<TemplateRow company={company} templateKind="authorization" />
				<TemplateRow company={company} templateKind="contract" />
			</div>
		</section>
	)
}
