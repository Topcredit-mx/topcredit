'use client'

import { Ban, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import { ValidationCode } from '~/lib/validation-codes'
import type { CreditStatus } from '~/server/db/schema'
import {
	defaultCreditFromCreditDetailAction,
	restoreCreditFromDefaultAction,
} from './actions'

type CreditAdminDangerZoneProps = {
	creditId: number
	creditStatus: CreditStatus
}

export function CreditAdminDangerZone({
	creditId,
	creditStatus,
}: CreditAdminDangerZoneProps) {
	const t = useTranslations('equipo')
	const resolveValidationError = useResolveValidationError()
	const router = useRouter()

	const [defaultOpen, setDefaultOpen] = useState(false)
	const [defaultPending, setDefaultPending] = useState(false)
	const [restoreOpen, setRestoreOpen] = useState(false)
	const [restorePending, setRestorePending] = useState(false)

	const onDefaultConfirm = async () => {
		setDefaultPending(true)
		try {
			const result = await defaultCreditFromCreditDetailAction(creditId)
			if (result?.error != null) {
				toast.error(resolveValidationError(result.error))
				setDefaultOpen(false)
				return
			}
			toast.success(t('credit-detail-default-success'))
			setDefaultOpen(false)
			router.refresh()
		} catch {
			toast.error(
				resolveValidationError(ValidationCode.APPLICATIONS_ERROR_GENERIC),
			)
			setDefaultOpen(false)
		} finally {
			setDefaultPending(false)
		}
	}

	const onRestoreConfirm = async () => {
		setRestorePending(true)
		try {
			const result = await restoreCreditFromDefaultAction(creditId)
			if (result?.error != null) {
				toast.error(resolveValidationError(result.error))
				setRestoreOpen(false)
				return
			}
			toast.success(t('credit-detail-restore-success'))
			setRestoreOpen(false)
			router.refresh()
		} catch {
			toast.error(
				resolveValidationError(ValidationCode.APPLICATIONS_ERROR_GENERIC),
			)
			setRestoreOpen(false)
		} finally {
			setRestorePending(false)
		}
	}

	return (
		<Card
			aria-labelledby="equipo-credit-danger-zone-title"
			className="border-destructive/40 bg-destructive/5"
		>
			<CardHeader className="pb-2">
				<CardTitle asChild className="text-base text-destructive">
					<h2 id="equipo-credit-danger-zone-title">
						{t('credit-detail-danger-zone-title')}
					</h2>
				</CardTitle>
				<CardDescription className="text-muted-foreground">
					{t('credit-detail-danger-zone-description')}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				{creditStatus === 'dispersed' ? (
					<AlertDialog open={defaultOpen} onOpenChange={setDefaultOpen}>
						<AlertDialogTrigger asChild>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								className="w-fit"
							>
								<Ban className="size-4" aria-hidden />
								{t('credit-detail-default-action')}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{t('credit-detail-default-dialog-title')}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{t('credit-detail-default-dialog-description')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={defaultPending}>
									{t('credit-detail-default-dialog-cancel')}
								</AlertDialogCancel>
								<AlertDialogAction
									disabled={defaultPending}
									onClick={(e) => {
										e.preventDefault()
										void onDefaultConfirm()
									}}
								>
									{defaultPending
										? t('credit-detail-default-dialog-confirming')
										: t('credit-detail-default-dialog-confirm')}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				) : null}
				{creditStatus === 'defaulted' ? (
					<AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
						<AlertDialogTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="w-fit border-destructive/50 text-destructive hover:bg-destructive/10"
							>
								<RotateCcw className="size-4" aria-hidden />
								{t('credit-detail-restore-action')}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{t('credit-detail-restore-dialog-title')}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{t('credit-detail-restore-dialog-description')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={restorePending}>
									{t('credit-detail-default-dialog-cancel')}
								</AlertDialogCancel>
								<AlertDialogAction
									disabled={restorePending}
									onClick={(e) => {
										e.preventDefault()
										void onRestoreConfirm()
									}}
								>
									{restorePending
										? t('credit-detail-restore-dialog-confirming')
										: t('credit-detail-restore-dialog-confirm')}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				) : null}
			</CardContent>
		</Card>
	)
}
