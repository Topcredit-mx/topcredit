function isControlChar(code: number): boolean {
	return (
		(code >= 0 && code <= 0x1f) ||
		code === 0x7f ||
		(code >= 0x80 && code <= 0x9f)
	)
}

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

export function buildInlineDisposition(fileName: string): string {
	const sanitized = sanitizeFileNameForDisposition(fileName)
	const displayName = sanitized || 'download'

	const asciiOnly = displayName.replace(/[^\x20-\x7E]/g, '_')
	const base = `inline; filename="${asciiOnly}"`

	const hasNonAscii = displayName !== asciiOnly
	if (!hasNonAscii) {
		return base
	}

	const encoded = encodeURIComponent(displayName)
	return `${base}; filename*=UTF-8''${encoded}`
}
