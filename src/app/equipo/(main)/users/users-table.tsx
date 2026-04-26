'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
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
import {
	buildUsersListUrl,
	firstParamFromSearchParams,
	USERS_LIST_DEFAULT_PAGE_SIZE,
	USERS_LIST_MAX_PAGE_SIZE,
} from './users-list-params'

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
		() => firstParamFromSearchParams(searchParams.get('search')),
		[searchParams],
	)

	const [users, setUsers] = useState(initialUsers)
	const [searchInput, setSearchInput] = useState(urlSearch)
	const searchInputRef = useRef(searchInput)
	searchInputRef.current = searchInput

	useEffect(() => {
		setUsers(initialUsers)
	}, [initialUsers])

	useEffect(() => {
		setSearchInput(urlSearch)
	}, [urlSearch])

	const replaceListUrl = useCallback(
		(next: { page: number; limit: number; search: string }) => {
			const href = buildUsersListUrl(pathname, next)
			startTransition(() => {
				router.replace(href, { scroll: false })
			})
		},
		[pathname, router],
	)

	// Re-run on each keystroke to reset the debounce timer; ref holds latest value at fire time.
	// biome-ignore lint/correctness/useExhaustiveDependencies: searchInput intentionally resets debounce
	useEffect(() => {
		const handle = window.setTimeout(() => {
			const trimmed = searchInputRef.current.trim()
			const urlTrimmed = urlSearch.trim()
			if (trimmed === urlTrimmed) return
			replaceListUrl({ page: 1, limit, search: searchInputRef.current })
		}, 300)
		return () => window.clearTimeout(handle)
	}, [searchInput, limit, replaceListUrl, urlSearch])

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
				nextSize >= 1 && nextSize <= USERS_LIST_MAX_PAGE_SIZE
					? nextSize
					: USERS_LIST_DEFAULT_PAGE_SIZE
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
					emptyMessage={showEmpty ? t('users-empty') : undefined}
				>
					<DataTableHeader disableCreateButton />
					<DataTableContent />
					<DataTablePagination />
				</DataTable>
			</div>
		</div>
	)
}
