---
name: Error messages and keys consistency
overview: Standardise use of Spanish copy vs i18n error keys in server schemas and DB so validation errors are consistent and translatable where needed.
todos: []
isProject: false
---

# Error messages / keys consistency

## Current state

- `**src/server/db/schema.ts**`  
  - Only enum/domain values (e.g. `APPLICATION_STATUS_VALUES`, `'invalid-documentation'`). No user-facing error messages. No change needed here.
- `**src/server/schemas.ts**`  
  - **Spanish messages:** Many Zod schemas use hardcoded Spanish in `.min()`, `.refine()`, `message:`, etc. (e.g. `'El nombre es requerido'`, `'Documento no válido'`, `'Estado no válido'`). Used by company creation, application creation, update status (partial), document upload, etc.
  - **i18n keys:** Document status and application status **parsers** return error **keys** (e.g. `'applications-document-rejection-reason-required'`, `'applications-error-generic'`, `'applications-reason-required'`) so the app UI can translate them. The document-status refine also uses an i18n key as `message`.

So we have a **mix**: some validation shows Spanish directly (wherever that schema’s errors are rendered), and the app-facing document/application status flows use keys and translate in the UI.

## Recommended convention

1. **App-facing validation (errors shown in the main app UI)**
  Use **i18n keys** in Zod where possible (e.g. refine `message`), and have parsers return only those keys. UI translates via `t(key)`. Keeps one locale source (e.g. `es.json`) and allows adding more later.
2. **Server-only / admin / internal**
  Either keep Spanish in schemas for simplicity, or move to i18n keys as well for consistency. Prefer one approach project-wide.
3. `**src/server/db/schema.ts`**
  Keep as-is: only DB/enum values, no user-facing error strings.

## Optional next steps (migration)

- Audit `schemas.ts`: list each schema and whether its errors are shown in the app or only server/admin.
- For app-facing schemas: replace Spanish Zod messages with i18n keys and ensure those keys exist in `src/messages/es.json` (and any other locales). Use a single set of error-key constants (like `DOCUMENT_STATUS_ERROR_KEYS`) where it helps.
- For server-only schemas: either document “Spanish only” or migrate to keys and translate in the single place they’re surfaced.

