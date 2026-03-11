'use client'

import { useEffect } from 'react'

const FOCUSABLE_SELECTOR =
	'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Ensures Tab / Shift+Tab move focus in DOM order within a focus scope, with wrap.
 * Use when the scope contains a textarea (where Tab would otherwise insert a tab
 * character) or when a focus trap (e.g. Radix dialog) prevents correct Tab order.
 *
 * Works with any overlay or scope: pass a boolean that is true when the scope is
 * active (e.g. dialog open, sheet visible) and a selector that matches the scope
 * container. Focus order follows DOM order of focusable elements inside it.
 *
 * @param enabled - Whether the scope is active; the listener is only attached when true.
 * @param scopeSelector - CSS selector for the scope container. Must be unique per scope.
 *
 * @example
 * // In a dialog:
 * useTabNavigationScope(open, '[data-slot="dialog-content"][data-my-dialog]')
 *
 * // In a sheet:
 * useTabNavigationScope(isOpen, '[data-slot="sheet-content"][data-my-sheet]')
 */
export function useTabNavigationScope(enabled: boolean, scopeSelector: string) {
	useEffect(() => {
		if (!enabled) return
		function handleTab(e: KeyboardEvent) {
			if (e.key !== 'Tab') return
			const scope = document.activeElement?.closest(
				scopeSelector,
			) as HTMLElement | null
			if (!scope) return
			const list = scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
			if (!list.length) return
			e.preventDefault()
			const focusables = Array.from(list)
			const current = document.activeElement
			const idx = focusables.indexOf(current as HTMLElement)
			const next = e.shiftKey ? idx - 1 : idx + 1
			const nextIdx =
				next < 0 ? focusables.length - 1 : next >= focusables.length ? 0 : next
			const target = focusables[nextIdx]
			if (target) target.focus()
		}
		document.addEventListener('keydown', handleTab, true)
		return () => document.removeEventListener('keydown', handleTab, true)
	}, [enabled, scopeSelector])
}
