import { Building2 } from 'lucide-react'

export function EmployeeNoCompanyPickedEmpty() {
	return (
		<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-muted">
				<Building2 className="size-8 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<h2 className="font-semibold text-lg">Selecciona una empresa</h2>
				<p className="max-w-sm text-muted-foreground text-sm">
					Usa el selector de empresa en la barra lateral para elegir con qué
					empresa quieres trabajar.
				</p>
			</div>
		</div>
	)
}
