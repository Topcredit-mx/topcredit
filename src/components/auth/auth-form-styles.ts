/** Page title on auth / verify / setup flows (inside `AuthPageShell`). */
export const authPageTitleClass =
	'font-semibold text-2xl text-slate-900 tracking-tight sm:text-3xl'

/** Subtitle / lead under auth page titles. */
export const authPageSubtitleClass =
	'max-w-sm text-pretty text-slate-600 text-sm leading-relaxed'

/** Use with `cn(shell.iconChip, authIconChipLinkMotionClass)` for home links. */
export const authIconChipLinkMotionClass = 'transition-opacity hover:opacity-90'

/** Shared Tailwind classes for login / signup forms (matches applicant shell revamp). */
export const authInputClass =
	'h-11 border-slate-200 bg-white shadow-sm focus-visible:border-brand/40 focus-visible:ring-brand/25'

export const authInlineLinkClass =
	'font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand'

/** OTP digit cells (login / verify flows). */
export const authOtpSlotClass =
	'size-11 rounded-lg border-2 border-slate-200 bg-white font-semibold text-lg shadow-sm data-[active=true]:z-10 data-[active=true]:border-brand/70 data-[active=true]:ring-2 data-[active=true]:ring-brand/25'
