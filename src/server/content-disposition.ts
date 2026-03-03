/**
 * Builds a safe Content-Disposition value for inline display with a filename.
 * Sanitizes the filename to prevent header injection (control chars, quotes)
 * and uses RFC 5987 filename*=UTF-8''... for non-ASCII names.
 */

/**
 * Returns true for C0/C1 control characters (including \r, \n) that must not appear in headers.
 */
function isControlChar(code: number): boolean {
	return (
		(code >= 0 && code <= 0x1f) ||
		code === 0x7f ||
		(code >= 0x80 && code <= 0x9f)
	)
}

/**
 * Sanitizes a filename for use in Content-Disposition: strips control
 * characters and escapes double quotes to prevent header injection and
 * broken display.
 */
export function sanitizeFileNameForDisposition(fileName: string): string {
	let out = ''
	for (const c of fileName) {
		const code = c.codePointAt(0)
		if (code !== undefined && !isControlChar(code)) {
			out += c
		}
	}
	return out.replace(/"/g, '%22')
}

/**
 * Returns a Content-Disposition header value for inline display, e.g.:
 *   inline; filename="safe.pdf"
 *   inline; filename="safe.pdf"; filename*=UTF-8''caf%C3%A9.pdf
 */
export function buildInlineDisposition(fileName: string): string {
	const sanitized = sanitizeFileNameForDisposition(fileName)
	const displayName = sanitized || 'download'

	// ASCII-only value for legacy filename= (RFC 2616 quoted-string is ASCII).
	const asciiOnly = displayName.replace(/[^\x20-\x7E]/g, '_')
	const base = `inline; filename="${asciiOnly}"`

	const hasNonAscii = displayName !== asciiOnly
	if (!hasNonAscii) {
		return base
	}

	// RFC 5987: filename*=UTF-8''percent-encoded-value for non-ASCII.
	const encoded = encodeURIComponent(displayName)
	return `${base}; filename*=UTF-8''${encoded}`
}
