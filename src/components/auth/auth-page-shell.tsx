import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

export async function AuthPageShell({
	children,
	wide = false,
}: {
	children: ReactNode
	/** Wider card for document-style pages (e.g. terms, privacy). */
	wide?: boolean
}) {
	const tCuenta = await getTranslations('cuenta')
	const year = new Date().getFullYear()

	return (
		<div className="flex min-h-screen flex-col bg-slate-50/80">
			<div className="flex flex-1 flex-col items-center justify-center px-4 py-10 md:py-14">
				<div
					className={cn(
						shell.elevatedCard,
						'w-full p-8 md:p-10',
						wide ? 'max-w-2xl' : 'max-w-md',
					)}
				>
					{children}
				</div>
			</div>
			<footer className="border-slate-200/80 border-t bg-white px-4 py-6 text-center text-slate-500 text-sm">
				{tCuenta('footer-copyright', { year })}
			</footer>
		</div>
	)
}
