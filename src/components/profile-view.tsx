'use client'

import { CheckCircle2, Shield, User, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Role } from '~/lib/auth-utils'
import { Badge } from '~/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'

const ROLE_KEYS: Record<Role, string> = {
	customer: 'role-customer',
	employee: 'role-employee',
	requests: 'role-requests',
	admin: 'role-admin',
}

interface ProfileViewProps {
	user: {
		name: string
		email: string
		emailVerified: Date | null
	}
	roles: Role[]
}

export function ProfileView({ user, roles }: ProfileViewProps) {
	const t = useTranslations('profile')
	const formatDate = (date: Date | null) => {
		if (!date) return t('never')
		return new Intl.DateTimeFormat('es-ES', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(date))
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						{t('card-title')}
					</CardTitle>
					<CardDescription>{t('card-description')}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<p className="text-muted-foreground text-sm">{t('name')}</p>
						<p className="font-medium">{user.name}</p>
					</div>
					<div className="flex items-center gap-2 text-sm">
						{user.emailVerified ? (
							<>
								<CheckCircle2 className="h-4 w-4 text-green-600" />
								<span className="text-green-600">
									{t('email-verified-at', {
										date: formatDate(user.emailVerified),
									})}
								</span>
							</>
						) : (
							<>
								<XCircle className="h-4 w-4 text-orange-600" />
								<span className="text-orange-600">{t('email-not-verified')}</span>
							</>
						)}
					</div>
					<div>
						<p className="text-muted-foreground text-sm">{t('email')}</p>
						<p className="font-medium">{user.email}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5" />
						{t('roles-title')}
					</CardTitle>
					<CardDescription>{t('roles-description')}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						{roles.length === 0 ? (
							<span className="text-muted-foreground text-sm">
								{t('no-roles')}
							</span>
						) : (
							roles.map((role) => (
								<Badge key={role} variant="secondary">
									{t(ROLE_KEYS[role])}
								</Badge>
							))
						)}
					</div>
				</CardContent>
			</Card>
		</>
	)
}
