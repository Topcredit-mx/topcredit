import type { EmailT } from '~/lib/email-i18n'

interface ApplicationSubmittedTemplateProps {
	creditAmountFormatted: string
	termLabel: string
	t: EmailT
}

export function ApplicationSubmittedTemplate({
	creditAmountFormatted,
	termLabel,
	t,
}: ApplicationSubmittedTemplateProps) {
	const heading = t('applicationSubmitted.heading')
	const headingPrefix = heading.replace(' Topcredit', '')
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
					{headingPrefix}
					{' '}
					<span style={{ color: '#0070f3' }}>Topcredit</span>
				</h2>
			</div>
			<div style={{ marginBottom: '16px', fontSize: '16px' }}>
				{t('applicationSubmitted.greeting')},
				<br />
				<br />
				{t('applicationSubmitted.body')}
				<br />
				<br />
				<strong>{t('applicationSubmitted.labelSummary')}</strong>
				<br />
				{t('applicationSubmitted.labelAmount')}: {creditAmountFormatted}
				<br />
				{t('applicationSubmitted.labelTerm')}: {termLabel}
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
				<strong>{t('applicationSubmitted.nextStepsTitle')}</strong>
				<br />
				{t('applicationSubmitted.nextStepsBody')}
			</div>
			<div style={{ fontSize: '12px', color: '#666', marginTop: '24px' }}>
				{t('applicationSubmitted.footer')}
			</div>
		</div>
	)
}
