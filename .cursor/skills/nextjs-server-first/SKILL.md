---
name: nextjs-server-first
description: Next.js App Router coding standards emphasizing server components, server actions, and minimal client-side rendering. Use when creating pages, forms, data fetching, or mutations in this Next.js project.
---

# Next.js Server-First Coding Standards

This project follows a server-first architecture using Next.js App Router. The goal is to maximize server-side rendering and minimize client-side JavaScript.

## Core Principles

1. **Server Components by default** - All `page.tsx` files are Server Components
2. **Client Components only for interactivity** - Use `'use client'` only when hooks or browser APIs are needed
3. **Server Actions for mutations** - All data mutations use `'use server'` functions
4. **Forms use `useActionState`** - Connect forms to server actions via React's `useActionState` hook

## Page Structure

Pages are always async Server Components that fetch data directly.

```typescript
// src/app/admin/[entity]/page.tsx
import { getData } from '~/server/employees/admin/queries'
import { DataTable } from '~/components/ui/data-table'
import { columns } from './columns'

type SearchParams = {
  kind?: 'all' | 'filtered'
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>  // Next.js 15: params are Promises
}) {
  const filters = await searchParams
  const { items } = await getData({ kind: filters.kind })

  return (
    <div className="container mx-auto">
      <DataTable columns={columns} data={items} />
    </div>
  )
}
```

### Key Patterns

- `params` and `searchParams` are Promises in Next.js 15 - always `await` them
- Use `notFound()` from `next/navigation` when entity not found
- Use `redirect()` for navigation after auth checks
- Fetch data at the page level, pass to components as props

## Server Actions

All mutations are defined in dedicated files with `'use server'` at the top.

### File Organization

Server actions are organized by role to enforce clear authorization boundaries:

```
src/server/
├── employees/              # All employee roles
│   ├── admin/              # Admin-level operations
│   │   ├── mutations.ts    # Admin CRUD operations
│   │   └── queries.ts      # Admin data fetching
│   ├── manager/            # Manager-level operations
│   │   ├── mutations.ts    
│   │   └── queries.ts      
│   └── analyst/            # Analyst-level operations
│       ├── mutations.ts    
│       └── queries.ts      
├── customer/               # Customer-facing operations
│   ├── mutations.ts        # Customer mutations
│   └── queries.ts          # Customer queries
├── public/                 # Unauthenticated operations
│   └── actions.ts          # Public actions (signup, etc.)
└── errors/
    └── errors.ts           # Error handling utilities
```

**Role hierarchy:** Each folder enforces its own authorization guard. Nested employee roles allow for granular permission control.

### Server Action Pattern

```typescript
// src/server/employees/admin/mutations.ts
'use server'

import z from 'zod'
import { adminGuard } from '~/lib/auth'
import { db } from '../../db'
import { redirect } from 'next/navigation'
import { fromErrorToFormState } from '../../errors/errors'

const createEntitySchema = z.object({
  name: z.string().min(1).max(30),
  relatedId: z.coerce.number().int().positive(),
})

export const createEntity = async (
  _initialState: unknown,
  formData: FormData,
) => {
  await adminGuard()  // Always guard first
  try {
    const data = createEntitySchema.parse({
      name: formData.get('name'),
      relatedId: Number(formData.get('relatedId')),
    })

    await db.insert(entities).values(data)
  } catch (error) {
    return fromErrorToFormState(error)  // Return error, don't throw
  }

  redirect('/admin/entities')  // Redirect on success (outside try-catch)
}
```

### Two Action Signatures

**Form actions** (for `useActionState`):
```typescript
export const createEntity = async (
  _initialState: unknown,
  formData: FormData,
) => { ... }
```

**Programmatic actions** (for direct calls):
```typescript
export const deleteEntity = async ({ id }: { id: number }) => {
  await adminGuard()
  await db.delete(entities).where(eq(entities.id, id))
  revalidatePath('/admin/entities')
}
```

## Form Implementation

Forms are the **only** place where `'use client'` is typically needed.

