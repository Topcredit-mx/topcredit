---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with E2E tests.
---

# Test-Driven Development Workflow

This skill ensures all code development follows TDD principles with comprehensive E2E testing.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding API endpoints
- Creating new components

## Core Principles

### 1. Tests BEFORE Code
ALWAYS write tests first, then implement code to make tests pass.

### 2. Test Requirements
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

### 3. E2E Tests (Cypress)
- Critical user flows
- Complete workflows
- Browser automation
- UI interactions
- Access control and permissions
- Form submissions and validations

## TDD Workflow Steps

### Step 1: Write User Journeys
```
As a [role], I want to [action], so that [benefit]

Example:
As a user, I want to search for markets semantically,
so that I can find relevant markets even without exact keywords.
```

### Step 2: Generate Test Cases
For each user journey, create comprehensive test cases:

```typescript
describe('Semantic Search', () => {
  it('returns relevant markets for query', async () => {
    // Test implementation
  })

  it('handles empty query gracefully', async () => {
    // Test edge case
  })

  it('falls back to substring search when Redis unavailable', async () => {
    // Test fallback behavior
  })

  it('sorts results by similarity score', async () => {
    // Test sorting logic
  })
})
```

### Step 3: Run Tests (They Should Fail)
```bash
pnpm cy:run
# Tests should fail - we haven't implemented yet
```

### Step 4: Implement Code
Write minimal code to make tests pass.

### Step 5: Run Tests Again
```bash
pnpm cy:run
# Tests should now pass
```

### Step 6: Refactor
Improve code quality while keeping tests green:
- Remove duplication
- Improve naming
- Optimize performance
- Enhance readability

## Testing Patterns

### E2E Test Pattern (Cypress)
```typescript
describe('Markets', () => {
  it('user can search and filter markets', () => {
    // Navigate to markets page
    cy.visit('/')
    cy.contains('a', 'Markets').click()

    // Verify page loaded
    cy.get('h1').should('contain', 'Markets')

    // Search for markets
    cy.get('input[placeholder="Search markets"]').type('election')

    // Wait for debounce and results
    cy.wait(600)

    // Verify search results displayed (use semantic selectors)
    cy.get('article', { timeout: 5000 }).should('have.length', 5)

    // Verify results contain search term
    cy.get('article')
      .first()
      .should('contain.text', 'election')

    // Filter by status
    cy.contains('button', 'Active').click()

    // Verify filtered results
    cy.get('article').should('have.length', 3)
  })

  it('user can create a new market', () => {
    // Login first
    cy.visit('/creator-dashboard')

    // Fill market creation form using labels/placeholders users see
    cy.get('input[name="name"]').type('Test Market')
    cy.get('textarea[name="description"]').type('Test description')
    cy.get('input[name="endDate"]').type('2025-12-31')

    // Submit form
    cy.contains('button', 'Create Market').click()

    // Verify success message
    cy.contains('Market created successfully').should('be.visible')

    // Verify redirect to market page
    cy.url().should('match', /\/markets\/test-market/)
  })
})
```

## Cypress Database Tasks

Instead of mocking external services, use Cypress tasks to interact directly with the database. This provides real data setup/teardown and more realistic tests.

### Project Structure

```
cypress/
├── tasks/
│   ├── index.ts              # Export all tasks
│   └── cypress-db.ts         # Database connection singleton
├── support/
│   ├── commands.ts           # Custom Cypress commands
│   └── index.d.ts            # TypeScript declarations
└── e2e/
    └── admin/
        └── users.cy.ts       # E2E tests using tasks
```

### Database Connection (cypress/tasks/cypress-db.ts)

```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema'

let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb(connectionString: string) {
  if (!db) {
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for Cypress tasks')
    }

    const sql = neon(connectionString)
    db = drizzle({ client: sql, schema })
  }

  return db
}
```

### Task Definitions (cypress/tasks/index.ts)

