'use client'

import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { uploadCompanyTemplateAction } from '~/app/equipo/(main)/companies/company-template-actions'
import { ApplicantDocumentFileDisplay } from '~/components/applicant-document-file-display'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { FieldError } from '~/components/ui/field'
import { SectionTitleRow } from '~/components/ui/section-card'
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

function getTemplateNotUploadedBadgeClass(): string {
	return 'border-transparent bg-slate-100 text-slate-800'
}

function getTemplateUploadedBadgeClass(): string {
	return 'border-transparent bg-amber-500 text-black'
}

function TemplateRow({
	company,
	templateKind,
}: {
	company: CompanyTemplatePick
	templateKind: CompanyTemplateKind
}) {
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const titleId = useId()
	const formRef = useRef<HTMLFormElement>(null)
	const fileRef = useRef<HTMLInputElement>(null)
	const [pendingFileName, setPendingFileName] = useState<string | null>(null)
	const [state, action, pending] = useActionState(
		uploadCompanyTemplateAction,
		initialState,
	)

	const titleKey =
		templateKind === 'authorization'
			? ('company-template-authorization-label' as const)
			: ('company-template-contract-label' as const)

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

	const displayFileName =
		hasFile && fileName != null && fileName !== '' ? fileName : pendingFileName

	useEffect(() => {
		if (state.errors?.file) {
			setPendingFileName(null)
			if (fileRef.current) fileRef.current.value = ''
		}
	}, [state.errors?.file])

	useEffect(() => {
		if (hasFile) {
			setPendingFileName(null)
		}
	}, [hasFile])

	useEffect(() => {
		if (state.success) {
			router.refresh()
			if (fileRef.current) fileRef.current.value = ''
		}
	}, [state.success, router])

	function onFileSelected() {
		const input = fileRef.current
		const file = input?.files?.[0]
		setPendingFileName(file?.name ?? null)
		if (input?.files && input.files.length > 0) {
			formRef.current?.requestSubmit()
		}
	}

	return (
		<section
			aria-labelledby={titleId}
			className={cn(
				hasFile
					? cn(
							shell.applicantDocumentStatusTileBase,
							'border-slate-200 bg-white',
						)
					: shell.applicantDocumentUploadTile,
			)}
		>
			<div className={shell.applicantDocumentTileIconWell} aria-hidden>
				<FileText className="size-6" />
			</div>
			<div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
				<p
					id={titleId}
					className="max-w-full text-center font-semibold text-slate-900 text-sm leading-snug"
				>
					{t(titleKey)}
				</p>
				<Badge
					className={cn(
						'shrink-0',
						hasFile
							? getTemplateUploadedBadgeClass()
							: getTemplateNotUploadedBadgeClass(),
					)}
				>
					{hasFile
						? t('company-template-uploaded')
						: t('company-template-not-uploaded')}
				</Badge>
			</div>
			{displayFileName ? (
				<ApplicantDocumentFileDisplay fileName={displayFileName} />
			) : null}
			<form
				ref={formRef}
				action={action}
				className="flex w-full min-w-0 flex-col gap-0"
				noValidate
			>
				<input type="hidden" name="companyId" value={company.id} />
				<input type="hidden" name="kind" value={templateKind} />
				<input
					ref={fileRef}
					type="file"
					name="file"
					accept={APPLICATION_DOCUMENT_ACCEPT}
					className="sr-only"
					tabIndex={-1}
					onChange={onFileSelected}
					disabled={pending}
					aria-labelledby={titleId}
				/>
				<Button
					type="button"
					variant="secondary"
					className={cn(shell.applicantDocumentTileActionButton, 'mt-2')}
					disabled={pending}
					aria-label={
						pending ? tCommon('loading') : t('company-template-browse')
					}
					onClick={() => fileRef.current?.click()}
				>
					{pending ? tCommon('loading') : t('company-template-browse')}
				</Button>
				{state.message ? (
					<AuthInlineError
						message={resolveError(state.message)}
						align="start"
						className="mt-1.5 px-0"
						reserveHeight={false}
					/>
				) : null}
				{state.errors?.file ? (
					<FieldError
						message={resolveError(state.errors.file)}
						className="mt-1.5"
					/>
				) : null}
			</form>
		</section>
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
			className="mt-10 space-y-5 border-border border-t pt-8"
			aria-labelledby="company-templates-heading"
		>
			<SectionTitleRow
				headingId="company-templates-heading"
				icon={FileText}
				title={t('company-templates-section-title')}
			/>
			<div className="grid items-start gap-5 sm:*:min-w-0 md:grid-cols-2">
				<TemplateRow company={company} templateKind="authorization" />
				<TemplateRow company={company} templateKind="contract" />
			</div>
		</section>
	)
}
