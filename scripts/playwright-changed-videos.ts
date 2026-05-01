import { execFile as execFileWithCallback } from 'node:child_process'
import { readdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFile = promisify(execFileWithCallback)

type CliOptions = {
	baseRef: string
	resultsDir: string
	maxVideos: number
	output?: string
}

export type ChangedSpecFile = {
	path: string
	status: string
}

export type ChangedTestVideo = {
	specFile: string
	videoPath: string
}

const DEFAULT_BASE_REF = 'origin/main'
const DEFAULT_RESULTS_DIR = 'test-results'
const DEFAULT_MAX_VIDEOS = 5
const PLAYWRIGHT_SPEC_PATTERN = /^e2e\/.+\.spec\.ts$/

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2))
	const changedSpecs = await getChangedSpecs(options.baseRef)
	const videos = await findVideoFiles(options.resultsDir)
	const selectedVideos = selectChangedTestVideos({
		changedSpecFiles: changedSpecs.map((spec) => spec.path),
		videoPaths: videos,
		maxVideos: options.maxVideos,
	})
	const markdown = renderMarkdown({
		baseRef: options.baseRef,
		changedSpecs: changedSpecs.map((spec) => spec.path),
		selectedVideos,
	})

	if (options.output === undefined) {
		process.stdout.write(markdown)
		return
	}

	await writeFile(options.output, markdown)
	console.log(`Wrote ${options.output}`)
}

function parseArgs(args: readonly string[]): CliOptions {
	const options: CliOptions = {
		baseRef: process.env.PW_CHANGED_BASE_REF ?? DEFAULT_BASE_REF,
		resultsDir: process.env.PW_CHANGED_RESULTS_DIR ?? DEFAULT_RESULTS_DIR,
		maxVideos: parsePositiveInt(
			process.env.PW_CHANGED_MAX_VIDEOS,
			DEFAULT_MAX_VIDEOS,
		),
	}

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i]
		if (arg === undefined) continue

		if (arg === '--help' || arg === '-h') {
			printHelp()
			process.exit(0)
		}

		if (arg === '--base-ref') {
			options.baseRef = readFlagValue(args, i, arg)
			i += 1
			continue
		}

		if (arg === '--results-dir') {
			options.resultsDir = readFlagValue(args, i, arg)
			i += 1
			continue
		}

		if (arg === '--max-videos') {
			options.maxVideos = parsePositiveInt(readFlagValue(args, i, arg), 1)
			i += 1
			continue
		}

		if (arg === '--output') {
			options.output = readFlagValue(args, i, arg)
			i += 1
			continue
		}

		throw new Error(`Unknown argument: ${arg}`)
	}

	return options
}

function readFlagValue(
	args: readonly string[],
	index: number,
	flag: string,
): string {
	const value = args[index + 1]
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`${flag} requires a value`)
	}
	return value
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
	if (value === undefined || value === '') return fallback
	const parsed = Number.parseInt(value, 10)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function getChangedSpecs(baseRef: string): Promise<{ path: string }[]> {
	const { stdout } = await execFile('git', [
		'diff',
		'--name-status',
		`${baseRef}...HEAD`,
		'--',
		'e2e',
	])

	return parseGitNameStatus(stdout)
}

export function parseGitNameStatus(output: string): ChangedSpecFile[] {
	const specs: ChangedSpecFile[] = []

	for (const line of output.split('\n')) {
		if (line.trim() === '') continue

		const parts = line.split('\t')
		const [status, firstPath, secondPath] = parts
		if (status === undefined || status.startsWith('D')) continue

		const path =
			status.startsWith('R') || status.startsWith('C') ? secondPath : firstPath
		if (path === undefined) continue

		const normalizedPath = normalizePath(path).replace(/^\.\//, '')
		if (PLAYWRIGHT_SPEC_PATTERN.test(normalizedPath)) {
			specs.push({ path: normalizedPath, status })
		}
	}

	return specs
}

async function findVideoFiles(resultsDir: string): Promise<string[]> {
	const files = await listFiles(resultsDir)
	return files
		.filter((file) => file.endsWith('.webm'))
		.map((file) => normalizePath(relative(process.cwd(), file)))
		.sort()
}

async function listFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true }).catch(
		(error: unknown) => {
			if (isNodeErrorCode(error, 'ENOENT')) return []
			throw error
		},
	)

	const files: string[] = []

	for (const entry of entries) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) {
			files.push(...(await listFiles(path)))
			continue
		}

		if (entry.isFile()) files.push(path)
	}

	return files
}

