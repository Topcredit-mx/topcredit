# Multi-Role System Implementation

This project uses a **junction table approach** for implementing multi-role access control. Users can have multiple roles simultaneously, providing maximum flexibility.

## Available Roles

| Role | Description |
|------|-------------|
| `customer` | Regular customer applying for credit (default role) |
| `sales_rep` | Sales team member managing leads and deals |
| `credit_analyst` | Analyzes and approves/denies credit applications |
| `accountant` | Manages financial operations and reports |
| `support` | Customer support staff |
| `admin` | System administrator with full access |

## Database Schema

```typescript
// Users table (no role column)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  // ... other fields
})

// Junction table for many-to-many relationship
export const userRoles = pgTable('user_roles', {
  userId: integer('user_id').references(() => users.id),
  role: rolesEnum('role').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.role] }),
}))
```

## Usage Examples

### 1. Protecting Server Components (Pages)

```typescript
// app/admin/users/page.tsx
import { requireAnyRole } from '~/lib/auth-utils'

export default async function AdminUsersPage() {
  // Only admins can access
  await requireAnyRole(['admin'])
  
  return <AdminUsersContent />
}
```

```typescript
// app/applications/page.tsx
import { requireAnyRole } from '~/lib/auth-utils'

export default async function ApplicationsPage() {
  // Credit analysts, sales reps, and admins can access
  await requireAnyRole(['credit_analyst', 'sales_rep', 'admin'])
  
  return <ApplicationsList />
}
```

### 2. Conditional Rendering Based on Roles

```typescript
// app/dashboard/page.tsx
import { requireAuth } from '~/lib/auth-utils'

export default async function DashboardPage() {
  const session = await requireAuth()
  const roles = session.user.roles
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show for all users */}
      <UserStats />
      
      {/* Show only for sales reps and admins */}
      {(roles.includes('sales_rep') || roles.includes('admin')) && (
        <SalesMetrics />
      )}
      
      {/* Show only for accountants and admins */}
      {(roles.includes('accountant') || roles.includes('admin')) && (
        <FinancialReports />
      )}
      
      {/* Show only for admins */}
      {roles.includes('admin') && (
        <AdminPanel />
      )}
    </div>
  )
}
```

### 3. Client Components with Role Checks

```typescript
'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export function Navigation() {
  const { data: session } = useSession()
  const roles = session?.user?.roles || []
  
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/profile">Profile</Link>
      
      {/* Sales and admin only */}
      {(roles.includes('sales_rep') || roles.includes('admin')) && (
        <Link href="/sales/leads">Leads</Link>
      )}
      
      {/* Accountants and admin only */}
      {(roles.includes('accountant') || roles.includes('admin')) && (
        <Link href="/finance/reports">Financial Reports</Link>
      )}
      
      {/* Admin only */}
      {roles.includes('admin') && (
        <Link href="/admin">Admin Panel</Link>
      )}
    </nav>
  )
}
```

### 4. API Route Protection

```typescript
// app/api/admin/users/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/server/auth/config'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check if user has admin role
  if (!session.user.roles.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Admin logic here
  return NextResponse.json({ users: [] })
}
```

