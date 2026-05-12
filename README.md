# TopCredit

TopCredit is a **company-sponsored lending platform** for employees. It includes:

- **Applicant portal** (`/cuenta`): apply for credit, upload documents, track application, and later view credits and payment history.
- **Back office** (`/equipo`): role-based queues for reviewing applications and processing disbursements.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL (Neon), Drizzle ORM
- NextAuth (email OTP, TOTP, backup codes)
- Tailwind v4, shadcn/ui
- Inngest (queued jobs)
- Resend (email), Vercel (deploy)
- Bun (package manager & script runner)
- Biome (lint/format)
- Playwright E2E

**Latest E2E (Playwright) HTML report (GitHub Pages):** [topcredit-mx.github.io/topcredit](https://topcredit-mx.github.io/topcredit/)  
Updates after each push when CI publishes a merged report (combined 2-shard run).

## Getting started

```bash
git clone <repo-url>
cd topcredit
bun install
cp .env.example .env   # then fill in values
bun run db:push        # sync schema to local DB
bun run dev
```

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (Neon) |
| `AUTH_SECRET` | NextAuth secret (e.g. `openssl rand -base64 32`) |
| `AUTH_URL` | App URL (`http://localhost:3000` in dev) |
| `EMAIL_FROM` | Sender address for Resend |
| `RESEND_API_KEY` | Resend API key |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for application document storage. **Required for Playwright E2E** (document upload tests). |
| `E2E_OTP_CODE` | **Required for Playwright E2E** locally. Fixed 6-digit OTP; when set the app runs in E2E mode (fixed OTP, emails skipped). |
| `INNGEST_EVENT_KEY` | (Optional) [Inngest](https://www.inngest.com) event key for queuing operations (e.g. email sends in production). |

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run start` | Run production server |
| `bun run db:generate` | Generate migration files from schema |
| `bun run db:migrate` | Apply migrations (use in prod) |
| `bun run db:push` | Push schema to DB without migration files (dev only) |
| `bun run db:nuke` | Drop public + drizzle schemas (dev only); run `db:push` after to recreate |
| `bun run db:nuke:push` | Nuke then push — full hard reset (dev only) |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run typecheck` | Run TypeScript check |
| `bun run check` | Run Biome lint |
| `bun run test:e2e` | Run Playwright E2E |
| `bun run test:e2e:ui` | Playwright UI mode |

## CI E2E (Neon)

Playwright is split into **[`.github/workflows/playwright-main.yml`](.github/workflows/playwright-main.yml)** (push to `main`) and **[`.github/workflows/playwright-dev.yml`](.github/workflows/playwright-dev.yml)** (other branches). Both use the workflow display name **`E2E`**. Shared jobs live in **[`playwright-base.yml`](.github/workflows/playwright-base.yml)** (`workflow_call`). **GitHub Environments:** **Chromium** (app secrets: `AUTH_SECRET`, email, blob, etc.) always uses **`testing`**. **Neon create** and **Neon purge** use **`staging`** on **`main`** and **`testing`** on branches—put **Neon API** secrets in **`staging`** for main E2E branches; keep app secrets in **`testing`**. On **`main`**, **`wait-production-migrate`** runs first (same SHA as **Production** in [`migrate.yml`](.github/workflows/migrate.yml)), then the base workflow. **Concurrency:** dev **`cancel-in-progress: true`**; **`main`** **`false`**. The Neon [create-branch-action](https://github.com/neondatabase/create-branch-action) is on the latest 6.3.x release. If branch creation returns **HTTP 422**, the project is often over a **Free-plan limit** (for example **storage**), not the branch *count*—check Neon's **Project settings → Usage** and clear old `test-*` branches or reduce `main` size, or upgrade. The UI can still show e.g. **3 / 10** branches while storage is over quota.

If branch protection uses required status checks, register the check name **`E2E`**. (Both workflow files set `name: E2E`; only one of them runs per push, depending on the branch. If the GitHub UI shows two similar entries, match by workflow file: `playwright-dev.yml` vs `playwright-main.yml`.)

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| Quality | Every push | Typecheck, Biome, unit tests (`code-quality.yml`) |
| E2E | Push to branches other than `main` | **`playwright-dev.yml`**: **`testing`** for Neon + Chromium; reusable base; **Create DB Branch** → **Chromium** → **Delete DB Branch**; blob reports → **static report URL** above. |
| E2E | Push to `main` | **`playwright-main.yml`**: **`wait-production-migrate`**, then base: Neon create/purge in **`staging`**, Chromium in **`testing`**. |
| Production | Push to `main` | Runs in `production` env: generate, fail on uncommitted migration drift, then `db:migrate`. Needs `DATABASE_URL` in production environment secrets. |

## Project structure

```
src/
├── app/              # Routes (cuenta, equipo, settings, login, api/auth)
├── components/       # UI + feature components (incl. i18n-provider)
├── i18n/             # next-intl request config (request.ts)
├── lib/              # Shared utils, auth-utils, totp
├── messages/         # i18n: es.json (and later en.json)
├── server/           # db (schema, client), auth (config, users), mutations, queries
└── proxy.ts          # Next 16 proxy (auth redirects, route protection)
```

---

The goal is to provide accessible, transparent credit to applicants (workers at affiliated companies) while maintaining rigorous security and compliance standards.
