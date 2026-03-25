'use client'

import { Banknote, CheckCircle2, ChevronDown, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useRef, useState } from 'react'
import {
	updateApplicationStatusFormAction,
	updateApplicationStatusWithReasonFormAction,
} from '~/app/equipo/(main)/applications/actions'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import { ApplicationReasonDialog } from './application-reason-dialog'
import {
	PreAuthorizeApplicationDialog,
	type TermOfferingOption,
} from './pre-authorize-application-form'

const initialState = { error: '' }

export function ApplicationActions({
	applicationId,
	isAdmin,
	canApprove,
	canAuthorize,
	authorizationPackageFullyApproved,
	canPreAuthorize,
	canDeny,
	preAuthorizeDialogProps,
}: {
	applicationId: number
	isAdmin: boolean
	canApprove: boolean
	canAuthorize: boolean
	authorizationPackageFullyApproved: boolean
	canPreAuthorize: boolean
	canDeny: boolean
	preAuthorizeDialogProps?: {
		initialCreditAmount: string | null
		initialTermOfferingId: number | null
		termOfferings: TermOfferingOption[]
		salaryAtApplication: string
		salaryFrequency: 'monthly' | 'bi-monthly'
		companyRate: string
		companyBorrowingCapacityRate: string | null
	}
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [state, action, pending] = useActionState(
		updateApplicationStatusFormAction,
		initialState,
	)
	const [stateReason, actionReason, pendingReason] = useActionState(
		updateApplicationStatusWithReasonFormAction,
		initialState,
	)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [preAuthorizeDialogOpen, setPreAuthorizeDialogOpen] = useState(false)
	const immediateFormRef = useRef<HTMLFormElement>(null)
	const statusInputRef = useRef<HTMLInputElement>(null)

	const translatedError = getResolvedError(state, resolveError, {
		treatEmptyAsNone: true,
	})

	const authorizeBlockedByPackage =
		canAuthorize && !authorizationPackageFullyApproved

	function submitImmediateStatus(status: string) {
		const statusInput = statusInputRef.current
		const form = immediateFormRef.current
		if (statusInput && form) {
			statusInput.value = status
			form.requestSubmit()
		}
	}

	return (
		<div className="flex flex-col gap-2">
			{translatedError && <Alert variant="banner" message={translatedError} />}
			{authorizeBlockedByPackage ? (
				<p className="max-w-md text-muted-foreground text-xs leading-relaxed">
					{t('applications-authorize-package-incomplete-hint')}
				</p>
			) : null}
			<div className="flex flex-wrap items-center gap-2">
				<form
					ref={immediateFormRef}
					action={action}
					className="hidden"
					aria-hidden
				>
					<input type="hidden" name="applicationId" value={applicationId} />
					<input ref={statusInputRef} type="hidden" name="status" value="" />
					<button type="submit" />
				</form>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="default"
							size="sm"
							disabled={pending || pendingReason}
							className="gap-2"
							data-equipo-application-primary-actions="trigger"
						>
							{t('applications-actions')}
							<ChevronDown className="size-4 opacity-70" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="min-w-48">
						{canApprove && (
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
									submitImmediateStatus('approved')
								}}
								disabled={pending || pendingReason}
							>
								<CheckCircle2 className="size-4" />
								{t('applications-action-approve')}
							</DropdownMenuItem>
						)}
						{canAuthorize &&
							(authorizeBlockedByPackage ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<span
											className="inline-flex w-full cursor-default"
											data-authorize-menu-item="blocked"
										>
											<DropdownMenuItem
												onSelect={(e) => {
													e.preventDefault()
												}}
												disabled
												aria-disabled
											>
												<CheckCircle2 className="size-4" />
												{t('applications-action-authorize')}
											</DropdownMenuItem>
										</span>
									</TooltipTrigger>
									<TooltipContent side="left" className="max-w-xs">
										{t('applications-authorize-package-incomplete-hint')}
									</TooltipContent>
								</Tooltip>
							) : (
								<DropdownMenuItem
									data-authorize-menu-item="ready"
									onSelect={(e) => {
										e.preventDefault()
										submitImmediateStatus('authorized')
									}}
									disabled={pending || pendingReason}
								>
									<CheckCircle2 className="size-4" />
									{t('applications-action-authorize')}
								</DropdownMenuItem>
							))}
						{canPreAuthorize && preAuthorizeDialogProps ? (
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
									setPreAuthorizeDialogOpen(true)
								}}
								disabled={pending || pendingReason}
							>
								<Banknote className="size-4" />
								{t('applications-action-pre-authorize')}
							</DropdownMenuItem>
						) : null}
						{canDeny && (
							<DropdownMenuItem
								variant="destructive"
								onSelect={(e) => {
									e.preventDefault()
									setDialogOpen(true)
								}}
								disabled={pending || pendingReason}
							>
								<XCircle className="size-4" />
								{t('applications-action-reject')}
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>

				<ApplicationReasonDialog
					open={dialogOpen}
					action={dialogOpen ? 'denied' : null}
					applicationId={applicationId}
					formAction={actionReason}
					formState={stateReason}
					pending={pendingReason}
					onClose={() => setDialogOpen(false)}
					translateError={resolveError}
				/>
				{preAuthorizeDialogProps ? (
					<PreAuthorizeApplicationDialog
						open={preAuthorizeDialogOpen}
						onOpenChange={setPreAuthorizeDialogOpen}
						applicationId={applicationId}
						initialCreditAmount={preAuthorizeDialogProps.initialCreditAmount}
						initialTermOfferingId={
							preAuthorizeDialogProps.initialTermOfferingId
						}
						termOfferings={preAuthorizeDialogProps.termOfferings}
						isAdmin={isAdmin}
						salaryAtApplication={preAuthorizeDialogProps.salaryAtApplication}
						salaryFrequency={preAuthorizeDialogProps.salaryFrequency}
						companyRate={preAuthorizeDialogProps.companyRate}
						companyBorrowingCapacityRate={
							preAuthorizeDialogProps.companyBorrowingCapacityRate
						}
					/>
				) : null}
			</div>
		</div>
	)
}
