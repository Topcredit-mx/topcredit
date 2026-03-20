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
import { getCompanies } from '~/server/queries'
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
  const { items } = await getCompanies({ page: 1, limit: 50 })

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

Flat structure: one file per concern. Group by entity inside with comments.

```
src/server/
├── mutations.ts    # All mutations (createCompany, updateCompany, toggleUserRole, ...)
├── queries.ts      # All queries (getCompanies, getUsers, ...)
├── schemas.ts      # Zod validation schemas (createCompanySchema, updateCompanySchema)
├── scopes.ts       # Scoping helpers (getAssignedCompanyIds, getUserCompanyAssignments)
├── auth/
│   └── get-ability.ts   # getAbility(), requireAbility()
├── db/
└── errors/
```

### Server Action Pattern

```typescript
// src/server/mutations.ts
'use server'

import { getAbility, requireAbility } from '~/server/auth/get-ability'
import { createCompanySchema } from '~/server/schemas'
import { db } from '~/server/db'
import { redirect } from 'next/navigation'
import { fromErrorToFormState } from '~/server/errors/errors'

export const createCompany = async (_initialState: unknown, formData: FormData) => {
  const ability = await getAbility()
  requireAbility(ability, 'create', 'Company')  // Guard first
  try {
    const data = createCompanySchema.parse({ ... })
    await db.insert(companies).values(data)
  } catch (error) {
    return fromErrorToFormState(error)
  }
  redirect('/app/admin/companies')
}
```

**CASL ability guards:** Use `getAbility()` + `requireAbility(ability, action, subject)` instead of role checks. Pages, mutations, and protected queries call the guard at the top. Queries stay pure; caller passes scoped params (e.g. `companyIds`) when needed.

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
export const deleteEntity = async (id: number) => {
  const ability = await getAbility()
  requireAbility(ability, 'delete', 'Company')
  await db.delete(entities).where(eq(entities.id, id))
  revalidatePath('/admin/entities')
}
```

## Form Implementation

Forms are the **only** place where `'use client'` is typically needed.

```typescript
// src/app/admin/companies/new/page.tsx (form component)
'use client'

import { useActionState, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { createCompany } from '~/server/mutations'

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

## Authentication and Abilities

Use CASL ability checks for authorization. Route-level access uses `getRequiredEmployeeUser` or `getRequiredCustomerUser`.

```typescript
// Pages and mutations: getAbility + requireAbility
import { getAbility, requireAbility } from '~/server/auth/get-ability'

const ability = await getAbility()
requireAbility(ability, 'create', 'Company')   // Redirects to /unauthorized if denied
requireAbility(ability, 'update', subject('Company', company))  // Instance check
```

**Where guards live:** Pages, mutations, and protected queries. Public queries (login, landing) have no guard.

## Data Fetching (Queries)

Queries live in `~/server/queries.ts`. Protected queries call `getAbility()` + `requireAbility()` at the top.

```typescript
// src/server/queries.ts
import { getAbility, requireAbility } from '~/server/auth/get-ability'

export const getCompanies = async (params) => {
  const ability = await getAbility()
  requireAbility(ability, 'read', 'Company')
  // ... fetch with scoped params (companyIds from getAssignedCompanyIds)
  return { items, total, page, limit, totalPages }
}
```

## Optimistic Updates

Use `useOptimistic` for immediate UI feedback before server confirmation.

```typescript
'use client'

import { useOptimistic } from 'react'
import { toggleUserRole } from '~/server/mutations'

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
    await toggleUserRole(item.id, 'admin')
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
// src/app/admin/overview/page.tsx
import { Suspense } from 'react'
import { StatsCards } from './stats-cards'
import { RecentActivity } from './recent-activity'
import { Skeleton } from '~/components/ui/skeleton'

export default function Page() {
  return (
    <div className="space-y-6">
      {/* Fast content renders immediately */}
      <h1>Overview</h1>
      
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

  return <Overview groups={groups} tournaments={tournaments} />
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
// src/server/schemas.ts (no 'use server')
export const createCompanySchema = z.object({ ... })
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