export function selectChangedTestVideos({
	changedSpecFiles,
	videoPaths,
	maxVideos = DEFAULT_MAX_VIDEOS,
}: {
	changedSpecFiles: readonly string[]
	videoPaths: readonly string[]
	maxVideos?: number
}): ChangedTestVideo[] {
	if (maxVideos <= 0) return []

	const specMatchers = changedSpecFiles
		.map((file) => {
			const path = normalizePath(file).replace(/^\.\//, '')
			const key = normalizeForMatch(
				path.replace(/^e2e\//, '').replace(/\.spec\.ts$/, ''),
			)
			return { file: path, key }
		})
		.filter((matcher) => matcher.key !== '')
		.sort((a, b) => b.key.length - a.key.length)

	const selected: ChangedTestVideo[] = []
	for (const videoPath of videoPaths) {
		const normalizedVideoPath = normalizeForMatch(videoPath)
		const matcher = specMatchers.find(
			(spec) =>
				hasTokenMatch(normalizedVideoPath, spec.key) ||
				hasTokenMatch(normalizedVideoPath, `e2e-${spec.key}`),
		)
		if (matcher === undefined) continue

		selected.push({ specFile: matcher.file, videoPath })
		if (selected.length >= maxVideos) break
	}

	return selected
}

function renderMarkdown({
	baseRef,
	changedSpecs,
	selectedVideos,
}: {
	baseRef: string
	changedSpecs: readonly string[]
	selectedVideos: readonly { specFile: string; videoPath: string }[]
}): string {
	const lines = [
		'## Changed Playwright videos',
		'',
		`Compared specs against \`${baseRef}...HEAD\`.`,
		'',
	]

	if (changedSpecs.length === 0) {
		lines.push('No changed Playwright spec files were found under `e2e/`.', '')
		return `${lines.join('\n')}\n`
	}

	lines.push('Changed specs:', '')
	for (const spec of changedSpecs) {
		lines.push(`- \`${spec}\``)
	}
	lines.push('')

	if (selectedVideos.length === 0) {
		lines.push(
			'No matching retained Playwright failure videos were found in `test-results/`.',
			'',
		)
		return `${lines.join('\n')}\n`
	}

	lines.push('Videos to include in the PR summary:', '')
	for (const video of selectedVideos) {
		lines.push(
			`- ${video.specFile}: <video src="${normalizePath(resolve(video.videoPath))}"></video>`,
		)
	}
	lines.push('')

	return `${lines.join('\n')}\n`
}

function normalizePath(path: string): string {
	return path.replaceAll('\\', '/')
}

function normalizeForMatch(value: string): string {
	return normalizePath(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function hasTokenMatch(value: string, token: string): boolean {
	return (
		value === token ||
		value.startsWith(`${token}-`) ||
		value.includes(`-${token}-`)
	)
}

function isNodeErrorCode(error: unknown, code: string): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		error.code === code
	)
}

function printHelp(): void {
	console.log(`Usage: pnpm playwright:changed-videos [options]

Find changed Playwright spec files and print up to five matching retained videos.

Options:
  --base-ref <ref>      Git ref to compare against (default: origin/main)
  --results-dir <dir>   Playwright test-results directory (default: test-results)
  --max-videos <n>      Maximum videos to list (default: 5)
  --output <file>       Write markdown to a file instead of stdout
`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error)
		console.error(message)
		process.exitCode = 1
	})
}
