'use client'

import { CalendarClock, Plus, Timer, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useMemo, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Field, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'

type TermRow = {
	key: string
	duration: string
	durationType: 'monthly' | 'bi-monthly'
}

function newRow(): TermRow {
	return {
		key: crypto.randomUUID(),
		duration: '',
		durationType: 'monthly',
	}
}

export function CompanyCreateTermsFields() {
	const t = useTranslations('admin')
	const sectionId = useId()
	const [rows, setRows] = useState<TermRow[]>([])

	const payload = useMemo(() => {
		const list: { duration: number; durationType: 'monthly' | 'bi-monthly' }[] =
			[]
		for (const row of rows) {
			const trimmed = row.duration.trim()
			if (trimmed === '') continue
			const n = Number.parseInt(trimmed, 10)
			if (Number.isNaN(n) || n < 1 || n > 120) continue
			list.push({ duration: n, durationType: row.durationType })
		}
		return list
	}, [rows])

	return (
		<section className="space-y-4 border-t pt-6" aria-labelledby={sectionId}>
			<input
				type="hidden"
				name="initialTermsJson"
				value={JSON.stringify(payload)}
			/>
			<h2
				id={sectionId}
				className="flex items-center gap-2 font-semibold text-base"
			>
				<CalendarClock
					className="size-5 shrink-0 text-muted-foreground"
					aria-hidden
				/>
				{t('company-create-terms-title')}
			</h2>
			<p className="text-muted-foreground text-sm">
				{t('company-create-terms-description')}
			</p>
			{rows.length === 0 ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setRows([newRow()])}
				>
					<Plus className="size-4 shrink-0" aria-hidden />
					{t('company-create-terms-add-first')}
				</Button>
			) : (
				<ul className="space-y-4">
					{rows.map((row, index) => {
						const durId = `${row.key}-dur`
						const typeId = `${row.key}-type`
						return (
							<li
								key={row.key}
								className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end"
							>
								<div className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground text-sm">
									<Timer className="size-4 shrink-0" aria-hidden />
									<span>
										{t('company-create-terms-row-label', { n: index + 1 })}
									</span>
								</div>
								<Field className="min-w-0 flex-1 sm:max-w-[12rem]">
									<FieldLabel htmlFor={durId}>
										{t('company-terms-add-duration')}
									</FieldLabel>
									<Input
										id={durId}
										inputMode="numeric"
										value={row.duration}
										onChange={(e) => {
											const v = e.target.value
											setRows((prev) =>
												prev.map((r) =>
													r.key === row.key ? { ...r, duration: v } : r,
												),
											)
										}}
										placeholder="12"
									/>
								</Field>
								<Field className="w-full sm:w-44">
									<FieldLabel htmlFor={typeId}>
										{t('company-terms-add-type')}
									</FieldLabel>
									<Select
										value={row.durationType}
										onValueChange={(v: 'monthly' | 'bi-monthly') => {
											setRows((prev) =>
												prev.map((r) =>
													r.key === row.key ? { ...r, durationType: v } : r,
												),
											)
										}}
									>
										<SelectTrigger id={typeId}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="monthly">
												{t('company-form-frequency-monthly')}
											</SelectItem>
											<SelectItem value="bi-monthly">
												{t('company-form-frequency-bi-monthly')}
											</SelectItem>
										</SelectContent>
									</Select>
								</Field>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="shrink-0 text-muted-foreground hover:text-destructive"
									onClick={() =>
										setRows((prev) => prev.filter((r) => r.key !== row.key))
									}
									aria-label={t('company-create-terms-remove-row')}
								>
									<Trash2 className="size-4" aria-hidden />
								</Button>
							</li>
						)
					})}
					<li>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setRows((prev) => [...prev, newRow()])}
						>
							<Plus className="size-4 shrink-0" aria-hidden />
							{t('company-create-terms-add-another')}
						</Button>
					</li>
				</ul>
			)}
		</section>
	)
}
