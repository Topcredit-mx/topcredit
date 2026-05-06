import { NextResponse } from 'next/server'
import { isCompanyTemplateKind } from '~/lib/company-templates'
import { getCompanyTemplateStreamForCompanyReader } from '~/server/company-templates'

export async function GET(
	_request: Request,
	context: { params: Promise<{ companyId: string; kind: string }> },
) {
	const { companyId: idStr, kind } = await context.params
	const companyId = Number(idStr)
	if (!Number.isInteger(companyId) || companyId < 1) {
		return NextResponse.json({ error: 'Bad request' }, { status: 400 })
	}
	if (!isCompanyTemplateKind(kind)) {
		return NextResponse.json({ error: 'Bad request' }, { status: 400 })
	}

	const result = await getCompanyTemplateStreamForCompanyReader({
		companyId,
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
