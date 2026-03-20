'use client'

import { Shield, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '~/components/ui/badge'
import { SectionCard } from '~/components/ui/section-card'
import { PROFILE_ROLE_KEYS } from '~/lib/i18n-keys'
import type { Role } from '~/server/auth/session'

interface ProfileViewProps {
	user: {
		name: string
		email: string
	}
	roles: Role[]
}

export function ProfileView({ user, roles }: ProfileViewProps) {
	const t = useTranslations('profile')

	return (
		<div className="space-y-8">
			<SectionCard
				icon={User}
				title={t('card-title')}
				description={t('card-description')}
			>
				<div className="space-y-0 divide-y divide-slate-100">
					<div className="pb-5">
						<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							{t('name')}
						</p>
						<p className="mt-1.5 font-medium text-slate-900">{user.name}</p>
					</div>
					<div className="pt-5">
						<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							{t('email')}
						</p>
						<p className="mt-1.5 font-medium text-slate-900">{user.email}</p>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				icon={Shield}
				title={t('roles-title')}
				description={t('roles-description')}
			>
				<div className="flex flex-wrap gap-2">
					{roles.length === 0 ? (
						<span className="text-slate-600 text-sm">{t('no-roles')}</span>
					) : (
						roles.map((role) => (
							<Badge
								key={role}
								className="border-transparent bg-slate-100 font-medium text-slate-800"
							>
								{t(PROFILE_ROLE_KEYS[role])}
							</Badge>
						))
					)}
				</div>
			</SectionCard>
		</div>
	)
}