```typescript
// src/app/admin/entities/new/form.tsx
'use client'

import { useActionState, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { createEntity } from '~/server/employees/admin/mutations'

export default function Form({
  relatedItems,
}: {
  relatedItems: Array<{ id: number; name: string }>
}) {
  // State only for controlled components (Select, Checkbox, etc.)
  const [relatedId, setRelatedId] = useState('')
  
  // Connect to server action
  const [state, action, pending] = useActionState(createEntity, {
    message: '',
  })

  return (
    <form action={action} className="space-y-6">
      {/* Regular inputs use native form submission */}
      <Input name="name" required placeholder="Name" />

      {/* Controlled components need hidden inputs */}
      <input type="hidden" name="relatedId" value={relatedId} />
      <Select value={relatedId} onValueChange={setRelatedId}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {relatedItems.map((item) => (
            <SelectItem key={item.id} value={item.id.toString()}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Error display */}
      {state.message && (
        <div className="text-red-500 text-sm">{state.message}</div>
      )}

      {/* Submit with pending state */}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  )
}
```

### Why Forms Need Client Components

- `useActionState` hook requires client component
- Controlled components (Select, Checkbox, Calendar) need `useState`
- Interactive UI elements need client-side JavaScript

### Hidden Input Pattern

For controlled components, sync state to form with hidden inputs:
```typescript
const [value, setValue] = useState('')
// ...
<input type="hidden" name="fieldName" value={value} />
<Select value={value} onValueChange={setValue}>...</Select>
```

## Error Handling

Centralized error handling converts errors to form-friendly messages.

```typescript
// src/server/errors/errors.ts
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
      case '23505':  // Unique constraint
        if (error.constraint === 'entity_name_unique') {
          return { message: 'An entity with this name already exists' }
        }
        return { message: `This ${error.table || 'item'} already exists` }
      case '23514':  // Check constraint
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

## Authentication Guards

Use layered guards for authorization.

```typescript
// src/lib/auth.ts
'use server'

import { cache } from 'react'
import { redirect } from 'next/navigation'

export const auth = cache(async () => {
  const session = await getSession()
  if (!session?.user) redirect('/login')
  // ... fetch user from db
  return { session, user }
})

export const adminGuard = async () => {
  const { user } = await auth()
  if (!user.admin) redirect('/')
}

export const userGuard = async () => {
  return await auth()
}
```

### Usage in Server Actions

```typescript
export const createEntity = async (...) => {
  await adminGuard()  // First line - guards before any logic
  // ... rest of action
}
```

## Data Fetching (Queries)

Queries are also server actions, organized by domain.

```typescript
// src/server/employees/admin/queries.ts
'use server'

import { db } from '../../db'
import { adminGuard } from '~/lib/auth'

export const getEntities = async (input?: {
  page?: number
  limit?: number
  search?: string
}) => {
  await adminGuard()
  const page = input?.page ?? 1
  const limit = input?.limit ?? 10
  const offset = (page - 1) * limit

  const items = await db.query.entities.findMany({
    offset,
    limit,
    orderBy: (entities, { desc }) => [desc(entities.createdAt)],
  })

  // Return paginated response
  return { items, total, page, limit, totalPages }
}
```

## Optimistic Updates

Use `useOptimistic` for immediate UI feedback before server confirmation.

```typescript
'use client'

import { useOptimistic } from 'react'
import { toggleItemStatus } from '~/server/employees/admin/mutations'

type Item = { id: number; name: string; active: boolean }

export function ItemList({ items }: { items: Item[] }) {
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (state, updatedItem: Item) =>
      state.map((item) => (item.id === updatedItem.id ? updatedItem : item))
  )

  async function handleToggle(item: Item) {
    // Update UI immediately
    setOptimisticItems({ ...item, active: !item.active })
    // Then perform server action
    await toggleItemStatus({ id: item.id })
  }

  return (
    <ul>
      {optimisticItems.map((item) => (
        <li key={item.id}>
          {item.name} - {item.active ? 'Active' : 'Inactive'}
          <button onClick={() => handleToggle(item)}>Toggle</button>
        </li>
      ))}
    </ul>
  )
}
```

### When to Use Optimistic Updates

- Toggle switches / checkboxes
- Like / favorite buttons
- Status changes
- Any action where immediate feedback improves UX

### When NOT to Use

- Form submissions with validation (use `pending` state instead)
- Actions that might fail frequently
- Complex state changes

## Loading States

Use `loading.tsx` files and Suspense boundaries for loading UI.

### Route-Level Loading (`loading.tsx`)

Create `loading.tsx` alongside `page.tsx` to show loading state during navigation:

```typescript
// src/app/admin/groups/loading.tsx
import { Skeleton } from '~/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
```

### Suspense for Granular Loading

Wrap slow components in Suspense for streaming:

```typescript
// src/app/admin/dashboard/page.tsx
import { Suspense } from 'react'
import { StatsCards } from './stats-cards'
import { RecentActivity } from './recent-activity'
import { Skeleton } from '~/components/ui/skeleton'

