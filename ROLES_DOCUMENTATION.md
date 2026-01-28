# Multi-Role System Implementation

This project uses a **junction table approach** for implementing multi-role access control. Users can have multiple roles simultaneously, providing maximum flexibility.

## Available Roles

| Role | Description |
|------|-------------|
| `customer` | Regular customer applying for credit - base role for customers |
| `employee` | Base role for all employees - required for /app access |
| `requests` | Employee who can handle credit requests |
| `admin` | System administrator with full access |

## User Types

### Customers
- Have the `customer` role
- Access the `/dashboard` routes
- Cannot access `/app` routes

### Employees
- **Must** have the `employee` role (base identity)
- Can additionally have `requests` and/or `admin` roles
- Access the `/app` routes
- Cannot access `/dashboard` routes (employees are not customers)

**Important:** Employees cannot have the `customer` role, and customers cannot have the `employee` role.

## Database Schema

```typescript
// Roles enum
export const rolesEnum = pgEnum('roles', [
  'customer',
  'employee',
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
// Customer
{ roles: ['customer'] }

// Employee with requests access
{ roles: ['employee', 'requests'] }

// Employee with admin access
{ roles: ['employee', 'admin'] }

// Employee with full access
{ roles: ['employee', 'requests', 'admin'] }
```

## Usage Examples

### 1. Protecting Server Components (Pages)

```typescript
// app/app/admin/users/page.tsx
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
      <h1>Employee Dashboard</h1>
      
      {/* Show for employees with requests role */}
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
        <Link href="/app/admin/users">Manage Users</Link>
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
await setUserRoles(userId, ['employee', 'requests', 'admin'])
```

### Checking Roles

```typescript
import { userHasRole, getUserRoles } from '~/server/auth/role-management'

// Check if user has specific role
const isAdmin = await userHasRole(userId, 'admin')

// Get all user roles
const roles = await getUserRoles(userId) // ['employee', 'requests']
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

- `/app/*` - Requires `employee` role
- `/app/admin/*` - Requires `admin` role
- `/dashboard/*` - Requires `customer` role

## Best Practices

1. **Always use server-side checks** for authorization (pages, API routes)
2. **Client-side checks** are only for UI/UX (hiding/showing elements)
3. **Default role** for new users signing up is `customer`
4. **Employee role** is the base for all employees - never remove it
5. **Admin role** should have access to everything within the employee app
6. **Use `requireAnyRole()`** for most cases (flexible, allows admin access)
