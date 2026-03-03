import { del, get, list, put } from '@vercel/blob'

export const APPLICATION_DOCUMENTS_PREFIX = 'application-documents/'

const VERCEL_BLOB_URL_HOST = 'blob.vercel-storage.com'

/** True if the key is a Vercel Blob URL or our pathname prefix (so safe to pass to del/get). */
export function isBlobStorageKey(key: string): boolean {
	return (
		key.includes(VERCEL_BLOB_URL_HOST) ||
		key.startsWith(APPLICATION_DOCUMENTS_PREFIX)
	)
}

export async function uploadBlob(
	pathname: string,
	body: Blob | Buffer | ReadableStream,
	options?: { contentType?: string },
): Promise<{ pathname: string }> {
	const blob = await put(pathname, body, {
		access: 'private',
		addRandomSuffix: true,
		contentType: options?.contentType,
	})
	return { pathname: blob.pathname }
}

export async function deleteBlob(urlOrPathname: string): Promise<void> {
	await del(urlOrPathname)
}

/** Fetch private blob by pathname for streaming (e.g. authenticated download). */
export async function getBlob(pathname: string) {
	return get(pathname, { access: 'private' })
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
