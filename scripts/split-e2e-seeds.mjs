import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const tasksPath = path.join(root, 'e2e/server/tasks.ts')
const seedsPath = path.join(root, 'e2e/server/seeds/index.ts')
const lineMarker = 'export const seedPreAuthorizedPackageDocuments'

const raw = fs.readFileSync(tasksPath, 'utf8')
if (!raw.includes(lineMarker)) {
	throw new Error(
		`tasks.ts must include "${lineMarker}" before running this script`,
	)
}
const lines = raw.split('\n')
const firstExportIdx = lines.findIndex((l) => l.startsWith('export '))
if (firstExportIdx < 0) {
	throw new Error('no export in tasks.ts')
}
const importBlock = lines.slice(0, firstExportIdx).join('\n')
const monolithLineIdx = lines.findIndex((l) => l.trim().startsWith(lineMarker))
if (monolithLineIdx < 0) {
	throw new Error('marker not found for split')
}
const coreBody = lines.slice(firstExportIdx, monolithLineIdx).join('\n')
const seedRest = lines.slice(monolithLineIdx).join('\n')
const preAuthType = `export type SeedPreAuthorizedPackageDocumentsTaskParams = {
	applicationId: number
	variant: SeedPreAuthorizedPackageVariant
}

`

const seedImports = importBlock
	.replace("from './e2e-db'", "from '../e2e-db'")
	.replace("from './shared/", "from '../shared/")

const seedBodyWithExportLogin = preAuthType + seedRest
const loginFlowExport = "export * from './login-flow'\n\n"
const seedsFile = seedBodyWithExportLogin.includes(
	"export * from './login-flow'",
)
	? `${seedImports}\n${seedBodyWithExportLogin}`
	: (() => {
			const w = 'async function wipeCuentaApplicationsE2EFixtureState'
			const wIdx = seedBodyWithExportLogin.indexOf(w)
			if (wIdx < 0) {
				throw new Error('wipeCuenta marker not found')
			}
			return `${seedImports}\n${seedBodyWithExportLogin.slice(0, wIdx)}${loginFlowExport}${seedBodyWithExportLogin.slice(wIdx)}`
		})()

const coreFile = `${importBlock}
${coreBody}

export * from './seeds/index'
`
fs.mkdirSync(path.dirname(seedsPath), { recursive: true })
fs.writeFileSync(seedsPath, seedsFile)
fs.writeFileSync(tasksPath, coreFile)
console.log(
	'Wrote e2e/server/seeds/index.ts and e2e/server/tasks.ts (core + barrel export)',
)
