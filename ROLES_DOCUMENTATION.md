# Multi-Role System Implementation

This project uses a **junction table approach** for implementing multi-role access control. Users can have multiple roles simultaneously, providing maximum flexibility.

## Available Roles

| Role | Description |
|------|-------------|
| `applicant` | Person applying for credit - base role for dashboard access |
| `agent` | Internal staff - base role for /app (back office) access |
| `requests` | Agent who can handle credit requests |
| `admin` | System administrator with full access |

## User Types

### Applicants
- Have the `applicant` role
- Access the `/dashboard` routes
- Cannot access `/app` routes

### Agents
- **Must** have the `agent` role (base identity)
- Can additionally have `requests` and/or `admin` roles
- Access the `/app` routes
- Cannot access `/dashboard` routes (agents are not applicants)

**Important:** Agents cannot have the `applicant` role, and applicants cannot have the `agent` role.

## Database Schema

```typescript
// Roles enum
export const rolesEnum = pgEnum('roles', [
  'applicant',
  'agent',
  'requests',
  'admin',
])

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

## Example User Role Assignments

```typescript
// Applicant
{ roles: ['applicant'] }

// Agent with requests access
{ roles: ['agent', 'requests'] }

// Agent with admin access
{ roles: ['agent', 'admin'] }

// Agent with full access
{ roles: ['agent', 'requests', 'admin'] }
```

## Usage Examples

### 1. Protecting Server Components (Pages)

```typescript
// app/app/users/page.tsx
import { requireAnyRole } from '~/lib/auth-utils'

export default async function AdminUsersPage() {
  // Only admins can access
  await requireAnyRole(['admin'])

  return <AdminUsersContent />
}
```

### 2. Conditional Rendering Based on Roles

```typescript
// app/app/page.tsx
import { requireAuth } from '~/lib/auth-utils'

export default async function AppDashboard() {
  const session = await requireAuth()
  const roles = session.user.roles

  return (
    <div>
      <h1>Agent Dashboard</h1>

      {/* Show for agents with requests role */}
      {roles.includes('requests') && (
        <RequestsPanel />
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
      <Link href="/app">Dashboard</Link>

      {/* Admin only */}
      {roles.includes('admin') && (
        <Link href="/app/users">Manage Users</Link>
      )}
    </nav>
  )
}
```

## Role Management Functions

### Assigning Roles

```typescript
import { assignRoleToUser } from '~/server/auth/role-management'

// Assign a single role
await assignRoleToUser(userId, 'requests')
```

### Removing Roles

```typescript
import { removeRoleFromUser } from '~/server/auth/role-management'

await removeRoleFromUser(userId, 'requests')
```

### Setting Multiple Roles (Replace All)

```typescript
import { setUserRoles } from '~/server/auth/role-management'

// Replace all roles with new set
await setUserRoles(userId, ['agent', 'requests', 'admin'])
```

### Checking Roles

```typescript
import { userHasRole, getUserRoles } from '~/server/auth/role-management'

// Check if user has specific role
const isAdmin = await userHasRole(userId, 'admin')

// Get all user roles
const roles = await getUserRoles(userId) // ['agent', 'requests']
```

## Available Auth Utility Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `requireAuth()` | Redirects to `/login` if not authenticated | `Session` |
| `requireAnyRole(['admin', 'requests'])` | User must have at least ONE role | `Session` |
| `requireAllRoles(['admin', 'requests'])` | User must have ALL roles | `Session` |
| `hasRole('admin')` | Check if user has specific role | `boolean` |
| `hasAnyRole(['admin', 'requests'])` | Check if user has any role | `boolean` |
| `hasAllRoles(['admin', 'requests'])` | Check if user has all roles | `boolean` |
| `getCurrentUserRoles()` | Get current user's roles | `Role[]` |

## Middleware Route Protection

The middleware (`src/proxy.ts`) automatically protects routes:

- `/app/*` - Requires `agent` role
- `/app/users`, `/app/companies` - Requires `admin` role
- `/dashboard/*` - Requires `applicant` role

## Best Practices

1. **Always use server-side checks** for authorization (pages, API routes)
2. **Client-side checks** are only for UI/UX (hiding/showing elements)
3. **Default role** for new users signing up is `applicant`
4. **Agent role** is the base for internal staff - required for /app access
5. **Admin role** should have access to everything within the agent app
6. **Use `requireAnyRole()`** for most cases (flexible, allows admin access)
