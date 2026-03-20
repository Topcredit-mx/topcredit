'use client'

import { MessageSquare, SendHorizontal, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { type FormEvent, useId, useState } from 'react'
import { Button } from '~/components/ui/button'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

function faqPairs() {
	return [
		{ q: 'faq-q1' as const, a: 'faq-a1' as const },
		{ q: 'faq-q2' as const, a: 'faq-a2' as const },
		{ q: 'faq-q3' as const, a: 'faq-a3' as const },
		{ q: 'faq-q4' as const, a: 'faq-a4' as const },
	]
}

export function SupportAssistantPanel() {
	const t = useTranslations('dashboard.support')
	const chatRegionId = useId()
	const [draft, setDraft] = useState('')

	const onSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
	}

	return (
		<div className="flex w-full flex-col">
			<header className="mb-6 shrink-0">
				<ShellBackLink href="/dashboard">{t('back-link')}</ShellBackLink>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('page-title')}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
					{t('page-subtitle')}
				</p>
			</header>

			<div
				className={cn(
					shell.elevatedCard,
					'flex min-h-[min(70dvh,640px)] flex-col overflow-hidden',
				)}
			>
				<div className="flex items-center gap-3 border-slate-100 border-b px-4 py-3 sm:px-5">
					<div
						className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
						aria-hidden
					>
						<Sparkles className="size-5" />
					</div>
					<div className="min-w-0">
						<p className="font-semibold text-slate-900">
							{t('assistant-title')}
						</p>
						<p className="text-slate-500 text-xs">{t('assistant-status')}</p>
					</div>
				</div>

				<div
					id={chatRegionId}
					role="log"
					aria-label={t('assistant-title')}
					aria-live="polite"
					className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-5 sm:px-6"
				>
					<div className="flex justify-start">
						<div className="max-w-[min(100%,36rem)] rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-4 py-3 text-slate-800 text-sm leading-relaxed shadow-sm">
							{t('welcome-message')}
						</div>
					</div>
					<div className="flex justify-end">
						<div className="max-w-[min(100%,28rem)] rounded-2xl rounded-tr-md bg-brand px-4 py-3 text-sm text-white leading-relaxed shadow-sm">
							{t('demo-user-message')}
						</div>
					</div>
					<div className="flex justify-start">
						<div className="max-w-[min(100%,36rem)] rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-4 py-3 text-slate-800 text-sm leading-relaxed shadow-sm">
							{t('demo-assistant-message')}
						</div>
					</div>
				</div>

				<div className="border-slate-100 border-t bg-white px-4 py-4 sm:px-5">
					<form onSubmit={onSubmit} className="flex flex-col gap-3">
						<label htmlFor="support-chat-input" className="sr-only">
							{t('input-placeholder')}
						</label>
						<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
							<textarea
								id="support-chat-input"
								name="message"
								rows={2}
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								placeholder={t('input-placeholder')}
								className={cn(
									'min-h-12 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-slate-900 text-sm shadow-sm outline-none transition-[border-color,box-shadow]',
									'placeholder:text-slate-400',
									'focus:border-brand/40 focus:ring-2 focus:ring-brand/20',
								)}
							/>
							<Button
								type="submit"
								variant="brand"
								className="h-11 w-full shrink-0 font-semibold sm:w-auto sm:px-6"
								disabled
								aria-label={t('send')}
								title={t('input-hint')}
							>
								<SendHorizontal className="size-4 sm:mr-2" aria-hidden />
								<span className="hidden sm:inline">{t('send')}</span>
							</Button>
						</div>
						<p className="flex items-start gap-2 text-slate-500 text-xs leading-relaxed">
							<MessageSquare className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
							{t('input-hint')}
						</p>
					</form>
				</div>
			</div>

			<section className="mt-10" aria-labelledby="support-faq-heading">
				<h2
					id="support-faq-heading"
					className="font-semibold text-lg text-slate-900"
				>
					{t('faq-title')}
				</h2>
				<ul className="mt-4 space-y-2">
					{faqPairs().map(({ q, a }) => (
						<li key={q}>
							<details
								className={cn(
									shell.elevatedCard,
									'group overflow-hidden p-0 transition-shadow hover:shadow-md',
								)}
							>
								<summary className="cursor-pointer list-none px-4 py-3 font-medium text-slate-900 text-sm outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-brand/25 [&::-webkit-details-marker]:hidden">
									<span className="flex items-center justify-between gap-2">
										{t(q)}
										<span className="text-slate-400 text-xs group-open:rotate-180">
											▼
										</span>
									</span>
								</summary>
								<div className="border-slate-100 border-t px-4 py-3 text-slate-600 text-sm leading-relaxed">
									{t(a)}
								</div>
							</details>
						</li>
					))}
				</ul>
			</section>

			<p className="mt-8 text-center text-slate-500 text-xs leading-relaxed">
				{t('disclaimer')}{' '}
				<Link href="/dashboard/settings" className={shell.textLink}>
					{t('settings-link')}
				</Link>
			</p>
		</div>
	)
}
