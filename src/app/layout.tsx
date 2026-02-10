import '~/styles/globals.css'

import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: {
		default: 'TopCredit - Créditos Empresariales',
		template: '%s | TopCredit',
	},
	description:
		'Créditos nominales confiables para empleados de empresas afiliadas. Proceso 100% digital, aprobación rápida y las mejores tasas del mercado.',
	keywords: [
		'créditos',
		'préstamos',
		'empresas',
		'empleados',
		'fintech',
		'digital',
		'méxico',
	],
	authors: [{ name: 'TopCredit' }],
	creator: 'TopCredit',
	publisher: 'TopCredit',
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	metadataBase: new URL('https://topcredit.mx'),
	alternates: {
		canonical: '/',
	},
	openGraph: {
		title: 'TopCredit - Créditos Empresariales',
		description:
			'Créditos nominales confiables para empleados de empresas afiliadas. Proceso 100% digital, aprobación rápida y las mejores tasas del mercado.',
		url: 'https://topcredit.mx',
		siteName: 'TopCredit',
		images: [
			{
				url: '/logo.png',
				width: 1200,
				height: 630,
				alt: 'TopCredit - Créditos Empresariales',
			},
		],
		locale: 'es_MX',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'TopCredit - Créditos Empresariales',
		description:
			'Créditos nominales confiables para empleados de empresas afiliadas.',
		images: ['/logo.png'],
	},
	icons: {
		icon: '/favicon.png',
		shortcut: '/favicon.png',
		apple: '/logo-small.png',
	},
	manifest: '/manifest.json',
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	verification: {
		google: 'your-google-site-verification-code',
	},
}

const geist = Geist({
	subsets: ['latin'],
	variable: '--font-geist-sans',
})

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const messages = await getMessages()
	return (
		<html lang="es" className={`${geist.variable}`}>
			<body>
				<NextIntlClientProvider messages={messages}>
					<Providers>{children}</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
