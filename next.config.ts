/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import type { NextConfig } from 'next'
import './src/env.js'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const config: NextConfig = {
	// Next.js 16 uses top-level turbopack; next-intl still writes to experimental.turbo,
	// so we set the alias here so the config is found during prerender.
	turbopack: {
		resolveAlias: {
			'next-intl/config': './src/i18n/request.ts',
		},
	},
}

export default withNextIntl(config)
