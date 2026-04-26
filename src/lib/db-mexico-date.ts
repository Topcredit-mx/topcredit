import { type SQL, sql } from 'drizzle-orm'

/**
 * PostgreSQL expression for the current **calendar date** in `America/Mexico_City`.
 * Use instead of `CURRENT_DATE` so overdue / window logic matches Mexico business days
 * regardless of the DB session timezone.
 */
export const sqlTodayMexicoCity: SQL = sql`(now() AT TIME ZONE 'America/Mexico_City')::date`
