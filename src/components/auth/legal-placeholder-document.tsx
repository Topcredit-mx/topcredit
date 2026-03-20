import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import {
	authInlineLinkClass,
	authPageTitleClass,
} from '~/components/auth/auth-form-styles'
import { cn } from '~/lib/utils'

const SECTIONS = ['s1', 's2', 's3', 's4'] as const

export async function LegalPlaceholderDocument({
	kind,
}: {
	kind: 'terms' | 'privacy'
}) {
	const t = await getTranslations('legal')
	const otherHref = kind === 'terms' ? '/privacy' : '/terms'
	const otherLabel =
		kind === 'terms' ? t('terms.see-privacy') : t('privacy.see-terms')

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col items-center gap-3 text-center">
				<span className="inline-flex rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1 font-medium text-slate-600 text-xs">
					{t(`${kind}.badge`)}
				</span>
				<h1 className={cn(authPageTitleClass, 'text-balance')}>
					{t(`${kind}.title`)}
				</h1>
			</div>

			<div className="space-y-6">
				<p className="text-pretty text-slate-600 text-sm leading-relaxed">
					{t(`${kind}.intro`)}
				</p>

				{SECTIONS.map((id) => (
					<section key={id} className="space-y-2">
						<h2 className="font-semibold text-slate-900 text-sm">
							{t(`${kind}.${id}-title`)}
						</h2>
						<p className="text-pretty text-slate-600 text-sm leading-relaxed">
							{t(`${kind}.${id}-body`)}
						</p>
					</section>
				))}

				<div className="border-slate-100 border-t pt-4 text-center">
					<Link href={otherHref} className={authInlineLinkClass}>
						{otherLabel}
					</Link>
				</div>

				<p className="text-pretty text-center text-slate-500 text-xs leading-relaxed">
					{t(`${kind}.footer-note`)}
				</p>
			</div>
		</div>
	)
}
