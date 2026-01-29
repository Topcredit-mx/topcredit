# Real Examples from This Codebase

> Note: Some examples below are patterns to follow, not necessarily existing code in the repo.

This file contains actual code patterns from this repository.

## Server Component Page Example

From `src/app/admin/groups/page.tsx`:

```typescript
import { columns } from './columns'
import { getGroups } from '~/server/admin/queries'
import { DataTable, DataTableHeader, DataTableContent, DataTablePagination } from '~/components/ui/data-table'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import Link from 'next/link'

type SearchParams = {
  kind?: 'all' | 'finished'
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const { items } = await getGroups({
    limit: 1000,
    page: 1,
    kind: filters.kind,
  })

  return (
    <div className="container mx-auto">
      <ToggleGroup type="single" size="sm" value={filters.kind ?? 'none'}>
        <ToggleGroupItem className="w-24" value="all" variant="outline" asChild>
          <Link href="?kind=all">All</Link>
        </ToggleGroupItem>
        <ToggleGroupItem className="w-24" value="none" variant="outline" asChild>
          <Link href="?">Active</Link>
        </ToggleGroupItem>
        <ToggleGroupItem className="w-24" value="finished" variant="outline" asChild>
          <Link href="?kind=finished">Finished</Link>
        </ToggleGroupItem>
      </ToggleGroup>
      <DataTable columns={columns} data={items} schema="groups" label="Groups">
        <DataTableHeader className="mt-4">
          {filters.kind === 'finished' ? <BulkActivate /> : <BulkFinish />}
          <BulkJoinable />
        </DataTableHeader>
        <DataTableContent />
        <DataTablePagination />
      </DataTable>
    </div>
  )
}
```

**Key points:**
- Async server component
- `searchParams` is a Promise (Next.js 15)
- Data fetched directly in page
- Uses server-rendered `Link` components for filtering (no client state)

## Form with Multiple Controlled Components

From `src/app/admin/groups/new/form.tsx`:

```typescript
'use client'

import { useActionState, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { createGroup } from '~/server/admin/mutations'

export default function Form({
  tournaments,
}: {
  tournaments: Array<{
    id: number
    name: string
    year: number
    sport: { name: string }
  }>
}) {
  // State for controlled components
  const [tournamentId, setTournamentId] = useState('')
  const [joinable, setJoinable] = useState(false)
  const [finished, setFinished] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [open, setOpen] = useState(false)  // Popover state

  // Connect to server action
  const [state, action, pending] = useActionState(createGroup, {
    message: '',
  })

  return (
    <form action={action} className="space-y-6">
      {/* Regular input - no state needed */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="name">Group Name</Label>
        <Input name="name" required placeholder="Tournament Name" />
      </div>

      {/* Select with hidden input */}
      <div className="flex flex-col gap-3">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <Label htmlFor="tournament">Tournament</Label>
        <Select required value={tournamentId} onValueChange={setTournamentId}>
          <SelectTrigger name="tournament" className="w-full">
            <SelectValue placeholder="Select a Tournament..." />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((tournament) => (
              <SelectItem key={tournament.id} value={tournament.id.toString()}>
                {tournament.name} {tournament.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date picker with Calendar in Popover */}
      <div className="flex flex-col gap-3">
        <input type="hidden" name="paymentDueDate" value={date?.toISOString() ?? ''} />
        <Label htmlFor="date">Payment Due Date</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button id="date" variant="outline" className="w-full justify-between">
              {date ? date.toLocaleDateString('en-US', {
                month: '2-digit', day: '2-digit', year: 'numeric'
              }) : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => {
                setDate(date)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Checkbox - name attribute handles form submission */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="joinable"
          name="joinable"
          checked={joinable}
          onCheckedChange={(value) => setJoinable(!!value)}
        />
        <Label htmlFor="joinable">Joinable</Label>
      </div>

      {/* Error display */}
      {state.message && (
        <div className="text-red-500 text-sm">{state.message}</div>
      )}

      {/* Submit button with pending state */}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  )
}
```

