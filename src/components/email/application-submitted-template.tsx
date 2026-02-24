interface ApplicationSubmittedTemplateProps {
	creditAmountFormatted: string
	termLabel: string
}

export function ApplicationSubmittedTemplate({
	creditAmountFormatted,
	termLabel,
}: ApplicationSubmittedTemplateProps) {
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
				<h2 style={{ fontWeight: 600 }}>
					Solicitud recibida en{' '}
					<span style={{ color: '#0070f3' }}>Topcredit</span>
				</h2>
			</div>
			<div style={{ marginBottom: '16px', fontSize: '16px' }}>
				Hola,
				<br />
				<br />
				Recibimos tu solicitud de crédito correctamente.
				<br />
				<br />
				<strong>Resumen:</strong>
				<br />
				Monto: {creditAmountFormatted}
				<br />
				Plazo: {termLabel}
			</div>
			<div
				style={{
					marginTop: '24px',
					padding: '16px',
					background: '#f0f7ff',
					borderRadius: '8px',
					fontSize: '15px',
				}}
			>
				<strong>Próximos pasos:</strong>
				<br />
				Tu solicitud será revisada. Te notificaremos por correo cuando haya un
				cambio de estado (pre-autorización, autorización o si necesitamos más
				datos o documentación).
				<br />
				<br />
				Puedes consultar el estado en cualquier momento desde tu panel en
				Topcredit.
			</div>
			<div style={{ fontSize: '12px', color: '#666', marginTop: '24px' }}>
				Si no realizaste esta solicitud, contacta a soporte de inmediato.
			</div>
		</div>
	)
}
