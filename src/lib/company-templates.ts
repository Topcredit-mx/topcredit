import {
	APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES,
	APPLICATION_DOCUMENT_MAX_BYTES,
} from '~/lib/application-document-intake'

export const COMPANY_TEMPLATE_KIND_VALUES = [
	'authorization',
	'contract',
] as const

export type CompanyTemplateKind = (typeof COMPANY_TEMPLATE_KIND_VALUES)[number]

const COMPANY_TEMPLATE_KIND_SET = new Set<string>(COMPANY_TEMPLATE_KIND_VALUES)

export function isCompanyTemplateKind(
	value: string,
): value is CompanyTemplateKind {
	return COMPANY_TEMPLATE_KIND_SET.has(value)
}

export const COMPANY_TEMPLATE_ALLOWED_MIME_SET = new Set(
	APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES,
)

export const COMPANY_TEMPLATE_MAX_BYTES = APPLICATION_DOCUMENT_MAX_BYTES
