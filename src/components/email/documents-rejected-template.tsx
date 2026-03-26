import type { EmailT } from '~/lib/email-i18n'

export type DocumentsRejectedTemplateItem = {
	typeLabel: string
	reason: string
}

interface DocumentsRejectedTemplateProps {
	initialRequest: DocumentsRejectedTemplateItem[]
	authorizationPackage: DocumentsRejectedTemplateItem[]
	t: EmailT
}

export function DocumentsRejectedTemplate({
	initialRequest,
	authorizationPackage,
	t,
}: DocumentsRejectedTemplateProps) {
	const heading = t('documentsRejected.heading')
	const headingPrefix = heading.replace(' Topcredit', '')
	return (
		<div
			style={{
				fontFamily: 'Arial, sans-serif',
				background: '#fafbfc',
				padding: '32px',
				borderRadius: '8px',
				maxWidth: '520px',
				margin: '0 auto',
				color: '#222',
			}}
		>
			<div style={{ textAlign: 'center', marginBottom: '24px' }}>
				<div style={{ fontSize: '48px', marginBottom: '8px' }}>▲</div>
				<h2 style={{ fontWeight: 600 }}>
					{headingPrefix} <span style={{ color: '#0070f3' }}>Topcredit</span>
				</h2>
			</div>
			<div style={{ marginBottom: '16px', fontSize: '16px' }}>
				{t('documentsRejected.greeting')},
				<br />
				<br />
				{t('documentsRejected.intro')}
			</div>
			{initialRequest.length > 0 ? (
				<div style={{ marginBottom: '16px', fontSize: '15px' }}>
					<strong>{t('documentsRejected.sectionInitial')}</strong>
					<ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
						{initialRequest.map((item) => (
							<li
								key={`${item.typeLabel}-${item.reason}`}
								style={{ marginBottom: '8px' }}
							>
								<strong>{item.typeLabel}</strong>
								<br />
								<span style={{ color: '#444' }}>
									{t('documentsRejected.reasonLabel')} {item.reason}
								</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
			{authorizationPackage.length > 0 ? (
				<div style={{ marginBottom: '16px', fontSize: '15px' }}>
					<strong>{t('documentsRejected.sectionAuthorization')}</strong>
					<ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
						{authorizationPackage.map((item) => (
							<li
								key={`${item.typeLabel}-${item.reason}-auth`}
								style={{ marginBottom: '8px' }}
							>
								<strong>{item.typeLabel}</strong>
								<br />
								<span style={{ color: '#444' }}>
									{t('documentsRejected.reasonLabel')} {item.reason}
								</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
			<div style={{ fontSize: '12px', color: '#666', marginTop: '24px' }}>
				{t('documentsRejected.footer')}
			</div>
		</div>
	)
}
