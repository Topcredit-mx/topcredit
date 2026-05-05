import { NextResponse } from 'next/server'
import { isCompanyTemplateKind } from '~/lib/company-templates'
import { getCompanyTemplateStreamForApplicationReader } from '~/server/company-templates'

export async function GET(
	_request: Request,
	context: {
		params: Promise<{ applicationId: string; kind: string }>
	},
) {
	const { applicationId: idStr, kind } = await context.params
	const applicationId = Number(idStr)
	if (!Number.isInteger(applicationId) || applicationId < 1) {
		return NextResponse.json({ error: 'Bad request' }, { status: 400 })
	}
	if (!isCompanyTemplateKind(kind)) {
		return NextResponse.json({ error: 'Bad request' }, { status: 400 })
	}

	const result = await getCompanyTemplateStreamForApplicationReader({
		applicationId,
		kind,
	})
	if (!result) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	return new NextResponse(result.stream, {
		headers: {
			'Content-Type': result.contentType,
			'Content-Disposition': result.disposition,
		},
	})
}
