/**
 * Shared product-shell Tailwind class strings.
 * Brand colors use `@theme` tokens (`brand`, `brand-hover`, …); shadows use `shadow-*` theme keys.
 */
export const shell = {
	elevatedCard:
		'rounded-xl border border-slate-200/80 bg-white shadow-elevated',
	dashboardHeroCard:
		'overflow-hidden rounded-3xl border-0 bg-white py-6 shadow-hero',
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
} as const
