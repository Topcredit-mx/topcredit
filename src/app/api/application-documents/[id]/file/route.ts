import { NextResponse } from 'next/server'
import { getApplicationDocumentStream } from '~/server/application-documents'

/**
 * Serves the application document file. Auth and blob fetch live in server/application-documents.
 * This route exists only because the UI uses <a href="..."> for "Ver"—the browser needs a GET URL to request the file.
 */
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

	const disposition = `inline; filename="${result.fileName.replace(/"/g, '%22')}"`

	return new NextResponse(result.stream, {
		headers: {
			'Content-Type': result.contentType,
			'Content-Disposition': disposition,
		},
	})
}
