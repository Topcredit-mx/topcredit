'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from 'react'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { CompanyBasic, UserForTable } from '~/server/queries'
import { createColumns } from './columns'

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

function firstParam(value: string | string[] | null | undefined): string {
	if (value == null) return ''
	return typeof value === 'string' ? value : (value[0] ?? '')
}

function buildUsersListPath(
	pathname: string,
	next: { page: number; limit: number; search: string },
): string {
	const params = new URLSearchParams()
	if (next.page > 1) params.set('page', String(next.page))
	if (next.limit !== DEFAULT_PAGE_SIZE) params.set('limit', String(next.limit))
	const trimmed = next.search.trim()
	if (trimmed.length > 0) params.set('search', trimmed)
	const qs = params.toString()
	return qs.length > 0 ? `${pathname}?${qs}` : pathname
}

interface UsersTableProps {
	users: UserForTable[]
	total: number
	page: number
	limit: number
	totalPages: number
	currentUserId: number
	allCompanies: CompanyBasic[]
}

export function UsersTable({
	users: initialUsers,
	total,
	page,
	limit,
	totalPages,
	currentUserId,
	allCompanies,
}: UsersTableProps) {
	const t = useTranslations('admin')
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()

	const urlSearch = useMemo(
		() => firstParam(searchParams.get('search')),
		[searchParams],
	)

	const [users, setUsers] = useState(initialUsers)
	const [searchInput, setSearchInput] = useState(urlSearch)
	const deferredSearch = useDeferredValue(searchInput)

	useEffect(() => {
		setUsers(initialUsers)
	}, [initialUsers])

	useEffect(() => {
		setSearchInput(urlSearch)
	}, [urlSearch])

	const replaceListUrl = useCallback(
		(next: { page: number; limit: number; search: string }) => {
			const href = buildUsersListPath(pathname, next)
			startTransition(() => {
				router.replace(href, { scroll: false })
			})
		},
		[pathname, router],
	)

	useEffect(() => {
		const handle = window.setTimeout(() => {
			const trimmed = deferredSearch.trim()
			const urlTrimmed = urlSearch.trim()
			if (trimmed === urlTrimmed) return
			replaceListUrl({ page: 1, limit, search: deferredSearch })
		}, 300)
		return () => window.clearTimeout(handle)
	}, [deferredSearch, limit, replaceListUrl, urlSearch])

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

	const pageIndex = page - 1
	const pageCountForTable = total === 0 ? 1 : Math.max(totalPages, 1)

	const serverPagination = {
		pageIndex,
		pageCount: pageCountForTable,
		pageSize: limit,
		totalRowCount: total,
		onPageChange: (nextIndex: number) => {
			replaceListUrl({
				page: nextIndex + 1,
				limit,
				search: urlSearch,
			})
		},
		onPageSizeChange: (nextSize: number) => {
			const coerced =
				nextSize >= 1 && nextSize <= MAX_PAGE_SIZE
					? nextSize
					: DEFAULT_PAGE_SIZE
			replaceListUrl({ page: 1, limit: coerced, search: urlSearch })
		},
	}

	const serverSearch = {
		value: searchInput,
		onChange: setSearchInput,
	}

	const showEmpty = !isPending && users.length === 0
	const tableData = showEmpty ? [] : users

	return (
		<div className="space-y-4">
			<div
				className={isPending ? 'opacity-60 transition-opacity' : undefined}
				aria-busy={isPending || undefined}
			>
				<DataTable<UserForTable, unknown>
					columns={columns}
					data={tableData}
					schema="users"
					label={t('users-title')}
					filterPlaceholder={t('table-filter-users')}
					serverPagination={serverPagination}
					serverSearch={serverSearch}
				>
					<DataTableHeader disableCreateButton />
					{showEmpty ? (
						<p className="rounded-md border py-12 text-center text-muted-foreground text-sm">
							{t('users-empty')}
						</p>
					) : (
						<DataTableContent />
					)}
					{showEmpty ? null : <DataTablePagination />}
				</DataTable>
			</div>
		</div>
	)
}
