import { NextResponse } from 'next/server'
import { getApplicationDocumentStream } from '~/server/application-documents'
import { buildInlineDisposition } from '~/server/content-disposition'

export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { id } = await context.params
	const documentId = Number(id)
	if (!Number.isInteger(documentId) || documentId < 1) {
		return NextResponse.json({ error: 'Bad request' }, { status: 400 })
	}

	const result = await getApplicationDocumentStream(documentId)
	if (!result) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	const disposition = buildInlineDisposition(result.fileName)

	return new NextResponse(result.stream, {
		headers: {
			'Content-Type': result.contentType,
			'Content-Disposition': disposition,
		},
	})
}
