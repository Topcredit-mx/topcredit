# i18n infrastructure plan

## Goal

Add the minimal infrastructure for translations so we can later move all UI copy to message keys and (optionally) add locale switching. No new runtime dependency; KISS.

## Current state

- All copy is Spanish, hardcoded in components.
- Root layout: `lang="es"`, metadata `locale: 'es_MX'`.
- No translation library.

## Plan

### 1. Message files

- **Single locale for now:** `src/messages/es.ts` (TypeScript for future type-safe keys).
- **Shape:** Nested object by area, e.g. `{ dashboard: { title: 'Mi Cuenta' }, common: { save: 'Guardar' } }`.
- One file per locale later: `es.ts`, `en.ts`; we only add `es` in this prep.

### 2. Locale resolution

- **`src/lib/i18n.ts`** (server-safe):
  - `DEFAULT_LOCALE = 'es'`.
  - `getLocale()`: returns `DEFAULT_LOCALE` for now (later: cookie or header).
  - `getMessages(locale)`: returns the message object for that locale (for now only `es`).
  - `t(messages, key, params?)`: looks up dot-path key (`'dashboard.title'`), optional `params` for `{{var}}` interpolation.
  - `getT(locale)`: async, returns a function `(key, params?) => string` for server use.

### 3. Server usage

- In server components: `const t = await getT(getLocale())` then `t('dashboard.title')`.
- No change to RSC data loading; messages are loaded once per request in layout or per page.

### 4. Client usage

- **Provider:** Layout (server) loads messages and passes them to a client **I18nProvider**.
- **Hook:** `useT()` returns `t(key, params?)` so client components use the same API.
- **Flow:** Root layout is async, calls `getMessages(getLocale())`, passes `messages` into `<Providers messages={messages}>`. Providers wrap children with `I18nProvider` when `messages` is provided; `useT()` reads from context.

### 5. Files to add/change

| File | Action |
|------|--------|
| `src/messages/es.ts` | Add: nested Spanish messages (stub by area: dashboard, settings, common, auth). |
| `src/lib/i18n.ts` | Add: DEFAULT_LOCALE, getLocale, getMessages, t, getT. |
| `src/components/i18n-provider.tsx` | Add: I18nProvider (accepts messages), useT() hook. |
| `src/app/providers.tsx` | Change: accept optional `messages`, render I18nProvider when present. |
| `src/app/layout.tsx` | Change: async, get messages, pass to Providers. |

### 6. Proof of concept

- Migrate **one** string to the new system (e.g. dashboard page title "Mi Cuenta" → `t('dashboard.title')`) so server and client paths are exercised. Leave all other copy hardcoded; migration of the rest is a follow-up.

### 7. Out of scope for this prep

- Locale switching (cookie/URL).
- Second locale (e.g. `en`).
- Type-safe keys (we can add a `Messages` type and `keyof` later).
- next-intl or any third-party i18n lib.

## Implementation order

1. Add `src/messages/es.ts` with stub structure and dashboard/settings/common strings we’ll need.
2. Add `src/lib/i18n.ts` with getLocale, getMessages, t, getT.
3. Add `src/components/i18n-provider.tsx` with I18nProvider and useT.
4. Update `src/app/providers.tsx` to accept and pass messages.
5. Update `src/app/layout.tsx` to load messages and pass to Providers.
6. Replace one string on dashboard (e.g. "Mi Cuenta") with `t('dashboard.title')` (server) to verify.
7. (Optional) Replace one string in a client component with `useT()` to verify client path.
