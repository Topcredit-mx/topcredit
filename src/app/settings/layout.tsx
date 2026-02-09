import { SettingsNav } from '~/components/settings-nav'

export default function SettingsLayout({
	children,
}: { children: React.ReactNode }) {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<div className="space-y-6">
				<div>
					<h1 className="font-bold text-3xl">Configuración</h1>
					<p className="text-muted-foreground">
						Perfil y seguridad de tu cuenta
					</p>
				</div>
				<SettingsNav />
				{children}
			</div>
		</div>
	)
}
