import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { CreditApplicationForm } from '~/components/credit/credit-application-form'
import { authOptions } from '~/server/auth/config'

export default async function ApplyCreditPage() {
	const session = await getServerSession(authOptions)

	if (!session?.user) {
		redirect('/login')
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
								Solicitar Crédito
							</h1>
							<p className="mt-2 text-gray-600 text-sm">
								Completa la información para procesar tu solicitud de crédito
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
				<CreditApplicationForm />
			</main>
		</div>
	)
}