## Server Action with Validation

From `src/server/admin/mutations.ts`:

```typescript
'use server'

import z from 'zod'
import { adminGuard } from '~/lib/auth'
import { groups } from '../db/schema'
import { redirect } from 'next/navigation'
import { db } from '../db'
import { fromErrorToFormState } from '../errors/errors'

const createGroupSchema = z.object({
  name: z.string().min(1).max(30),
  joinable: z.boolean().default(false),
  finished: z.boolean().default(false),
  paymentDueDate: z.coerce.date().optional(),
  tournamentId: z.coerce.number().int().positive(),
})

export const createGroup = async (
  _initialState: unknown,
  formData: FormData,
) => {
  await adminGuard()
  try {
    const data = createGroupSchema.parse({
      name: formData.get('name'),
      joinable: formData.get('joinable') === 'on',
      finished: formData.get('finished') === 'on',
      paymentDueDate: formData.get('paymentDueDate')
        ? new Date(formData.get('paymentDueDate') as string)
        : undefined,
      tournamentId: Number(formData.get('tournamentId')),
    })

    await db.insert(groups).values({
      name: data.name,
      joinable: data.joinable,
      finished: data.finished,
      paymentDueDate: data.paymentDueDate,
      tournamentId: data.tournamentId,
    })
  } catch (error) {
    return fromErrorToFormState(error)
  }

  redirect('/admin/groups')
}
```

**Key points:**
- `'use server'` at file top
- `adminGuard()` called first
- Zod schema for validation
- Checkbox values come as `'on'` string
- `redirect()` outside try-catch (throws internally)
- Errors returned as `{ message: string }`

## Bulk Operations Pattern

From `src/server/admin/mutations.ts`:

```typescript
export const finishGroups = async ({ ids }: { ids: number[] }) => {
  await adminGuard()
  try {
    await db
      .update(groups)
      .set({ finished: true })
      .where(inArray(groups.id, ids))
  } catch (error) {
    return fromErrorToFormState(error)
  }

  revalidatePath('/admin/groups')
}
```

## Query with Pagination

From `src/server/admin/queries.ts`:

```typescript
'use server'

import { db } from '../db'
import { adminGuard } from '~/lib/auth'

export const getGroups = async (input?: {
  page?: number
  limit?: number
  kind?: 'all' | 'finished'
}) => {
  await adminGuard()
  const page = input?.page ?? 1
  const limit = input?.limit ?? 10
  const kind = input?.kind
  const offset = (page - 1) * limit

  const where =
    kind === 'finished'
      ? eq(groups.finished, true)
      : kind === 'all'
        ? undefined
        : eq(groups.finished, false)

  const items = await db.query.groups.findMany({
    where,
    offset,
    limit,
    orderBy: (groups, { desc }) => [desc(groups.createdAt)],
    with: {
      tournament: true,
    },
  })

  const totalResult = await db
    .select({ value: count() })
    .from(groups)
    .where(where)
  const total = totalResult[0]?.value ?? 0
  const totalPages = Math.ceil(total / limit)

  return { items, total, page, limit, totalPages }
}
```

## Error Handling with Database Constraints

From `src/server/errors/errors.ts`:

```typescript
import { NeonDbError } from '@neondatabase/serverless'
import { ZodError } from 'zod'

export const fromErrorToFormState = (error: unknown): { message: string } => {
  if (error instanceof ZodError) {
    // Zod v4 uses .issues instead of .errors
    const firstIssue = error.issues?.[0]
    if (firstIssue) {
      return { message: firstIssue.message }
    }
    return { message: 'Validation error' }
  }

  if (error instanceof NeonDbError) {
    switch (error.code) {
      case '23505':  // Unique constraint violation
        if (error.constraint === 'group_tournament_id_name_unique') {
          return { message: 'A group with this name already exists for this tournament' }
        }
        if (error.constraint === 'tournament_sport_id_name_year_unique') {
          return { message: 'A tournament with this name and year already exists for this sport' }
        }
        return { message: `This ${error.table || 'item'} already exists` }
      case '23514':  // Check constraint violation
        if (error.constraint === 'username_format') {
          return { message: 'Username can only contain letters, numbers, underscores, and hyphens' }
        }
        return { message: 'Invalid data provided' }
      default:
        return { message: error.message }
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }
  return { message: 'An unknown error occurred' }
}
```

