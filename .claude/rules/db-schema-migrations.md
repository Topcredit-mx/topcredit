---
paths:
  - "src/server/db/schema.ts"
---

# Safe DB Schema Migrations

Apply this rule whenever `src/server/db/schema.ts` is changed.

- Always run `pnpm db:generate` after implementing the schema change.
- Review the generated migration before finishing. Do not trust generated SQL blindly.
- The migration must be safe for existing data. Prefer additive, staged migrations and explicit data backfills over destructive changes.
- If the generated migration drops columns or tables, recreates data structures, or otherwise risks data loss, update the migration so data is preserved and migrated forward.
- Always consider existing production data. A schema change is not complete until the migration handles current rows safely.
- After the migration file is safe, run `pnpm db:migrate`.
- If a safe migration path is unclear, stop and ask the user instead of leaving a destructive migration in place.
