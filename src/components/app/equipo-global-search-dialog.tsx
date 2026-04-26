'use client'

import { FileText, Search, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
	type EquipoGlobalSearchItem,
	searchEquipoApplicationsAndCredits,
} from '~/app/equipo/(main)/actions'
import { Badge } from '~/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { isApplicationStatus } from '~/lib/application-rules'
import { EQUIPO_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { formatCurrencyMxn } from '~/lib/utils'

const SEARCH_DEBOUNCE_MS = 220

function isModK(e: KeyboardEvent) {
	return (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
}

export function EquipoGlobalSearchDialog() {
	const t = useTranslations('equipo')
	const inputId = useId()
	const inputRef = useRef<HTMLInputElement>(null)
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<EquipoGlobalSearchItem[]>([])
	const [loading, setLoading] = useState(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	)

	const runSearch = useCallback(async (q: string) => {
		const trimmed = q.trim()
		if (trimmed.length === 0) {
			setResults([])
			setLoading(false)
			return
		}
		setLoading(true)
		const rows = await searchEquipoApplicationsAndCredits(trimmed)
		setResults(rows)
		setLoading(false)
	}, [])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!isModK(e)) return
			const target = e.target
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.closest('[contenteditable="true"]') != null)
			) {
				return
			}
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement
			) {
				return
			}
			e.preventDefault()
			setOpen(true)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	useEffect(() => {
		if (!open) return
		if (debounceRef.current !== undefined) {
			clearTimeout(debounceRef.current)
		}
		const q = query
		debounceRef.current = setTimeout(() => {
			void runSearch(q)
		}, SEARCH_DEBOUNCE_MS)
		return () => {
			if (debounceRef.current !== undefined) {
				clearTimeout(debounceRef.current)
			}
		}
	}, [open, query, runSearch])

	const onOpenChange = (next: boolean) => {
		setOpen(next)
		if (!next) {
			setQuery('')
			setResults([])
			setLoading(false)
		}
	}

	return (
		<>
			<p className="text-muted-foreground text-xs">{t('global-search-hint')}</p>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					showCloseButton
					className="top-[12%] max-h-[min(70vh,32rem)] w-full max-w-2xl translate-y-0 gap-0 overflow-hidden border-border/80 p-0 shadow-xl sm:max-w-2xl"
					onOpenAutoFocus={(e) => {
						e.preventDefault()
						requestAnimationFrame(() => inputRef.current?.focus())
					}}
				>
					<DialogHeader className="sr-only">
						<DialogTitle>{t('global-search-title')}</DialogTitle>
						<DialogDescription>
							{t('global-search-description')}
						</DialogDescription>
					</DialogHeader>
					<div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
						<Search
							className="size-5 shrink-0 text-muted-foreground"
							aria-hidden
						/>
						<Input
							ref={inputRef}
							id={inputId}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={t('global-search-placeholder')}
							className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
							autoComplete="off"
							autoCorrect="off"
							spellCheck={false}
							aria-label={t('global-search-placeholder')}
						/>
					</div>
					<div className="max-h-[min(55vh,26rem)] overflow-y-auto px-1 py-2">
						{loading && query.trim().length > 0 ? (
							<p className="px-4 py-6 text-center text-muted-foreground text-sm">
								{t('global-search-loading')}
							</p>
						) : null}
						{!loading && query.trim().length > 0 && results.length === 0 ? (
							<p className="px-4 py-6 text-center text-muted-foreground text-sm">
								{t('global-search-empty')}
							</p>
						) : null}
						{query.trim().length === 0 ? (
							<p className="px-4 py-6 text-center text-muted-foreground text-sm">
								{t('global-search-type-more')}
							</p>
						) : null}
						<ul className="space-y-0">
							{results.map((row) => (
								<li
									key={`${row.applicationId}-${row.creditId ?? 'no-credit'}`}
									className="border-border/60 border-b last:border-b-0"
								>
									<div className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-muted/40">
										<div className="flex flex-wrap items-baseline justify-between gap-2">
											<span className="font-medium text-foreground">
												{row.applicantName}
											</span>
											<span className="text-muted-foreground text-xs">
												{row.companyName}
											</span>
										</div>
										<div className="text-muted-foreground text-sm">
											{row.applicantEmail}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<Badge
												variant="secondary"
												className="font-normal text-xs"
											>
												{t(
													isApplicationStatus(row.applicationStatus)
														? EQUIPO_APPLICATION_STATUS_KEYS[
																row.applicationStatus
															]
														: 'applications-status-pending',
												)}
											</Badge>
											{row.creditId !== null && row.creditStatus !== null ? (
												<Badge
													variant="outline"
													className="font-normal text-xs"
												>
													{row.creditStatus === 'dispersed'
														? t('credit-detail-status-dispersed')
														: t('credit-detail-status-settled')}
												</Badge>
											) : null}
											{row.payrollNumber !== null &&
											row.payrollNumber !== '' ? (
												<span className="text-muted-foreground text-xs">
													{t('credit-detail-payroll-number')}:{' '}
													{row.payrollNumber}
												</span>
											) : null}
											{row.transferAmount !== null ? (
												<span className="text-muted-foreground text-xs">
													{formatCurrencyMxn(row.transferAmount)}
												</span>
											) : null}
										</div>
										<div className="flex flex-wrap gap-4 pt-1">
											<Link
												href={`/equipo/applications/${row.applicationId}`}
												onClick={() => setOpen(false)}
												className="inline-flex items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline"
											>
												<FileText className="size-3.5 shrink-0" aria-hidden />
												{t('global-search-link-application', {
													id: row.applicationId,
												})}
											</Link>
											{row.creditId !== null ? (
												<Link
													href={`/equipo/credits/${row.creditId}`}
													onClick={() => setOpen(false)}
													className="inline-flex items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline"
												>
													<Wallet className="size-3.5 shrink-0" aria-hidden />
													{t('global-search-link-credit', { id: row.creditId })}
												</Link>
											) : null}
										</div>
									</div>
								</li>
							))}
						</ul>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
