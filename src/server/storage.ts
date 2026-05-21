import { del, get, list, put } from '@vercel/blob'
import { env } from '~/env'
import {
	e2eLocalDeleteBlob,
	e2eLocalGetBlob,
	e2eLocalUploadBlob,
} from '~/server/e2e-local-blob-storage'

export const APPLICATION_DOCUMENTS_PREFIX = 'application-documents/'
export const COMPANY_DOCUMENT_TEMPLATES_PREFIX = 'company-document-templates/'

const VERCEL_BLOB_URL_HOST = 'blob.vercel-storage.com'

function localBlobStorageEnabled(): boolean {
	if (env.NODE_ENV === 'production') {
		return false
	}
	return env.BLOB_READ_WRITE_TOKEN === undefined
}

export function isBlobStorageKey(key: string): boolean {
	return (
		key.includes(VERCEL_BLOB_URL_HOST) ||
		key.startsWith(APPLICATION_DOCUMENTS_PREFIX) ||
		key.startsWith(COMPANY_DOCUMENT_TEMPLATES_PREFIX)
	)
}

export async function uploadBlob(
	pathname: string,
	body: Blob | Buffer | ReadableStream,
	options?: { contentType?: string },
): Promise<{ pathname: string }> {
	if (localBlobStorageEnabled()) {
		return e2eLocalUploadBlob(pathname, body, options)
	}
	const blob = await put(pathname, body, {
		access: 'private',
		addRandomSuffix: true,
		contentType: options?.contentType,
	})
	return { pathname: blob.pathname }
}

export async function deleteBlob(urlOrPathname: string): Promise<void> {
	if (localBlobStorageEnabled()) {
		await e2eLocalDeleteBlob(urlOrPathname)
		return
	}
	await del(urlOrPathname)
}

export async function getBlob(pathname: string) {
	if (localBlobStorageEnabled()) {
		return e2eLocalGetBlob(pathname)
	}
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
