/**
 * next-intl v4 strict type augmentation (AppConfig).
 * @see https://next-intl.dev/docs/workflows/typescript
 */
import type messages from '~/messages/es.json'

declare module 'next-intl' {
	interface AppConfig {
		Messages: typeof messages
		Locale: 'es'
	}
}
