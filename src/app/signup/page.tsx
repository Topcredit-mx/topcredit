import { AuthPageShell } from '~/components/auth/auth-page-shell'
import { SignupForm } from '~/components/signup-form'

export default async function SignupPage() {
	return (
		<AuthPageShell>
			<SignupForm />
		</AuthPageShell>
	)
}
