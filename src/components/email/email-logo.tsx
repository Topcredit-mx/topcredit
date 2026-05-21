const EMAIL_LOGO_URL = 'https://topcredit.mx/logo.png'

export function EmailLogo() {
	return (
		// biome-ignore lint/performance/noImgElement: email clients require a hosted img URL
		<img
			src={EMAIL_LOGO_URL}
			alt="TopCredit"
			width={180}
			height={54}
			style={{
				display: 'block',
				margin: '0 auto 16px',
				maxWidth: '180px',
				height: 'auto',
			}}
		/>
	)
}
