---
name: Application documents 3.1.2
overview: "Implement application documents: application_documents table (schema + migration), blob storage (Vercel Blob), upload and list APIs with auth. Split into five parts (A1, A2, A3, A4, B) so each stays under ~100 lines."
todos: []
isProject: false
---

# Application documents — 3.1.2 (rebuilt)

Task: `application_documents` table (document types: authorization, contract, payroll-receipt; status: pending, approved, rejected); storage: **Vercel Blob**; upload + list APIs and auth.

Auth: Reuse Application subject. No new CASL subject. Document access = can read Application; only applicant can upload (enforce in upload action).

Implementation order: **A1 → A2 → A3 → A4 → B**. Each part is one focused deliverable.

---

## Part A1 — Schema and migration only ✅ Done

**Goal:** Add table and run migration. No storage or APIs.

- **File:** [src/server/db/schema.ts](src/server/db/schema.ts)
  - Add `documentTypeEnum`: values `authorization`, `contract`, `payroll-receipt` (kebab-case). Export const array + pgEnum.
  - Add `documentStatusEnum`: values `pending`, `approved`, `rejected`.
  - Add table `application_documents`: id (serial PK), applicationId (FK to applications, onDelete cascade), documentType, status, storageKey (text not null), fileName (text not null), rejectionReason with CHECK vs status, createdAt, updatedAt. Index on (application_id, document_type).
  - Add relations: `applicationDocumentsRelations`; add `documents: many(applicationDocuments)` to `applicationsRelations`.
- **Migration:** Applied (e.g. drizzle/0001_*.sql).

**Estimate:** ~70 lines.

---

## Part A2 — Storage only ✅ Done

**Goal:** Blob abstraction and env. No APIs yet.

- **Storage: Vercel Blob only.** Dependency: `@vercel/blob`. **Env:** [src/env.js](src/env.js) — optional server var `BLOB_READ_WRITE_TOKEN`.
- **File:** [src/server/storage.ts](src/server/storage.ts) — generic Vercel Blob layer (no application-specific API):
  - `APPLICATION_DOCUMENTS_PREFIX` — use for pathnames: `application-documents/${applicationId}/${documentType}/${fileName}`.
  - `uploadBlob(pathname, body, options?)` → `{ url: string }`. Store returned `url` as `storageKey` in DB.
  - `deleteBlob(url)`.
  - `listBlobs(prefix?)` → `{ blobs, cursor? }`.
- Public blobs: `storageKey` in DB is the blob URL. No `getDocumentUrl` — use `row.storageKey` as the document URL.

**Estimate:** ~50 lines.

---

## Part A3 — List API and validation schemas ✅ Done

**Goal:** List documents for an application with auth. Depends on A1 and A2.

- **File:** [src/server/schemas.ts](src/server/schemas.ts) — add Zod enums for document type and document status (use `DOCUMENT_TYPE_VALUES` / `DOCUMENT_STATUS_VALUES` from schema).
- **File:** [src/server/queries.ts](src/server/queries.ts) — new query `getApplicationDocuments(applicationId: number)`:
  - Fetch application (applicantId, companyId for auth).
  - `requireAbility(ability, 'read', subject('Application', { id, applicantId, companyId }))`.
  - Query `application_documents` for that applicationId; for each row use `row.storageKey` as the document URL (public blob).
  - Return list of `{ id, applicationId, documentType, status, fileName, url }` (e.g. ordered by createdAt).

**Estimate:** ~60 lines.

---

## Part A4 — Upload API (next)

**Goal:** Server action to upload a document. Depends on A1, A2, A3 (schemas).

- **File:** [src/server/mutations.ts](src/server/mutations.ts) — new action `uploadApplicationDocument(_prevState, formData: FormData)`:
  - Parse applicationId and documentType from formData; get file from formData (type guard for File).
  - Load application; `requireAbility(ability, 'read', subject('Application', { ... }))`; then require `application.applicantId === session.user.id` (only applicant may upload).
  - Build pathname: `${APPLICATION_DOCUMENTS_PREFIX}${applicationId}/${documentType}/${fileName}` (sanitize fileName if needed). Call `uploadBlob(pathname, file)`; insert row into `application_documents` with status `pending`, `storageKey = blob.url`, `fileName`.
  - Option: enforce one document per (applicationId, documentType) (replace or reject duplicate).
  - Use `getRequiredApplicantUser()` and same patterns as [createApplication](src/server/mutations.ts).

**Estimate:** ~55 lines.

---

## Part B — UI

**Goal:** List and upload on application detail.

- **Applicant:** [src/app/dashboard/applications/[id]/page.tsx](src/app/dashboard/applications/[id]/page.tsx) — call `getApplicationDocuments(applicationId)`; render list (type, status, link via url). Add upload form (file input, documentType select, submit) calling `uploadApplicationDocument` (see [form-creation skill](.cursor/skills/form-creation/SKILL.md)).
- **Agent (optional):** [src/app/app/applications/[id]/page.tsx](src/app/app/applications/[id]/page.tsx) — same list query; show documents read-only. No upload.

**Estimate:** ~80–120 lines.

---

## Summary


| Part   | Status  | Deliverable                                                            |
| ------ | ------- | ---------------------------------------------------------------------- |
| **A1** | ✅ Done  | Schema + migration                                                     |
| **A2** | ✅ Done  | Env + generic storage module (`uploadBlob`, `deleteBlob`, `listBlobs`) |
| **A3** | ✅ Done  | Zod enums + `getApplicationDocuments` query                            |
| **A4** | Next    | `uploadApplicationDocument` action (uses `uploadBlob` + pathname)      |
| **B**  | Pending | UI list + upload form                                                  |


No changes to [ability.ts](src/server/auth/ability.ts). E2E for upload + list can be added in Part B.