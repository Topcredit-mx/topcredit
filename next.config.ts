import type { NextConfig } from 'next'
import './src/env.js'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const config: NextConfig = {
	turbopack: {
		resolveAlias: {
			'next-intl/config': './src/i18n/request.ts',
		},
	},
}

export default withNextIntl(config)
