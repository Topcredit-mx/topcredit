import { fileTypeFromBuffer } from 'file-type'
import { ValidationCode } from '~/lib/validation-codes'

/** Bytes to read from the start of a file for magic-byte detection. */
const MAGIC_BYTE_SAMPLE_SIZE = 4100

/**
 * Detects MIME type from file content (magic bytes), not client-provided file.type.
 * Returns the detected MIME if it is in the allowed set; otherwise returns an error (validation code).
 */
export async function detectAllowedMime(
	file: File,
	allowedMimes: Set<string>,
): Promise<{ mime: string } | { error: string }> {
	const slice = file.slice(0, MAGIC_BYTE_SAMPLE_SIZE)
	const buffer = await slice.arrayBuffer()
	const result = await fileTypeFromBuffer(new Uint8Array(buffer))
	if (!result) {
		return { error: ValidationCode.FILE_TYPE_UNKNOWN }
	}
	if (!allowedMimes.has(result.mime)) {
		return { error: ValidationCode.FILE_TYPE_NOT_ALLOWED }
	}
	return { mime: result.mime }
}
