import type { NotifyStatus } from '~/lib/application-rules'
import type { EmailT } from '~/lib/email-i18n'
import type { ApplicationStatus } from '~/server/db/schema'

const STATUS_HIGHLIGHT_COLOR: Record<ApplicationStatus, string> = {
	pending: '#666',
	approved: '#15803d',
	'invalid-documentation': '#b45309',
	'pre-authorized': '#0070f3',
	'awaiting-authorization': '#0369a1',
	authorized: '#15803d',
	denied: '#b91c1c',
}

interface ApplicationStatusTemplateProps {
	status: NotifyStatus
	creditAmountFormatted: string
	termLabel: string
	reason?: string | null
	t: EmailT
}

export function ApplicationStatusTemplate({
	status,
	creditAmountFormatted,
	termLabel,
	reason,
	t,
}: ApplicationStatusTemplateProps) {
	const highlightColor = STATUS_HIGHLIGHT_COLOR[status]
	const statusTitle = t(`applicationStatus.statusLabel.${status}`)
	const statusSubtitle = t(`applicationStatus.subtitle.${status}`)
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
				<h2 style={{ fontWeight: 600, color: highlightColor }}>
					{statusTitle}
				</h2>
				{statusSubtitle ? (
					<p style={{ marginTop: '8px', color: '#555', fontSize: '15px' }}>
						{statusSubtitle}
					</p>
				) : null}
			</div>
			<div style={{ marginBottom: '16px', fontSize: '16px' }}>
				{t('applicationStatus.greeting')},
				<br />
				<br />
				{t('applicationStatus.bodyIntro')}
				<br />
				<br />
				<strong>{t('applicationStatus.labelSummary')}</strong>
				<br />
				{t('applicationStatus.labelAmount')}: {creditAmountFormatted}
				<br />
				{t('applicationStatus.labelTerm')}: {termLabel}
				<br />
				{t('applicationStatus.labelStatus')}: <strong>{statusTitle}</strong>
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
					<strong>{t('applicationStatus.reasonLabel')}</strong>
					<br />
					{reason}
				</div>
			) : null}
			<div style={{ fontSize: '12px', color: '#666', marginTop: '24px' }}>
				{t('applicationStatus.footer')}
			</div>
		</div>
	)
}
