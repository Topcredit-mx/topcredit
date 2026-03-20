/**
 * Shared product-shell Tailwind class strings.
 * Brand colors use `@theme` tokens (`brand`, `brand-hover`, …); shadows use `shadow-*` theme keys.
 */
export const shell = {
	elevatedCard:
		'rounded-xl border border-slate-200/80 bg-white shadow-elevated',
	dashboardHeroCard:
		'overflow-hidden rounded-3xl border-0 bg-white py-6 shadow-hero',
	/** Applicant layout: sidebar rail, mobile drawer, main inset (matches auth/landing canvas). */
	applicantCanvas: 'bg-slate-50/80',
	/** H2-style titles on dashboard light surfaces. */
	dashboardSectionTitle:
		'font-semibold text-2xl text-slate-900 tracking-tight sm:text-[1.65rem]',
	portfolioRow:
		'rounded-2xl border border-slate-100/90 bg-white p-5 shadow-portfolio-row',
	portfolioIconWell:
		'flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand shadow-sm',
	/** Upper back navigation (e.g. ← Volver al panel). */
	backLink:
		'mb-4 inline-flex font-semibold text-brand text-[10px] uppercase tracking-[0.14em] hover:underline',
	/** Agreements / secondary inline links in forms. */
	textLink:
		'font-medium text-brand underline underline-offset-2 hover:underline',
	/** Table / list “Ver” style links. */
	textLinkStrong: 'font-semibold text-brand hover:underline',
	/** Section header icon chip (matches `SectionTitleRow`). */
	iconChip:
		'flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand',
	/** Ghost control that highlights with brand on hover. */
	controlGhostBrand:
		'font-semibold text-brand hover:bg-brand/10 hover:text-brand',
	/** Inputs on neutral wells (e.g. draft flow). */
	inputOnMuted:
		'h-11 rounded-lg border-0 bg-slate-100 shadow-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-0',
	/**
	 * Destructive alert panel (merge padding, alignment, or `bg-red-50/60` etc. with `cn()`).
	 */
	alertErrorSurface:
		'rounded-xl border border-red-200 bg-red-50/70 text-red-900',
	/**
	 * Centered dashed document upload tile (new application + applicant detail upload).
	 * Matches `ApplicationForm` document section.
	 */
	applicantDocumentUploadTile:
		'flex flex-col items-center rounded-xl border border-slate-300 border-dashed bg-white px-4 py-6 text-center shadow-sm transition-colors',
	/** Circular icon well on document tiles (`FileText` / `Upload` at `size-6`). */
	applicantDocumentTileIconWell:
		'mb-3 flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand',
	/** Solid-bordered tile for uploaded docs on application detail (status via border/bg). */
	applicantDocumentStatusTileBase:
		'flex min-w-0 flex-col items-center rounded-xl border bg-white px-4 py-4 text-center shadow-sm',
	/** “Examinar archivos” / “Ver” style on document tiles. */
	applicantDocumentTileActionButton:
		'h-9 w-full rounded-lg border-0 bg-slate-200/80 font-medium text-brand text-xs shadow-none hover:bg-slate-200',
} as const
