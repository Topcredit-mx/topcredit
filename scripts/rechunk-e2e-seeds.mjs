import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const indexPath = path.join(root, 'e2e/server/seeds/index.ts')
const lines = fs.readFileSync(indexPath, 'utf8').split('\n')
const firstExport = lines.findIndex((l) => l.startsWith('export '))
if (firstExport < 0) {
	throw new Error('no export in index.ts')
}
const importBlock = lines.slice(0, firstExport).join('\n')

// Ranges: [start line index inclusive, end exclusive) — 0-based into `lines` from current monolithic index.ts
const segments = [
	[firstExport, 334, 'pre-auth-and-applicant.ts'],
	[336, 529, 'cuenta-applications.ts'],
	[529, 933, 'admin-and-other-flows.ts'],
	[933, 1347, 'applications-review.ts'],
	[1347, 1792, 'role-queue-hr-disbursement.ts'],
	[1792, 2061, 'cuenta-credits.ts'],
	[2061, 2656, 'deductions-queue.ts'],
	[2656, 3467, 'installments-queues.ts'],
	[3467, lines.length, 'credit-detail-and-final.ts'],
]

for (const [start, end, name] of segments) {
	if (start < 0 || end > lines.length || start >= end) {
		throw new Error(
			`bad range ${name}: ${start}..${end} (file has ${lines.length} lines)`,
		)
	}
	const body = lines.slice(start, end).join('\n')
	const out = path.join(root, 'e2e/server/seeds', name)
	fs.writeFileSync(out, `${importBlock}\n\n${body}\n`)
}

const barrel = `export * from './login-flow'
${segments
	.map((s) => `export * from './${s[2].replace(/\.ts$/, '')}'`)
	.join('\n')}
`
fs.writeFileSync(indexPath, `${barrel}\n`)
console.log('Split seeds into', segments.length, 'files + login-flow re-export')
