'use client'

import { Banknote, ChevronDown, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'
import { updateApplicationStatusWithReasonFormAction } from '~/app/equipo/(main)/applications/actions'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import { ApplicationReasonDialog } from './application-reason-dialog'
import {
	PreAuthorizeApplicationDialog,
	type TermOfferingOption,
} from './pre-authorize-application-form'

const initialState = { error: '' }

export function ApplicationActions({
	applicationId,
	isAdmin,
	canPreAuthorize,
	canDeny,
	preAuthorizeDialogProps,
}: {
	applicationId: number
	isAdmin: boolean
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
	const [stateReason, actionReason, pendingReason] = useActionState(
		updateApplicationStatusWithReasonFormAction,
		initialState,
	)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [preAuthorizeDialogOpen, setPreAuthorizeDialogOpen] = useState(false)

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="default"
							size="sm"
							disabled={pendingReason}
							className="gap-2"
							aria-haspopup="menu"
						>
							{t('applications-actions')}
							<ChevronDown className="size-4 opacity-70" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="min-w-48">
						{canPreAuthorize && preAuthorizeDialogProps ? (
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
									setPreAuthorizeDialogOpen(true)
								}}
								disabled={pendingReason}
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
								disabled={pendingReason}
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