## Authentication Flow

From `src/lib/auth.ts`:

```typescript
'use server'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { cache } from 'react'

// Cached auth check - dedupes across server component tree
export const auth = cache(async () => {
  const session = await getSession()
  if (!session?.user) {
    redirect('/login')
  }

  const user = await db.query.users.findFirst({
    where: (user, { eq }) => eq(user.id, session.user.id),
  })

  if (!user) {
    redirect('/login')
  }

  return { session, user }
})

// Guard functions for different authorization levels
export const adminGuard = async () => {
  const { user } = await auth()
  if (!user.admin) redirect('/')
}

export const userGuard = async () => {
  return await auth()
}
```

## Optimistic Updates Example

Pattern for immediate UI feedback on bulk actions:

```typescript
// src/app/admin/groups/optimistic-toggle.tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import { Checkbox } from '~/components/ui/checkbox'
import { updateJoinableGroups } from '~/server/admin/mutations'

type Group = {
  id: number
  name: string
  joinable: boolean
}

export function GroupJoinableToggle({ group }: { group: Group }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticJoinable, setOptimisticJoinable] = useOptimistic(
    group.joinable,
    (_, newValue: boolean) => newValue
  )

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      // Update UI immediately
      setOptimisticJoinable(checked)
      // Perform server action
      await updateJoinableGroups({ ids: [group.id], joinable: checked })
    })
  }

  return (
    <Checkbox
      checked={optimisticJoinable}
      onCheckedChange={handleToggle}
      disabled={isPending}
    />
  )
}
```

## Loading State Example

Pattern for route-level loading UI:

```typescript
// src/app/admin/groups/loading.tsx
import { Skeleton } from '~/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto">
      {/* Filter toggle skeleton */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      
      {/* Table header skeleton */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      
      {/* Table rows skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
```

## Suspense for Partial Loading

Pattern for streaming slow components:

```typescript
// src/app/dashboard/page.tsx
import { Suspense } from 'react'
import { Skeleton } from '~/components/ui/skeleton'
import { QuickStats } from './quick-stats'
import { RecentGroups } from './recent-groups'
import { UserActivity } from './user-activity'

export default function DashboardPage() {
  return (
    <div className="container mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Quick stats load fast - no suspense needed */}
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <QuickStats />
      </Suspense>

      {/* These can load independently */}
      <div className="grid grid-cols-2 gap-6">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <RecentGroups />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <UserActivity />
        </Suspense>
      </div>
    </div>
  )
}
```

## Error Boundary Example

Pattern for route-level error handling:

```typescript
// src/app/admin/groups/error.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error monitoring service (e.g., Sentry)
    console.error('Groups error:', error)
  }, [error])

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load groups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {error.message || 'An unexpected error occurred while loading the groups.'}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <a href="/admin">Back to Admin</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Parallel Data Fetching

Pattern for fetching multiple data sources efficiently:

```typescript
// src/app/admin/tournaments/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getTournamentById, getWeeksByTournamentId, getGroups } from '~/server/admin/queries'

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tournamentId = Number(id)

  // Fetch all data in parallel
  const [tournament, weeks, groups] = await Promise.all([
    getTournamentById(tournamentId),
    getWeeksByTournamentId({ tournamentId }),
    getGroups({ kind: 'all' }),
  ])

  if (!tournament) {
    notFound()
  }

  // Filter groups for this tournament client-side (already have all data)
  const tournamentGroups = groups.items.filter(
    (g) => g.tournament?.id === tournamentId
  )

  return (
    <div>
      <h1>{tournament.name}</h1>
      {/* Render with all data available */}
    </div>
  )
}
```
