'use client'

import { useEffect } from 'react'

const FOCUSABLE_SELECTOR =
	'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