```typescript
import { eq } from 'drizzle-orm'
import type { Role } from '~/lib/auth-utils'
import { userRoles, users } from '~/server/db/schema'
import { getDb } from './cypress-db'

export type CreateUserTaskParams = {
  name: string
  email: string
  roles?: Role[]
}

export const createUser = async (params: CreateUserTaskParams) => {
  const db = getDb(process.env.DATABASE_URL || '')

  const [user] = await db
    .insert(users)
    .values({
      email: params.email,
      name: params.name,
    })
    .returning()

  if (!user) {
    throw new Error('Failed to create user')
  }

  // Add roles if provided
  if (params.roles && params.roles.length > 0) {
    await db.insert(userRoles).values(
      params.roles.map((role) => ({
        userId: user.id,
        role,
      })),
    )
  }

  return user
}

export const cleanupTestUsers = async (emails: string[]) => {
  const db = getDb(process.env.DATABASE_URL || '')

  for (const email of emails) {
    await db.delete(users).where(eq(users.email, email))
  }

  return null
}

export const assignRole = async (params: { email: string; role: Role }) => {
  const db = getDb(process.env.DATABASE_URL || '')

  const user = await db.query.users.findFirst({
    where: eq(users.email, params.email),
  })

  if (!user) {
    throw new Error(`User with email ${params.email} not found`)
  }

  await db.insert(userRoles).values({
    userId: user.id,
    role: params.role,
  })

  return null
}
```

### Cypress Configuration (cypress.config.ts)

```typescript
import { defineConfig } from 'cypress'
import * as tasks from './cypress/tasks'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: ['cypress/e2e/**/*.cy.{js,ts}'],
    setupNodeEvents(on, cypressConfig) {
      // Pass environment variables to tasks
      process.env.DATABASE_URL = cypressConfig.env.DATABASE_URL
      process.env.AUTH_SECRET = cypressConfig.env.AUTH_SECRET

      // Register all tasks
      on('task', tasks)

      return cypressConfig
    },
  },
})
```

### Custom Commands (cypress/support/commands.ts)

```typescript
Cypress.Commands.add('login', (email: string) => {
  cy.task('login', email).then((token) => {
    cy.setCookie('next-auth.session-token', token)
  })
})
```

### Using Tasks in Tests

```typescript
const adminUser = {
  name: 'Admin User',
  email: 'admin@example.com',
  roles: ['admin', 'customer'] as const,
}

const testUsers = [
  {
    name: 'Jane Requests',
    email: 'jane.requests@example.com',
    roles: ['requests', 'customer'] as const,
  },
  {
    name: 'Bob Admin',
    email: 'bob.admin@example.com',
    roles: ['admin', 'customer'] as const,
  },
]

describe('Admin Users Table', () => {
  before(() => {
    // Clean up any stale data from previous interrupted runs
    const allEmails = [adminUser.email, ...testUsers.map((u) => u.email)]
    cy.task('cleanupTestUsers', allEmails)
    // Create test users before all tests
    cy.task('createUser', adminUser)
    cy.task('createMultipleUsers', testUsers)
  })

  after(() => {
    // Cleanup all test users after tests complete
    const allEmails = [adminUser.email, ...testUsers.map((u) => u.email)]
    cy.task('cleanupTestUsers', allEmails)
  })

  beforeEach(() => {
    // Login before each test
    cy.login(adminUser.email)
    cy.visit('/app/admin/users')
  })

  it('should display users table', () => {
    cy.contains('Jane Requests').should('be.visible')
    cy.contains('Bob Admin').should('be.visible')
  })

  it('should allow toggling roles', () => {
    // Toggle a role
    cy.contains('td', 'Jane Requests')
      .parent('tr')
      .find('button[role="checkbox"][aria-label="Toggle Admin role"]')
      .click()

    cy.wait(500)

    // Revert using task if needed
    cy.task('assignRole', { email: 'jane.requests@example.com', role: 'admin' })
  })
})
```

### TypeScript Declarations (cypress/support/index.d.ts)

```typescript
declare namespace Cypress {
  interface Chainable {
    login(email: string): Chainable<void>
  }
}
```

### Benefits of Database Tasks Over Mocking

1. **Real Data** - Tests use actual database state, catching real bugs
2. **Test Isolation** - Each test suite sets up and cleans up its own data
3. **Reusable** - Tasks can be shared across multiple test files
4. **Type-Safe** - Full TypeScript support with shared types
5. **Realistic Auth** - Generate real JWT tokens for authentication

