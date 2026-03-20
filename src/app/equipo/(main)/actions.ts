'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getCompaniesForSwitcher } from '~/server/scopes'

export async function setSelectedCompanyId(companyId: number | null) {
	const user = await getRequiredAgentUser()
	if (companyId !== null) {
		const { ability } = await getAbility()
		requireAbility(ability, 'read', subject('Company', { id: companyId }))
	}
	const isAdmin = user.roles?.includes('admin') ?? false
	const allowed = await getCompaniesForSwitcher(user.id, isAdmin)
	const allowedIds = new Set(allowed.map((c) => c.id))

	if (companyId !== null && !allowedIds.has(companyId)) {
		return { error: 'No puede seleccionar esa empresa' }
	}

	const cookieStore = await cookies()
	if (companyId === null) {
		cookieStore.delete('selected_company_id')
		revalidatePath('/equipo')
		return { success: true }
	}
	cookieStore.set('selected_company_id', String(companyId), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365,
	})
	revalidatePath('/equipo')
	return { success: true }
}
