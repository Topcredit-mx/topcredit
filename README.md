# TopCredit

[![Cypress Tests](https://img.shields.io/endpoint?url=https://cloud.cypress.io/badge/detailed/zco6oy/main&style=flat&logo=cypress)](https://cloud.cypress.io/projects/zco6oy/runs)

**Latest E2E (Playwright) HTML report (GitHub Pages):** [topcredit-mx.github.io/topcredit](https://topcredit-mx.github.io/topcredit/)  
Updates after each push when CI publishes a merged report (combined 2-shard run).

> Plataforma de créditos empresariales para empleados de empresas afiliadas

## Overview

TopCredit is a **company-sponsored lending platform** for employees. It includes:

- **Applicant portal** (`/cuenta`): apply for credit, upload documents, track application, and later view credits and payment history.
- **Back office** (`/equipo`): role-based queues for reviewing applications and processing disbursements.

The intended end-to-end flow is documented in `docs/app-flow-proposal.md`.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL (Neon), Drizzle ORM
- NextAuth (email OTP, TOTP, backup codes)
- Tailwind v4, shadcn/ui
- Inngest (queued jobs)
- Resend (email), Vercel (deploy)
- Biome (lint/format)
- Playwright E2E

## Getting started

```bash
git clone <repo-url>
cd topcredit
pnpm install
cp .env.example .env   # then fill in values
pnpm db:push           # sync schema to local DB
pnpm dev
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
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm db:generate` | Generate migration files from schema |
| `pnpm db:migrate` | Apply migrations (use in prod) |
| `pnpm db:push` | Push schema to DB without migration files (dev only) |
| `pnpm db:nuke` | Drop public + drizzle schemas (dev only); run `db:push` after to recreate |
| `pnpm db:nuke:push` | Nuke then push — full hard reset (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm typecheck` | Run TypeScript check |
| `pnpm check` | Run Biome lint |
| `pnpm test:e2e` | Run Playwright E2E |
| `pnpm test:e2e:ui` | Playwright UI mode |
| `pnpm playwright:changed-videos` | List changed Playwright specs and up to 5 matching retained videos, plus up to 5 error videos |

## CI E2E (Neon)

Playwright is split into **[`.github/workflows/playwright-main.yml`](.github/workflows/playwright-main.yml)** (push to `main`) and **[`.github/workflows/playwright-dev.yml`](.github/workflows/playwright-dev.yml)** (other branches). Both use the workflow display name **`E2E`**. Shared jobs live in **[`playwright-base.yml`](.github/workflows/playwright-base.yml)** (`workflow_call`). **GitHub Environments:** **Chromium** (app secrets: `AUTH_SECRET`, email, blob, etc.) always uses **`testing`**. **Neon create** and **Neon purge** use **`staging`** on **`main`** and **`testing`** on branches—put **Neon API** secrets in **`staging`** for main E2E branches; keep app secrets in **`testing`**. On **`main`**, **`wait-production-migrate`** runs first (same SHA as **Production** in [`migrate.yml`](.github/workflows/migrate.yml)), then the base workflow. **Concurrency:** dev **`cancel-in-progress: true`**; **`main`** **`false`**. The Neon [create-branch-action](https://github.com/neondatabase/create-branch-action) is on the latest 6.3.x release. If branch creation returns **HTTP 422**, the project is often over a **Free-plan limit** (for example **storage**), not the branch *count*—check Neon's **Project settings → Usage** and clear old `test-*` branches or reduce `main` size, or upgrade. The UI can still show e.g. **3 / 10** branches while storage is over quota.

If branch protection uses required status checks, register the check name **`E2E`**. (Both workflow files set `name: E2E`; only one of them runs per push, depending on the branch. If the GitHub UI shows two similar entries, match by workflow file: `playwright-dev.yml` vs `playwright-main.yml`.)

### Changed Playwright videos for PRs

Playwright writes videos only for failures (`video: 'retain-on-failure'`) under the ignored `test-results/` directory. The videos are not committed. CI uploads `test-results/` as a GitHub Actions artifact for 14 days, and also uploads a smaller `changed-playwright-videos-*` artifact with selected changed-spec videos and error videos for 1 day.

After an E2E run, generate a markdown summary for spec files changed since `origin/main`:

```bash
pnpm playwright:changed-videos --output changed-playwright-videos.md
```

Options:

- `--base-ref <ref>`: compare against another ref instead of `origin/main`.
- `--results-dir <dir>`: read videos from another Playwright results directory.
- `--max-videos <n>`: cap each video section, default `5`.
- `--artifact-dir <dir>`: copy the selected videos and summary into a directory that can be uploaded as an expiring CI artifact.

To compare against a previous CI run instead of `origin/main`, pass that run's head SHA or branch ref:

```bash
pnpm playwright:changed-videos --base-ref <previous-run-sha> --output changed-playwright-videos.md
```

In CI, the workflow runs this command with `--artifact-dir changed-playwright-videos` after Playwright finishes, then uploads that directory with `retention-days: 1`. The artifact includes up to 5 videos for changed specs and up to 5 videos from any retained Playwright errors. On pushes to a branch with an open PR, the workflow also **upserts a PR comment** with the merged shard summaries and a link to the workflow run (videos stay in the artifact ZIP; GitHub does not embed video in comments). Locally, omitting `--artifact-dir` prints absolute paths to the ignored `test-results/` files.

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
