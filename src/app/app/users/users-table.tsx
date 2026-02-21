'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { CompanyBasic, UserWithRoles } from '~/server/queries'
import { createColumns } from './columns'

interface UsersTableProps {
	users: UserWithRoles[]
	currentUserId: number
	allCompanies: CompanyBasic[]
}

export function UsersTable({
	users: initialUsers,
	currentUserId,
	allCompanies,
}: UsersTableProps) {
	const t = useTranslations('admin')
	const [users, setUsers] = useState(initialUsers)

	useEffect(() => {
		setUsers(initialUsers)
	}, [initialUsers])

	const onUserCompaniesChange = (userId: number, companyIds: number[]) => {
		const companies = companyIds
			.map((id) => allCompanies.find((c) => c.id === id))
			.filter((c): c is CompanyBasic => c != null)
		setUsers((prev) =>
			prev.map((u) => (u.id === userId ? { ...u, companies } : u)),
		)
	}

	const columns = createColumns(
		currentUserId,
		allCompanies,
		onUserCompaniesChange,
		t,
	)

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={users}
				schema="users"
				label={t('users-title')}
				filterPlaceholder={t('table-filter-users')}
			>
				<DataTableHeader disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
