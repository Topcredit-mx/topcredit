'use client'

import {
	Banknote,
	Building2,
	FileText,
	Hash,
	Mail,
	Search,
	User,
	Wallet,
} from 'lucide-react'
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

	const applicationStatusLabel = (row: EquipoGlobalSearchItem) => {
		if (isApplicationStatus(row.applicationStatus)) {
			return t(EQUIPO_APPLICATION_STATUS_KEYS[row.applicationStatus])
		}
		return t('applications-status-pending')
	}

	const creditStatusLabel = (row: EquipoGlobalSearchItem) => {
		if (row.creditId === null || row.creditStatus === null) {
			return null
		}
		if (row.creditStatus === 'dispersed') {
			return t('credit-detail-status-dispersed')
		}
		return t('credit-detail-status-settled')
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
							{results.map((row) => {
								const appLabel = applicationStatusLabel(row)
								const credLabel = creditStatusLabel(row)
								const showCreditStatusBadge =
									credLabel !== null && credLabel !== appLabel

								return (
									<li
										key={`${row.applicationId}-${row.creditId ?? 'no-credit'}`}
										className="border-border/60 border-b last:border-b-0"
									>
										<div className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40">
											<div className="flex flex-wrap items-start justify-between gap-2">
												<div className="flex min-w-0 items-center gap-2">
													<User
														className="size-4 shrink-0 text-muted-foreground"
														aria-hidden
													/>
													<span className="truncate font-medium text-foreground">
														{row.applicantName}
													</span>
												</div>
												<div className="flex max-w-full items-center gap-1.5 text-muted-foreground text-xs sm:max-w-[55%]">
													<Building2
														className="size-3.5 shrink-0 opacity-80"
														aria-hidden
													/>
													<span className="truncate">{row.companyName}</span>
												</div>
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<Mail
													className="size-3.5 shrink-0 opacity-80"
													aria-hidden
												/>
												<span className="truncate">{row.applicantEmail}</span>
											</div>
											<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
												<div className="flex items-center gap-1.5">
													<FileText
														className="size-3.5 shrink-0 text-muted-foreground"
														aria-hidden
													/>
													<span className="sr-only">
														{t('global-search-label-application')}
													</span>
													<Badge
														variant="secondary"
														className="font-normal text-xs"
													>
														{appLabel}
													</Badge>
												</div>
												{showCreditStatusBadge && credLabel !== null ? (
													<div className="flex items-center gap-1.5">
														<Wallet
															className="size-3.5 shrink-0 text-muted-foreground"
															aria-hidden
														/>
														<span className="sr-only">
															{t('global-search-label-credit')}
														</span>
														<Badge
															variant="outline"
															className="font-normal text-xs"
														>
															{credLabel}
														</Badge>
													</div>
												) : null}
											</div>
											{row.payrollNumber !== null &&
											row.payrollNumber !== '' ? (
												<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
													<span className="inline-flex items-center gap-1.5">
														<Hash
															className="size-3.5 shrink-0 opacity-80"
															aria-hidden
														/>
														{t('credit-detail-payroll-number')}:{' '}
														{row.payrollNumber}
													</span>
													{row.transferAmount !== null ? (
														<span className="inline-flex items-center gap-1.5">
															<Banknote
																className="size-3.5 shrink-0 opacity-80"
																aria-hidden
															/>
															{formatCurrencyMxn(row.transferAmount)}
														</span>
													) : null}
												</div>
											) : row.transferAmount !== null ? (
												<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
													<Banknote
														className="size-3.5 shrink-0 opacity-80"
														aria-hidden
													/>
													{formatCurrencyMxn(row.transferAmount)}
												</div>
											) : null}
											<div className="flex flex-wrap gap-4 pt-0.5">
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
														{t('global-search-link-credit', {
															id: row.creditId,
														})}
													</Link>
												) : null}
											</div>
										</div>
									</li>
								)
							})}
						</ul>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
