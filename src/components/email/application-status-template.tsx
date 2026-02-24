import type { ApplicationStatus } from '~/server/db/schema'

interface ApplicationStatusTemplateProps {
	status: ApplicationStatus
	creditAmountFormatted: string
	termLabel: string
	reason?: string | null
}

const STATUS_HEADINGS: Record<
	ApplicationStatus,
	{ title: string; subtitle: string; highlightColor: string }
> = {
	new: { title: 'Solicitud nueva', subtitle: '', highlightColor: '#666' },
	pending: { title: 'Solicitud en revisión', subtitle: '', highlightColor: '#666' },
	'invalid-documentation': {
		title: 'Documentación requerida',
		subtitle: 'Tu solicitud requiere atención',
		highlightColor: '#b45309',
	},
	'pre-authorized': {
		title: '¡Pre-autorizado!',
		subtitle: 'Tu crédito ha sido pre-autorizado',
		highlightColor: '#0070f3',
	},
	authorized: {
		title: '¡Autorizado!',
		subtitle: 'Tu crédito ha sido autorizado',
		highlightColor: '#15803d',
	},
	denied: {
		title: 'Solicitud denegada',
		subtitle: 'Tu solicitud de crédito no fue aprobada',
		highlightColor: '#b91c1c',
	},
}

export function ApplicationStatusTemplate({
	status,
	creditAmountFormatted,
	termLabel,
	reason,
}: ApplicationStatusTemplateProps) {
	const config = STATUS_HEADINGS[status]
	return (
		<div
			style={{
				fontFamily: 'Arial, sans-serif',
				background: '#fafbfc',
				padding: '32px',
				borderRadius: '8px',
				maxWidth: '480px',
				margin: '0 auto',
				color: '#222',
			}}
		>
			<div style={{ textAlign: 'center', marginBottom: '24px' }}>
				<div style={{ fontSize: '48px', marginBottom: '8px' }}>▲</div>
				<h2 style={{ fontWeight: 600, color: config.highlightColor }}>
					{config.title}
				</h2>
				{config.subtitle ? (
					<p style={{ marginTop: '8px', color: '#555', fontSize: '15px' }}>
						{config.subtitle}
					</p>
				) : null}
			</div>
			<div style={{ marginBottom: '16px', fontSize: '16px' }}>
				Hola,
				<br />
				<br />
				Te informamos que el estado de tu solicitud de crédito ha sido actualizado.
				<br />
				<br />
				<strong>Resumen:</strong>
				<br />
				Monto: {creditAmountFormatted}
				<br />
				Plazo: {termLabel}
				<br />
				Estado: <strong>{config.title}</strong>
			</div>
			{reason ? (
				<div
					style={{
						marginTop: '16px',
						padding: '16px',
						background: '#fef2f2',
						borderRadius: '8px',
						fontSize: '14px',
						color: '#374151',
					}}
				>
					<strong>Motivo / detalle:</strong>
					<br />
					{reason}
				</div>
			) : null}
			<div style={{ fontSize: '12px', color: '#666', marginTop: '24px' }}>
				Puedes ver el detalle de tu solicitud en tu panel de Topcredit.
			</div>
		</div>
	)
}
