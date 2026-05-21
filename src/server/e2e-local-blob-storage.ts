import { randomBytes } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

const E2E_BLOB_ROOT = path.join(process.cwd(), '.e2e-blobs')

function metaPath(storedPathname: string): string {
	return `${path.join(E2E_BLOB_ROOT, storedPathname)}.meta.json`
}

function filePath(storedPathname: string): string {
	return path.join(E2E_BLOB_ROOT, storedPathname)
}

function addRandomSuffix(pathname: string): string {
	const lastSlash = pathname.lastIndexOf('/')
	const dir = lastSlash >= 0 ? pathname.slice(0, lastSlash + 1) : ''
	const base = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname
	const dot = base.lastIndexOf('.')
	const id = randomBytes(8).toString('hex')
	if (dot >= 0) {
		return `${dir}${base.slice(0, dot)}-${id}${base.slice(dot)}`
	}
	return `${dir}${base}-${id}`
}

async function ensureParentDir(storedPathname: string): Promise<void> {
	await mkdir(path.dirname(filePath(storedPathname)), { recursive: true })
}

export async function e2eLocalUploadBlob(
	pathname: string,
	body: Blob | Buffer | ReadableStream,
	options?: { contentType?: string },
): Promise<{ pathname: string }> {
	const storedPathname = addRandomSuffix(pathname)
	await ensureParentDir(storedPathname)

	let buffer: Buffer
	if (body instanceof Buffer) {
		buffer = body
	} else if (body instanceof Blob) {
		buffer = Buffer.from(await body.arrayBuffer())
	} else {
		const chunks: Buffer[] = []
		for await (const chunk of body as AsyncIterable<Buffer | Uint8Array>) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}
		buffer = Buffer.concat(chunks)
	}

	await writeFile(filePath(storedPathname), buffer)
	await writeFile(
		metaPath(storedPathname),
		JSON.stringify({
			contentType: options?.contentType ?? 'application/octet-stream',
		}),
	)

	return { pathname: storedPathname }
}

type E2eLocalGetResult = {
	statusCode: number
	stream: ReadableStream<Uint8Array> | null
	blob: { contentType?: string }
}

export async function e2eLocalGetBlob(
	pathname: string,
): Promise<E2eLocalGetResult | null> {
	const absolute = filePath(pathname)
	try {
		const [body, metaRaw] = await Promise.all([
			readFile(absolute),
			readFile(metaPath(pathname), 'utf8'),
		])
		const meta = JSON.parse(metaRaw) as { contentType?: string }
		const nodeStream = Readable.from(body)
		const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>
		return {
			statusCode: 200,
			stream: webStream,
			blob: { contentType: meta.contentType },
		}
	} catch {
		return null
	}
}

export async function e2eLocalDeleteBlob(pathname: string): Promise<void> {
	await Promise.allSettled([
		unlink(filePath(pathname)),
		unlink(metaPath(pathname)),
	])
}
