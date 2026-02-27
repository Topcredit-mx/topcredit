import { del, list, put } from '@vercel/blob'

export const APPLICATION_DOCUMENTS_PREFIX = 'application-documents/'

export async function uploadBlob(
	pathname: string,
	body: Blob | Buffer | ReadableStream,
	options?: { contentType?: string },
): Promise<{ url: string }> {
	const blob = await put(pathname, body, {
		access: 'public',
		addRandomSuffix: true,
		contentType: options?.contentType,
	})
	return { url: blob.url }
}

export async function deleteBlob(url: string): Promise<void> {
	await del(url)
}

export type ListBlobItem = { url: string; pathname: string }

export async function listBlobs(prefix?: string): Promise<{
	blobs: ListBlobItem[]
	cursor?: string
}> {
	const result = await list({ prefix })
	return {
		blobs: result.blobs.map((b) => ({ url: b.url, pathname: b.pathname })),
		cursor: result.cursor,
	}
}
