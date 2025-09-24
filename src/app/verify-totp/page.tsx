import { VerifyTotpForm } from '~/components/verify-totp-form'

export default async function VerifyTotpPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const { email } = await searchParams

	if (!email || Array.isArray(email)) {
		return (
			<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
				<div className="w-full max-w-sm text-center">
					<h1 className="mb-4 font-bold text-2xl text-destructive">Error</h1>
					<p className="text-muted-foreground">
						Email requerido para verificación TOTP
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
			<div className="w-full max-w-sm">
				<VerifyTotpForm email={email} />
			</div>
		</div>
	)
}
