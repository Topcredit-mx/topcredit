'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { FormattedDate } from '~/components/formatted-date'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { ASSIGNABLE_ROLES } from '~/lib/user-rules'
import type { Role } from '~/server/auth/session'
import { toggleUserRole, updateUserCompanies } from '~/server/mutations'
import type { CompanyBasic, UserForTable } from '~/server/queries'

function RoleCheckbox({
	userId,
	role,
	hasRole,
	isCurrentUser,
}: {
	userId: number
	role: Role
	hasRole: boolean
	isCurrentUser: boolean
}) {
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)
	const roleLabels: Record<Role, string> = {
		applicant: t('users-role-applicant'),
		agent: t('users-role-agent'),
		requests: t('users-role-requests'),
		admin: t('users-role-admin'),
	}
	const roleLabel = roleLabels[role]

	const handleToggle = () => {
		// Show confirmation if admin is removing their own admin role
		if (isCurrentUser && role === 'admin' && hasRole) {
			setShowConfirmDialog(true)
			return
		}

		// Otherwise, proceed directly
		startTransition(async () => {
			await toggleUserRole(userId, role)
		})
	}

	const handleConfirmRemove = () => {
		setShowConfirmDialog(false)
		startTransition(async () => {
			await toggleUserRole(userId, role)
			// Redirect to unauthorized page since user just removed their own admin access
			router.push('/unauthorized')
		})
	}

	return (
		<>
			<div className="flex justify-center">
				{isPending ? (
					<Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" />
				) : (
					<Checkbox
						checked={hasRole}
						disabled={isPending}
						onCheckedChange={handleToggle}
						aria-label={`Toggle ${roleLabel} role`}
					/>
				)}
			</div>

			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('users-remove-admin-title')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('users-remove-admin-description')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmRemove}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{t('users-remove-admin-confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

function CompanyAssignmentCell({
	user,
	allCompanies,
	onUserCompaniesChange,
}: {
	user: UserForTable
	allCompanies: CompanyBasic[]
	onUserCompaniesChange: (userId: number, companyIds: number[]) => void
}) {
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const [isPending, startTransition] = useTransition()
	const [showDialog, setShowDialog] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(
		user.companies.map((c) => c.id),
	)

	const handleOpenDialog = () => {
		setError(null)
		setSelectedCompanyIds(user.companies.map((c) => c.id))
		setShowDialog(true)
	}

	const handleDialogOpenChange = (open: boolean) => {
		setShowDialog(open)
		if (!open) setError(null)
	}

	const handleToggleCompany = (companyId: number) => {
		setSelectedCompanyIds((prev) =>
			prev.includes(companyId)
				? prev.filter((id) => id !== companyId)
				: [...prev, companyId],
		)
	}

	const handleSave = () => {
		setError(null)
		startTransition(async () => {
			try {
				await updateUserCompanies(user.id, selectedCompanyIds)
				onUserCompaniesChange(user.id, selectedCompanyIds)
				setShowDialog(false)
			} catch (e) {
				const message =
					e instanceof Error ? e.message : 'No se pudieron guardar los cambios.'
				setError(message)
			}
		})
	}

	return (
		<>
			<div className="flex items-center gap-2">
				{user.companies.length === 0 ? (
					<span className="text-muted-foreground text-sm">
						{t('users-no-companies')}
					</span>
				) : user.companies.length === 1 ? (
					<Badge variant="secondary">
						{user.companies[0]?.name ?? 'Empresa'}
					</Badge>
				) : (
					<Badge variant="secondary">
						{t('users-companies-count', { count: user.companies.length })}
					</Badge>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onClick={handleOpenDialog}
					aria-label={t('users-assign-aria')}
				>
					<Building2 className="h-4 w-4" />
				</Button>
			</div>

			<Dialog open={showDialog} onOpenChange={handleDialogOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('users-assign-dialog-title')}</DialogTitle>
						<DialogDescription>
							{t('users-assign-dialog-description', { name: user.name })}
						</DialogDescription>
					</DialogHeader>

					{error && (
						<p
							role="alert"
							className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
						>
							{error}
						</p>
					)}

					<div className="max-h-[300px] space-y-3 overflow-y-auto py-4">
						{allCompanies.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								{t('users-assign-no-available')}
							</p>
						) : (
							allCompanies.map((company) => (
								<div key={company.id} className="flex items-center space-x-3">
									<Checkbox
										id={`company-${company.id}`}
										checked={selectedCompanyIds.includes(company.id)}
										onCheckedChange={() => handleToggleCompany(company.id)}
									/>
									<Label
										htmlFor={`company-${company.id}`}
										className="flex-1 cursor-pointer"
									>
										<div className="font-medium">{company.name}</div>
										<div className="text-muted-foreground text-sm">
											{company.domain}
										</div>
									</Label>
								</div>
							))
						)}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDialog(false)}
							disabled={isPending}
						>
							{tCommon('cancel')}
						</Button>
						<Button onClick={handleSave} disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t('users-saving')}
								</>
							) : (
								tCommon('save')
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

export function createColumns(
	currentUserId: number,
	allCompanies: CompanyBasic[],
	onUserCompaniesChange: (userId: number, companyIds: number[]) => void,
	t: ReturnType<typeof useTranslations<'admin'>>,
): ColumnDef<UserForTable, unknown>[] {
	const rolesToShow = ASSIGNABLE_ROLES
	const roleLabels: Record<Role, string> = {
		applicant: t('users-role-applicant'),
		agent: t('users-role-agent'),
		requests: t('users-role-requests'),
		admin: t('users-role-admin'),
	}

	return [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t('users-col-name')} />
			),
			cell: ({ row }) => {
				return <div className="font-medium">{row.getValue('name')}</div>
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t('users-col-email')} />
			),
			cell: ({ row }) => {
				return (
					<div className="text-muted-foreground">{row.getValue('email')}</div>
				)
			},
		},
		// Create a column for each role
		...rolesToShow.map(
			(role): ColumnDef<UserForTable> => ({
				id: `role_${role}`,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={roleLabels[role]} />
				),
				cell: ({ row }) => {
					const user = row.original
					const hasRole = user.roles.includes(role)
					const isCurrentUser = user.id === currentUserId

					return (
						<RoleCheckbox
							userId={user.id}
							role={role}
							hasRole={hasRole}
							isCurrentUser={isCurrentUser}
						/>
					)
				},
			}),
		),
		{
			id: 'companies',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('users-col-companies')}
				/>
			),
			cell: ({ row }) => {
				const user = row.original
				return (
					<CompanyAssignmentCell
						user={user}
						allCompanies={allCompanies}
						onUserCompaniesChange={onUserCompaniesChange}
					/>
				)
			},
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t('users-col-created')} />
			),
			cell: ({ row }) => {
				const date: string = row.getValue('createdAt')
				return (
					<div className="text-muted-foreground">
						<FormattedDate value={date} />
					</div>
				)
			},
		},
	]
}
