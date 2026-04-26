'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getEquipoApplicationCreditSearchRows } from '~/server/queries'
import {
	getCompaniesForSwitcher,
	getEffectiveCompanyScope,
} from '~/server/scopes'

export type EquipoGlobalSearchItem = {
	applicationId: number
	creditId: number | null
	applicantName: string
	applicantEmail: string
	companyName: string
	companyDomain: string
	applicationStatus: string
	creditStatus: string | null
	transferAmount: string | null
	payrollNumber: string | null
}

export async function searchEquipoApplicationsAndCredits(
	query: string,
): Promise<EquipoGlobalSearchItem[]> {
	await getRequiredAgentUser()
	const scope = await getEffectiveCompanyScope()
	const { ability } = await getAbility()
	const rows = await getEquipoApplicationCreditSearchRows({ scope, query })

	const out: EquipoGlobalSearchItem[] = []
	for (const row of rows) {
		const canReadApp = ability.can(
			'read',
			subject('Application', {
				id: row.applicationId,
				applicantId: row.applicantId,
				companyId: row.companyId,
			}),
		)
		if (!canReadApp) continue

		if (row.creditId !== null) {
			const canReadCredit = ability.can(
				'read',
				subject('Credit', {
					id: row.creditId,
					applicantId: row.applicantId,
					companyId: row.companyId,
				}),
			)
			if (!canReadCredit) {
				out.push({
					applicationId: row.applicationId,
					creditId: null,
					applicantName: row.applicantName,
					applicantEmail: row.applicantEmail,
					companyName: row.companyName,
					companyDomain: row.companyDomain,
					applicationStatus: row.applicationStatus,
					creditStatus: null,
					transferAmount: null,
					payrollNumber: row.payrollNumber,
				})
				continue
			}
		}

		out.push({
			applicationId: row.applicationId,
			creditId: row.creditId,
			applicantName: row.applicantName,
			applicantEmail: row.applicantEmail,
			companyName: row.companyName,
			companyDomain: row.companyDomain,
			applicationStatus: row.applicationStatus,
			creditStatus: row.creditStatus,
			transferAmount: row.transferAmount,
			payrollNumber: row.payrollNumber,
		})
	}
	return out
}

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
