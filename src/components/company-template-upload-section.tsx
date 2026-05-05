'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef } from 'react'
import { uploadCompanyTemplateAction } from '~/app/equipo/(main)/companies/company-template-actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Button } from '~/components/ui/button'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { APPLICATION_DOCUMENT_ACCEPT } from '~/lib/application-document-intake'
import type { CompanyTemplateKind } from '~/lib/company-templates'
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
	const labelId = useId()
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
			<FieldLabel id={labelId} htmlFor={fileId}>
				{t(titleKey)}
			</FieldLabel>
			{hasFile && fileName ? (
				<FieldDescription>
					{t('company-template-current-file', { fileName })}
				</FieldDescription>
			) : (
				<FieldDescription>{t('company-template-missing')}</FieldDescription>
			)}
			<form action={action} className="mt-2 flex flex-wrap items-end gap-3">
				<input type="hidden" name="companyId" value={company.id} />
				<input type="hidden" name="kind" value={templateKind} />
				<input
					ref={fileRef}
					id={fileId}
					type="file"
					name="file"
					accept={APPLICATION_DOCUMENT_ACCEPT}
					className="max-w-full text-sm"
					disabled={pending}
					aria-labelledby={labelId}
				/>
				<Button type="submit" disabled={pending}>
					{pending
						? t('company-template-upload-pending')
						: t('company-template-upload-submit')}
				</Button>
			</form>
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
			<TemplateRow company={company} templateKind="authorization" />
			<TemplateRow company={company} templateKind="contract" />
		</section>
	)
}
