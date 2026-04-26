'use client'

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
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import { ValidationCode } from '~/lib/validation-codes'
import { defaultCreditFromCreditDetailAction } from './actions'

type CreditDefaultAdminButtonProps = {
	creditId: number
}

export function CreditDefaultAdminButton({
	creditId,
}: CreditDefaultAdminButtonProps) {
	const t = useTranslations('equipo')
	const resolveValidationError = useResolveValidationError()
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [pending, setPending] = useState(false)

	const onConfirm = async () => {
		setPending(true)
		try {
			const result = await defaultCreditFromCreditDetailAction(creditId)
			if (result?.error != null) {
				toast.error(resolveValidationError(result.error))
				setOpen(false)
				return
			}
			toast.success(t('credit-detail-default-success'))
			setOpen(false)
			router.refresh()
		} catch {
			toast.error(
				resolveValidationError(ValidationCode.APPLICATIONS_ERROR_GENERIC),
			)
			setOpen(false)
		} finally {
			setPending(false)
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button type="button" variant="destructive" size="sm">
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
					<AlertDialogCancel disabled={pending}>
						{t('credit-detail-default-dialog-cancel')}
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={pending}
						onClick={(e) => {
							e.preventDefault()
							void onConfirm()
						}}
					>
						{pending
							? t('credit-detail-default-dialog-confirming')
							: t('credit-detail-default-dialog-confirm')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
