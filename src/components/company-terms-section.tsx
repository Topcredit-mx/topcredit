'use client'

import { CalendarClock, Loader2, Pencil, Plus, Timer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { formatApplicationTerm } from '~/app/equipo/(main)/applications/constants'
import {
	addCompanyTermAction,
	type CompanyTermFormState,
	toggleCompanyTermRowAction,
	updateCompanyTermRowAction,
} from '~/app/equipo/(main)/companies/company-term-actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'

export type CompanyTermRowInput = {
	id: number
	disabled: boolean
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

function termLabel(
	row: Pick<CompanyTermRowInput, 'duration' | 'durationType'>,
	tEquipo: (
		key: 'applications-term-months' | 'applications-term-fortnights',
	) => string,
) {
	return formatApplicationTerm(row, tEquipo)
}

function useRefreshOnTermSuccess(state: CompanyTermFormState) {
	const router = useRouter()
	useEffect(() => {
		if (state.success) {
			router.refresh()
		}
	}, [state.success, router])
}

function AddTermForm({
	companyId,
	employeeSalaryFrequency,
}: {
	companyId: number
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}) {
	const t = useTranslations('admin')
	const resolveError = useResolveValidationError()
	const durationId = useId()
	const initialState: CompanyTermFormState = {}
	const [state, action, pending] = useActionState(
		addCompanyTermAction,
		initialState,
	)
	useRefreshOnTermSuccess(state)

	const typeLabel =
		employeeSalaryFrequency === 'monthly'
			? t('company-form-frequency-monthly')
			: t('company-form-frequency-bi-monthly')

	return (
		<form action={action} className="space-y-4">
			<input type="hidden" name="companyId" value={companyId} />
			<AuthInlineError
				message={
					state.message && !state.errors ? resolveError(state.message) : null
				}
				align="start"
				className="px-0"
				minHeightClass="min-h-5"
			/>
			<FieldDescription>
				{t('company-terms-type-matches-payroll', { label: typeLabel })}
			</FieldDescription>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
				<Field className="min-w-0 flex-1">
					<FieldLabel htmlFor={durationId}>
						{t('company-terms-add-duration')}
					</FieldLabel>
					<Input
						id={durationId}
						name="duration"
						type="number"
						min={1}
						max={120}
						step={1}
						required
						aria-invalid={!!state.errors?.duration}
					/>
					{state.errors?.duration ? (
						<FieldError message={resolveError(state.errors.duration)} />
					) : null}
				</Field>
				<Button type="submit" disabled={pending}>
					{pending ? (
						<>
							<Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
							{t('company-terms-add-submitting')}
						</>
					) : (
						<>
							<Plus className="size-4 shrink-0" aria-hidden />
							{t('company-terms-add-submit')}
						</>
					)}
				</Button>
			</div>
			{state.errors?.companyId ? (
				<FieldError message={resolveError(state.errors.companyId)} />
			) : null}
		</form>
	)
}

function TermAvailabilityToggle({
	companyId,
	row,
}: {
	companyId: number
	row: CompanyTermRowInput
}) {
	const t = useTranslations('admin')
	const resolveError = useResolveValidationError()
	const initialState: CompanyTermFormState = {}
	const [state, action, pending] = useActionState(
		toggleCompanyTermRowAction,
		initialState,
	)
	useRefreshOnTermSuccess(state)
	const [available, setAvailable] = useState(!row.disabled)
	const formRef = useRef<HTMLFormElement>(null)

	useEffect(() => {
		setAvailable(!row.disabled)
	}, [row.disabled])

	return (
		<form ref={formRef} id={`term-toggle-form-${row.id}`} action={action}>
			<input type="hidden" name="companyId" value={companyId} />
			<input type="hidden" name="termOfferingId" value={row.id} />
			<input
				type="hidden"
				name="disabled"
				value={available ? 'false' : 'true'}
			/>
			<AuthInlineError
				message={
					state.message && !state.errors ? resolveError(state.message) : null
				}
				align="start"
				className="px-0"
				minHeightClass="min-h-5"
			/>
			<div className="flex items-center gap-2">
				{pending ? (
					<Loader2
						className="size-4 shrink-0 animate-spin text-muted-foreground"
						aria-hidden
					/>
				) : null}
				<Checkbox
					id={`term-available-${row.id}`}
					checked={available}
					disabled={pending}
					onCheckedChange={(checked) => {
						const next = checked === true
						setAvailable(next)
						const form = formRef.current
						if (!form) return
						const hidden = form.querySelector('input[name="disabled"]')
						if (hidden instanceof HTMLInputElement) {
							hidden.value = next ? 'false' : 'true'
						}
						form.requestSubmit()
					}}
				/>
				<Label
					htmlFor={`term-available-${row.id}`}
					className="cursor-pointer font-normal text-sm"
				>
					{t('company-terms-col-available')}
				</Label>
			</div>
		</form>
	)
}

function TermEditDialog({
	companyId,
	employeeSalaryFrequency,
	row,
}: {
	companyId: number
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	row: CompanyTermRowInput
}) {
	const t = useTranslations('admin')
	const tEquipo = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const durationId = useId()
	const [open, setOpen] = useState(false)
	const initialState: CompanyTermFormState = {}
	const [state, action, pending] = useActionState(
		updateCompanyTermRowAction,
		initialState,
	)
	const label = termLabel(row, tEquipo)
	useRefreshOnTermSuccess(state)

	const typeLabel =
		employeeSalaryFrequency === 'monthly'
			? t('company-form-frequency-monthly')
			: t('company-form-frequency-bi-monthly')

	useEffect(() => {
		if (state.success) {
			setOpen(false)
		}
	}, [state.success])

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm">
					<Pencil className="size-4 shrink-0" aria-hidden />
					{t('company-terms-edit-open')}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('company-terms-edit-title')}</DialogTitle>
				</DialogHeader>
				<form action={action} className="space-y-4">
					<input type="hidden" name="companyId" value={companyId} />
					<input type="hidden" name="termOfferingId" value={row.id} />
					<input
						type="hidden"
						name="durationType"
						value={employeeSalaryFrequency}
					/>
					<p className="text-muted-foreground text-sm">
						{t('company-terms-edit-current')}: {label}
					</p>
					<FieldDescription>
						{t('company-terms-type-matches-payroll', { label: typeLabel })}
					</FieldDescription>
					<AuthInlineError
						message={
							state.message && !state.errors
								? resolveError(state.message)
								: null
						}
						align="start"
						className="px-0"
						minHeightClass="min-h-5"
					/>
					<Field>
						<FieldLabel htmlFor={durationId}>
							{t('company-terms-add-duration')}
						</FieldLabel>
						<Input
							id={durationId}
							name="duration"
							type="number"
							min={1}
							max={120}
							step={1}
							required
							defaultValue={row.duration}
							aria-invalid={!!state.errors?.duration}
						/>
						{state.errors?.duration ? (
							<FieldError message={resolveError(state.errors.duration)} />
						) : null}
					</Field>
					<DialogFooter>
						<Button type="submit" disabled={pending}>
							{pending ? (
								<>
									<Loader2
										className="size-4 shrink-0 animate-spin"
										aria-hidden
									/>
									{t('company-terms-edit-saving')}
								</>
							) : (
								<>
									<Pencil className="size-4 shrink-0" aria-hidden />
									{t('company-terms-edit-save')}
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function TermRowCard({
	companyId,
	employeeSalaryFrequency,
	row,
}: {
	companyId: number
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	row: CompanyTermRowInput
}) {
	const tEquipo = useTranslations('equipo')
	const label = termLabel(row, tEquipo)

	return (
		<li className="flex flex-col gap-4 rounded-lg border p-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Timer
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					<span className="font-medium">{label}</span>
				</div>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
					<TermAvailabilityToggle companyId={companyId} row={row} />
					<TermEditDialog
						companyId={companyId}
						employeeSalaryFrequency={employeeSalaryFrequency}
						row={row}
					/>
				</div>
			</div>
		</li>
	)
}

export function CompanyTermsSection({
	companyId,
	employeeSalaryFrequency,
	rows,
}: {
	companyId: number
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	rows: readonly CompanyTermRowInput[]
}) {
	const t = useTranslations('admin')
	const sectionId = useId()

	const addFormKey = rows
		.map((r) => `${r.id}-${r.duration}-${r.durationType}-${r.disabled}`)
		.join('|')

	return (
		<section className="space-y-4 border-t pt-6" aria-labelledby={sectionId}>
			<h2
				id={sectionId}
				className="flex items-center gap-2 font-semibold text-base"
			>
				<CalendarClock
					className="size-5 shrink-0 text-muted-foreground"
					aria-hidden
				/>
				{t('company-terms-title')}
			</h2>
			<p className="text-muted-foreground text-sm">
				{t('company-terms-description')}
			</p>
			{rows.length > 0 ? (
				<ul className="space-y-4">
					{rows.map((row) => (
						<TermRowCard
							key={row.id}
							companyId={companyId}
							employeeSalaryFrequency={employeeSalaryFrequency}
							row={row}
						/>
					))}
				</ul>
			) : (
				<p className="text-muted-foreground text-sm">
					{t('company-terms-empty')}
				</p>
			)}
			<div className="space-y-4 rounded-lg border p-4">
				<h3 className="flex items-center gap-2 font-medium text-sm">
					<Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
					{t('company-terms-add-heading')}
				</h3>
				<AddTermForm
					key={addFormKey}
					companyId={companyId}
					employeeSalaryFrequency={employeeSalaryFrequency}
				/>
			</div>
		</section>
	)
}