### Resilient Test Cleanup Pattern

When tests are interrupted (Ctrl+C, crash, CI timeout), `after()` hooks never run, leaving stale test data in the database. This can cause failures on subsequent runs.

**Solution:** Clean up in BOTH `before()` and `after()` hooks:

```typescript
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  roles: ['customer'] as const,
}

describe('My Test Suite', () => {
  before(() => {
    // 1. Clean up any stale data from previous interrupted runs
    cy.task('cleanupTestUsers', [testUser.email])
    // 2. Create fresh test data
    cy.task('createUser', testUser)
  })

  after(() => {
    // 3. Clean up after normal completion
    cy.task('cleanupTestUsers', [testUser.email])
  })

  // ... tests
})
```

**How it works:**
- Normal run: `before()` cleans (no-op if clean), creates users, tests run, `after()` cleans
- Interrupted run: `before()` cleans, creates users, tests run... interrupted (no `after()`)
- Next run: `before()` cleans stale data, creates fresh users, tests continue normally

## Common Testing Mistakes to Avoid

### ❌ WRONG: Testing Implementation Details
```typescript
// Don't test internal state or implementation
cy.window().its('__NEXT_DATA__').should('have.property', 'props')
```

### ✅ CORRECT: Test User-Visible Behavior
```typescript
// Test what users see
cy.contains('Count: 5').should('be.visible')
cy.get('h1').should('contain', 'Welcome')
```

### ❌ WRONG: Brittle Selectors
```typescript
// Breaks easily - tied to implementation details
cy.get('.css-class-xyz').click()
cy.get('[data-testid="submit-button"]').click()
```

### ✅ CORRECT: User-Centric Selectors
```typescript
// Use what users see and interact with
cy.contains('button', 'Submit').click()
cy.contains('th', /nombre/i).should('be.visible')

// Use element roles
cy.get('button[role="checkbox"]').click()
cy.get('input[type="email"]').type('user@example.com')

// Use accessibility attributes (what screen readers see)
cy.get('button[aria-label="Toggle Admin role"]').click()
cy.get('[role="alertdialog"]').should('be.visible')

// Find elements by their relationships
cy.contains('td', 'Jane Requests').parent('tr').find('button').click()
```

### ❌ WRONG: No Test Isolation
```typescript
// Tests depend on each other
it('creates user', () => { /* ... */ })
it('updates same user', () => { /* depends on previous test */ })
```

### ✅ CORRECT: Independent Tests with Resilient Cleanup
```typescript
// Each test suite sets up its own data with cleanup before AND after
describe('User Management', () => {
  before(() => {
    // Clean up stale data from previous interrupted runs
    cy.task('cleanupTestUsers', [testUser.email])
    cy.task('createUser', testUser)
  })

  after(() => {
    cy.task('cleanupTestUsers', [testUser.email])
  })

  it('creates user', () => {
    // Test logic
  })

  it('updates user', () => {
    // Test logic
  })
})
```

## Continuous Testing

### Interactive Mode During Development
```bash
pnpm cy:open
# Opens Cypress Test Runner for interactive testing
```

### Run All Tests
```bash
pnpm cy:run
# Runs all tests headlessly
```

### CI/CD Integration
```yaml
# GitHub Actions
- name: Run Cypress Tests
  run: pnpm cy:run
```

## Best Practices

1. **Write Tests First** - Always TDD
2. **Descriptive Test Names** - Explain what's tested
3. **Arrange-Act-Assert** - Clear test structure
4. **Use Database Tasks** - Real data over mocking
5. **Test What Users See** - Avoid `data-testid`, use visible text and roles instead
6. **Test Edge Cases** - Empty states, invalid inputs, boundaries
7. **Test Error Paths** - Not just happy paths
8. **Test Access Control** - Verify role-based permissions
9. **Resilient Test Cleanup** - Clean up in BOTH `before()` and `after()` hooks to handle interrupted runs

## Success Metrics

- All tests passing (green)
- No skipped or disabled tests
- E2E tests cover critical user flows
- Tests catch bugs before production

---

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.