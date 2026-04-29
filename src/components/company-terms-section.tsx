'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useState } from 'react'
import { formatApplicationTerm } from '~/app/equipo/(main)/applications/constants'
import {
	addCompanyTermAction,
	type CompanyTermFormState,
	toggleCompanyTermRowAction,
	updateCompanyTermRowAction,
} from '~/app/equipo/(main)/companies/company-term-actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
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

function AddTermForm({ companyId }: { companyId: number }) {
	const t = useTranslations('admin')
	const resolveError = useResolveValidationError()
	const durationId = useId()
	const durationTypeId = useId()
	const [durationType, setDurationType] = useState<'monthly' | 'bi-monthly'>(
		'monthly',
	)
	const initialState: CompanyTermFormState = {}
	const [state, action, pending] = useActionState(
		addCompanyTermAction,
		initialState,
	)
	useRefreshOnTermSuccess(state)

	return (
		<form action={action} className="space-y-4">
			<input type="hidden" name="companyId" value={companyId} />
			<input type="hidden" name="durationType" value={durationType} />
			<AuthInlineError
				message={
					state.message && !state.errors ? resolveError(state.message) : null
				}
				align="start"
				className="px-0"
				minHeightClass="min-h-5"
			/>
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
				<Field className="w-full sm:w-48">
					<FieldLabel htmlFor={durationTypeId}>
						{t('company-terms-add-type')}
					</FieldLabel>
					<Select
						value={durationType}
						onValueChange={(v: 'monthly' | 'bi-monthly') => setDurationType(v)}
					>
						<SelectTrigger id={durationTypeId}>
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
				<Button type="submit" disabled={pending}>
					{pending
						? t('company-terms-add-submitting')
						: t('company-terms-add-submit')}
				</Button>
			</div>
			{state.errors?.durationType ? (
				<FieldError message={resolveError(state.errors.durationType)} />
			) : null}
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

	useEffect(() => {
		setAvailable(!row.disabled)
	}, [row.disabled])

	return (
		<form id={`term-toggle-form-${row.id}`} action={action}>
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
				<Checkbox
					id={`term-available-${row.id}`}
					checked={available}
					disabled={pending}
					onCheckedChange={(checked) => {
						const next = checked === true
						setAvailable(next)
						const form = document.getElementById(
							`term-toggle-form-${row.id}`,
						) as HTMLFormElement | null
						if (!form) return
						const hidden = form.querySelector(
							'input[name="disabled"]',
						) as HTMLInputElement | null
						if (hidden) {
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
	row,
}: {
	companyId: number
	row: CompanyTermRowInput
}) {
	const t = useTranslations('admin')
	const tEquipo = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const durationId = useId()
	const durationTypeId = useId()
	const [open, setOpen] = useState(false)
	const [durationType, setDurationType] = useState(row.durationType)
	const initialState: CompanyTermFormState = {}
	const [state, action, pending] = useActionState(
		updateCompanyTermRowAction,
		initialState,
	)
	const label = termLabel(row, tEquipo)
	useRefreshOnTermSuccess(state)

	useEffect(() => {
		if (state.success) {
			setOpen(false)
		}
	}, [state.success])

	useEffect(() => {
		if (open) {
			setDurationType(row.durationType)
		}
	}, [open, row.durationType])

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm">
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
					<input type="hidden" name="durationType" value={durationType} />
					<p className="text-muted-foreground text-sm">
						{t('company-terms-edit-current')}: {label}
					</p>
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
					<Field>
						<FieldLabel htmlFor={durationTypeId}>
							{t('company-terms-add-type')}
						</FieldLabel>
						<Select
							value={durationType}
							onValueChange={(v: 'monthly' | 'bi-monthly') =>
								setDurationType(v)
							}
						>
							<SelectTrigger id={durationTypeId}>
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
					<DialogFooter>
						<Button type="submit" disabled={pending}>
							{pending
								? t('company-terms-edit-saving')
								: t('company-terms-edit-save')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function TermRowInner({
	companyId,
	row,
}: {
	companyId: number
	row: CompanyTermRowInput
}) {
	const tEquipo = useTranslations('equipo')
	const label = termLabel(row, tEquipo)

	return (
		<>
			<TableCell className="font-medium">{label}</TableCell>
			<TableCell>
				<TermAvailabilityToggle companyId={companyId} row={row} />
			</TableCell>
			<TableCell className="text-right">
				<TermEditDialog companyId={companyId} row={row} />
			</TableCell>
		</>
	)
}

export function CompanyTermsSection({
	companyId,
	rows,
}: {
	companyId: number
	rows: readonly CompanyTermRowInput[]
}) {
	const t = useTranslations('admin')

	return (
		<Card className="mt-8">
			<CardHeader>
				<CardTitle asChild>
					<h2>{t('company-terms-title')}</h2>
				</CardTitle>
				<CardDescription>{t('company-terms-description')}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{rows.length > 0 ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('company-terms-col-term')}</TableHead>
								<TableHead>{t('company-terms-col-available')}</TableHead>
								<TableHead className="text-right">
									{t('company-terms-col-actions')}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row) => (
								<TableRow key={row.id}>
									<TermRowInner companyId={companyId} row={row} />
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<p className="text-muted-foreground text-sm">
						{t('company-terms-empty')}
					</p>
				)}
				<div className="border-t pt-6">
					<h3 className="mb-3 font-medium text-sm">
						{t('company-terms-add-heading')}
					</h3>
					<AddTermForm
						key={rows
							.map(
								(r) => `${r.id}-${r.duration}-${r.durationType}-${r.disabled}`,
							)
							.join('|')}
						companyId={companyId}
					/>
				</div>
			</CardContent>
		</Card>
	)
}
