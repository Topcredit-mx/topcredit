import type { EmailT } from '~/lib/email-i18n'

interface EmailTemplateProps {
	fullName: string
	otpCode: string
	location?: string
	ipAddress?: string
	t: EmailT
}

export function OTPTemplate({
	fullName,
	otpCode,
	location = 'Unknown location',
	ipAddress,
	t,
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
					{t('otp.headingPrefix')}
					<span style={{ color: '#0070f3' }}>{t('otp.headingBrand')}</span>
				</h2>
			</div>
			<div style={{ marginBottom: '16px', fontSize: '16px' }}>
				{t('otp.greeting')} <b>{fullName}</b>,
				<br />
				<br />
				{t('otp.intro', { location })}
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
				{t('otp.footer', { location })}{' '}
				<a href="https://topcredit.com/ayuda" style={{ color: '#0070f3' }}>
					{t('otp.helpLink')}
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