export default function Page() {
  return (
    <div className="space-y-6">
      {/* Fast content renders immediately */}
      <h1>Dashboard</h1>
      
      {/* Slow queries stream in */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <StatsCards />
      </Suspense>
      
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RecentActivity />
      </Suspense>
    </div>
  )
}
```

### Parallel Data Fetching

When multiple queries are needed, fetch in parallel:

```typescript
export default async function Page() {
  // BAD: Sequential (slower)
  const groups = await getGroups()
  const tournaments = await getTournaments()

  // GOOD: Parallel (faster)
  const [groups, tournaments] = await Promise.all([
    getGroups(),
    getTournaments(),
  ])

  return <Dashboard groups={groups} tournaments={tournaments} />
}
```

## Error Boundaries

Use `error.tsx` files for graceful error handling at route level.

### Route-Level Error Boundary (`error.tsx`)

```typescript
// src/app/admin/groups/error.tsx
'use client'  // Error boundaries must be client components

import { useEffect } from 'react'
import { Button } from '~/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Groups page error:', error)
  }, [error])

  return (
    <div className="container mx-auto py-10 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mt-2">
        {error.message || 'Failed to load groups'}
      </p>
      <Button onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  )
}
```

### Global Error Boundary (`global-error.tsx`)

For root layout errors, create `src/app/global-error.tsx`:

```typescript
// src/app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <button onClick={reset} className="mt-4 px-4 py-2 bg-primary text-white rounded">
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

### Error Boundary Hierarchy

```
src/app/
├── global-error.tsx      # Catches root layout errors
├── error.tsx             # Catches app-level errors
├── admin/
│   ├── error.tsx         # Catches all /admin/* errors
│   └── groups/
│       ├── error.tsx     # Catches /admin/groups errors specifically
│       └── page.tsx
```

Errors bubble up to the nearest `error.tsx`. Place error boundaries at appropriate levels for granular error handling.

## 'use server' File Restrictions

Files with `'use server'` at the top have strict export restrictions:

**✅ CAN export:**
- Async functions (server actions)
- Type-only exports (`export type`)

**❌ CANNOT export:**
- Zod schemas (`export const schema = z.object(...)`)
- Constants or objects
- Regular functions (non-async)
- Classes

**Solution:** Keep schemas and types internal (no `export`) or move them to a separate file without `'use server'`.

```typescript
// ❌ WRONG: Exporting schema from 'use server' file
'use server'
export const createSchema = z.object({ ... }) // Error!

// ✅ CORRECT: Keep schema internal
'use server'
const createSchema = z.object({ ... }) // Internal use only

// ✅ CORRECT: Move to separate file
// src/server/employees/admin/schemas.ts (no 'use server')
export const createSchema = z.object({ ... })
```

## Zod v4 Compatibility Notes

This project uses Zod v4, which has some differences from Zod v3:

**ZodError Property Changes:**
- Zod v3: `error.errors[0]`
- Zod v4: `error.issues[0]`

Always use `.issues` when accessing ZodError validation errors:

```typescript
if (error instanceof ZodError) {
  const firstIssue = error.issues?.[0]
  if (firstIssue) {
    return { message: firstIssue.message }
  }
}
```

**Schema Syntax:**
- Zod v4 uses `message` instead of `required_error`/`invalid_type_error` in enum definitions
- Use `z.coerce.number('message')` instead of `z.coerce.number({ invalid_type_error: 'message' })`

## Checklist: When to Use Client Components

Use `'use client'` **only** when you need:

- [ ] React hooks (`useState`, `useEffect`, `useActionState`, `useOptimistic`, etc.)
- [ ] Event handlers beyond form submission (`onClick`, `onChange`, etc.)
- [ ] Browser APIs (`window`, `localStorage`, etc.)
- [ ] Third-party client libraries
- [ ] Error boundaries (`error.tsx` files)

**Do NOT use** `'use client'` for:
- Data fetching (use server actions)
- Static content rendering
- Layout components
- Pages
- Loading states (`loading.tsx` can be server components)

## File Naming Conventions

| File | Purpose | Component Type |
|------|---------|----------------|
| `page.tsx` | Route page | Server Component |
| `layout.tsx` | Route layout | Server Component |
| `loading.tsx` | Loading UI | Server Component |
| `error.tsx` | Error boundary | Client Component |
| `form.tsx` | Interactive form | Client Component |
| `columns.tsx` | Table column definitions | Server Component |
| `bulk-*.tsx` | Bulk action UI | Client Component (if interactive) |