### 5. Middleware Protection (Optional)

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const roles = (token?.roles as string[]) || []
    
    // Admin routes
    if (path.startsWith('/admin') && !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    
    // Finance routes (accountant or admin)
    if (path.startsWith('/finance') && 
        !roles.includes('accountant') && 
        !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    
    // Sales routes (sales_rep or admin)
    if (path.startsWith('/sales') && 
        !roles.includes('sales_rep') && 
        !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/finance/:path*',
    '/sales/:path*',
    '/settings/:path*'
  ]
}
```

## Role Management Functions

### Assigning Roles

```typescript
import { assignRoleToUser } from '~/server/auth/role-management'

// Assign a single role
await assignRoleToUser(userId, 'sales_rep')
```

### Removing Roles

```typescript
import { removeRoleFromUser } from '~/server/auth/role-management'

await removeRoleFromUser(userId, 'sales_rep')
```

### Setting Multiple Roles (Replace All)

```typescript
import { setUserRoles } from '~/server/auth/role-management'

// Replace all roles with new set
await setUserRoles(userId, ['sales_rep', 'support'])
```

### Checking Roles

```typescript
import { userHasRole, getUserRoles } from '~/server/auth/role-management'

// Check if user has specific role
const isAdmin = await userHasRole(userId, 'admin')

// Get all user roles
const roles = await getUserRoles(userId) // ['customer', 'support']
```

### Getting Users by Role

```typescript
import { getUsersByRole } from '~/server/auth/role-management'

// Get all admins
const admins = await getUsersByRole('admin')
```

## Available Auth Utility Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `requireAuth()` | Redirects to `/login` if not authenticated | `Session` |
| `requireAnyRole(['admin', 'sales'])` | User must have at least ONE role | `Session` |
| `requireAllRoles(['admin', 'accountant'])` | User must have ALL roles | `Session` |
| `hasRole('admin')` | Check if user has specific role | `boolean` |
| `hasAnyRole(['admin', 'sales'])` | Check if user has any role | `boolean` |
| `hasAllRoles(['admin', 'sales'])` | Check if user has all roles | `boolean` |
| `getCurrentUserRoles()` | Get current user's roles | `Role[]` |

## Migration Guide

### Running the Migration

1. Generate the migration:
   ```bash
   npx drizzle-kit generate
   ```

2. Apply the migration:
   ```bash
   npx drizzle-kit migrate
   ```

3. For existing users, assign default roles:
   ```typescript
   // Run this script once to assign customer role to all existing users
   import { db } from '~/server/db'
   import { users, userRoles } from '~/server/db/schema'
   
   const allUsers = await db.select().from(users)
   
   for (const user of allUsers) {
     await db.insert(userRoles).values({
       userId: user.id,
       role: 'customer'
     }).onConflictDoNothing()
   }
   ```

## Best Practices

1. **Always use server-side checks** for authorization (pages, API routes)
2. **Client-side checks** are only for UI/UX (hiding/showing elements)
3. **Default role** for new users is `customer`
4. **Admin role** should have access to everything (check it first in conditionals)
5. **Use `requireAnyRole()`** for most cases (flexible, allows admin access)
6. **Use `requireAllRoles()`** only for special cases requiring multiple roles

## Folder Structure Recommendation

```
app/
├── (public)/              # Public routes
│   ├── login/
│   └── signup/
│
├── (authenticated)/       # All authenticated routes
│   ├── layout.tsx        # Auth check
│   ├── dashboard/        # All roles
│   ├── settings/         # All roles
│   │
│   ├── sales/            # sales_rep, admin
│   │   ├── leads/
│   │   └── deals/
│   │
│   ├── applications/     # credit_analyst, admin
│   │   └── [id]/
│   │
│   ├── finance/          # accountant, admin
│   │   ├── reports/
│   │   └── transactions/
│   │
│   ├── support/          # support, admin
│   │   └── tickets/
│   │
│   └── admin/            # admin only
│       ├── users/
│       ├── roles/
│       └── settings/
```

## Example: Admin Panel for Managing Roles

```typescript
// app/admin/users/[id]/roles/page.tsx
import { requireAnyRole } from '~/lib/auth-utils'
import { getUserRoles, setUserRoles } from '~/server/auth/role-management'
import { RoleEditor } from '~/components/role-editor'

export default async function UserRolesPage({ params }: { params: { id: string } }) {
  await requireAnyRole(['admin'])
  
  const userId = Number.parseInt(params.id)
  const currentRoles = await getUserRoles(userId)
  
  return (
    <div>
      <h1>Manage User Roles</h1>
      <RoleEditor userId={userId} currentRoles={currentRoles} />
    </div>
  )
}
```
