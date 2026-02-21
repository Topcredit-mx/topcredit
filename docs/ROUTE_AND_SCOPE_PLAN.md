# Route and Company Scope Implementation Plan

## Phase A: Strip /admin from paths (flatten routes) ✅ DONE

**Goal:** Admin = agent + extra sidebar routes. No `/app/admin` segment.

### Route changes
| Old | New |
|-----|-----|
| `/app/admin/users` | `/app/users` |
| `/app/admin/companies` | `/app/companies` |
| `/app/admin/companies/new` | `/app/companies/new` |
| `/app/admin/companies/[domain]/edit` | `/app/companies/[domain]/edit` |

### Files to update (in order)

**Step 1: Update tests first (TDD)**
- `src/app/app/admin/users/users.cy.ts` – change all `/app/admin/users` → `/app/users`
- `src/app/app/admin/companies/companies.cy.ts` – change all `/app/admin/companies` → `/app/companies`, edit paths
- `cy.intercept('POST', '**/app/admin/users**')` → `**/app/users**`
- `admin-overview-dashboard.cy.ts`, `admin-company-switcher.cy.ts` – check for admin path refs

**Step 2: Move route files**
- `app/admin/users/*` → `app/users/*`
- `app/admin/companies/*` → `app/companies/*`
- Delete empty `app/admin/` folder

**Step 3: Update app code**
- `components/app/app-sidebar.tsx` – nav URLs to `/app/users`, `/app/companies`; remove or rename "Admin" group to "System"/"Config"
- `app/admin/companies/companies-table.tsx` → `app/companies/` – update `createLink`, edit `href`
- `server/mutations.ts` – all `revalidatePath` and `redirect` from `/app/admin/*` → `/app/*`
- `proxy.ts` – `/app/admin` check → `/app/users` and `/app/companies` (admin-only path checks)
- `components/ui/data-table/data-table-provider.tsx` – if it builds admin paths
- `ROLES_DOCUMENTATION.md` – update path examples

---

## Phase B: Company scope (single / multi / all) ✅ DONE

**Goal:** When no company selected:
- **Admin** → all-company view (default)
- **Agent** → multi-company view (assigned companies, default)
- **Company selected** → single-company view (both)

### Implemented behavior
| State | Admin | Agent |
|-------|-------|-------|
| Company selected | Single-company | Single-company |
| No company selected | All-company (default) | Multi-company (assigned only, default) |

### Completed work
1. **`getEffectiveCompanyScope()`** in `src/server/scopes.ts` – returns `CompanyScope`
2. **`getAbility`** extended – returns `{ ability, assignedCompanyIds }`; removed `getAssignedCompanyIds`
3. **Queries** – `getApplicationsForReview`, `getApplicationForReview` take `scope: CompanyScope`
4. **Layout** – removed `AgentNoCompanyPickedEmpty`; only shows `AgentNoAssignmentsEmpty` when agent has no companies
5. **Company switcher** – "Vista general" (admin) / "Todas mis empresas" (agent) when no selection; "All" option for both
6. **E2E tests** – Agent/admin with no company selected see applications (multi/all scope); `applications-review.cy.ts`


