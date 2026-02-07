'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
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
import type { Role } from '~/lib/auth-utils'
import type { CompanyBasic, UserWithRoles } from '~/server/queries'
import { toggleUserRole, updateUserCompanies } from '~/server/mutations'

const roleLabels: Record<Role, string> = {
	customer: 'Cliente',
	employee: 'Empleado',
	requests: 'Solicitudes',
	admin: 'Admin',
}

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
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)

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
						aria-label={`Toggle ${roleLabels[role]} role`}
					/>
				)}
			</div>

			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							¿Eliminar tu rol de administrador?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Estás a punto de eliminar tu propio rol de administrador. Perderás
							acceso a esta página y a otras funciones administrativas. Esta
							acción no se puede deshacer fácilmente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmRemove}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Sí, eliminar mi rol de admin
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
}: {
	user: UserWithRoles
	allCompanies: CompanyBasic[]
}) {
	const [isPending, startTransition] = useTransition()
	const [showDialog, setShowDialog] = useState(false)
	const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(
		user.companies.map((c) => c.id),
	)

	const handleOpenDialog = () => {
		// Reset selection to current assignments when opening
		setSelectedCompanyIds(user.companies.map((c) => c.id))
		setShowDialog(true)
	}

	const handleToggleCompany = (companyId: number) => {
		setSelectedCompanyIds((prev) =>
			prev.includes(companyId)
				? prev.filter((id) => id !== companyId)
				: [...prev, companyId],
		)
	}

	const handleSave = () => {
		startTransition(async () => {
			await updateUserCompanies(user.id, selectedCompanyIds)
			setShowDialog(false)
		})
	}

	return (
		<>
			<div className="flex items-center gap-2">
				{user.companies.length === 0 ? (
					<span className="text-muted-foreground text-sm">Sin empresas</span>
				) : user.companies.length === 1 ? (
					<Badge variant="secondary">{user.companies[0]?.name ?? 'Empresa'}</Badge>
				) : (
					<Badge variant="secondary">{user.companies.length} empresas</Badge>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onClick={handleOpenDialog}
					aria-label="Asignar empresas"
				>
					<Building2 className="h-4 w-4" />
				</Button>
			</div>

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Asignar Empresas</DialogTitle>
						<DialogDescription>
							Selecciona las empresas que {user.name} puede administrar.
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-[300px] space-y-3 overflow-y-auto py-4">
						{allCompanies.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No hay empresas disponibles.
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
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Guardando...
								</>
							) : (
								'Guardar'
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
): ColumnDef<UserWithRoles>[] {
	// Only show employee roles (not customer)
	const rolesToShow: Role[] = ['requests', 'admin']

	return [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Nombre" />
			),
			cell: ({ row }) => {
				return <div className="font-medium">{row.getValue('name')}</div>
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Email" />
			),
			cell: ({ row }) => {
				return (
					<div className="text-muted-foreground">{row.getValue('email')}</div>
				)
			},
		},
		// Create a column for each role
		...rolesToShow.map(
			(role): ColumnDef<UserWithRoles> => ({
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
				<DataTableColumnHeader column={column} title="Empresas" />
			),
			cell: ({ row }) => {
				const user = row.original
				return (
					<CompanyAssignmentCell user={user} allCompanies={allCompanies} />
				)
			},
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fecha de Creación" />
			),
			cell: ({ row }) => {
				const date = row.getValue('createdAt') as Date
				return (
					<div className="text-muted-foreground">
						{new Date(date).toLocaleDateString('es-MX', {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
						})}
					</div>
				)
			},
		},
	]
}
