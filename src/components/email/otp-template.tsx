interface EmailTemplateProps {
	fullName: string
	otpCode: string
	location?: string
	ipAddress?: string
}

export function OTPTemplate({
	fullName,
	otpCode,
	location = 'Unknown location',
	ipAddress,
}: EmailTemplateProps) {
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
					Verifica tu correo para iniciar sesión en{' '}
					<span style={{ color: '#0070f3' }}>Topcredit</span>
				</h2>
			</div>
			<div style={{ marginBottom: '16px', fontSize: '16px' }}>
				Hola <b>{fullName}</b>,
				<br />
				<br />
				Hemos recibido un intento de inicio de sesión desde <b>{location}</b>.
				<br />
				Para completar el proceso, ingresa el siguiente código de 6 dígitos en
				la ventana original:
			</div>
			<div style={{ textAlign: 'center', margin: '32px 0' }}>
				<span
					style={{
						fontSize: '32px',
						letterSpacing: '8px',
						background: '#fff',
						padding: '16px 32px',
						borderRadius: '8px',
						border: '1px solid #eee',
						display: 'inline-block',
					}}
				>
					{otpCode}
				</span>
			</div>
			<div style={{ fontSize: '12px', color: '#666', marginTop: '24px' }}>
				Si no intentaste iniciar sesión desde {location} o si la ubicación no
				coincide, ignora este correo. No compartas el código con nadie. Nuestro
				equipo de soporte nunca lo solicitará. Ten cuidado con intentos de
				phishing y verifica siempre el remitente y el dominio (topcredit.com)
				antes de actuar. Si tienes dudas sobre la seguridad de tu cuenta, visita
				nuestra{' '}
				<a href="https://topcredit.com/ayuda" style={{ color: '#0070f3' }}>
					página de ayuda
				</a>
				.
				{ipAddress && (
					<>
						<br />
						<br />
						<span style={{ fontSize: '11px', color: '#999' }}>
							IP: {ipAddress}
						</span>
					</>
				)}
			</div>
		</div>
	)
}
