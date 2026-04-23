import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

const isCI = process.env.GITHUB_ACTIONS === 'true'
const hasE2eDb = Boolean(process.env.DATABASE_URL)

// CI shard jobs set PW_BLOB_REPORT=true so `merge-reports` can build one HTML report; locally omit it for the default HTML reporter.
const useBlobReporter = process.env.PW_BLOB_REPORT === 'true'

const ciWorkersEnv = process.env.PW_WORKERS
const ciWorkers =
	ciWorkersEnv !== undefined && ciWorkersEnv !== ''
		? Number.parseInt(ciWorkersEnv, 10)
		: 4

export default defineConfig({
	testDir: './e2e',
	globalSetup: hasE2eDb ? './e2e/global-setup.ts' : undefined,
	fullyParallel: !hasE2eDb,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: hasE2eDb
		? 1
		: isCI
			? Number.isFinite(ciWorkers) && ciWorkers > 0
				? ciWorkers
				: 4
			: undefined,
	reporter: useBlobReporter
		? isCI
			? [['blob'], ['github']]
			: [['blob']]
		: [['html', { open: 'never' }]],
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'retain-on-failure',
		video: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
