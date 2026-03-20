import { AuthPageShell } from '~/components/auth/auth-page-shell'
import { LoginForm } from '~/components/login-form'

export default async function LoginPage() {
	return (
		<AuthPageShell>
			<LoginForm />
		</AuthPageShell>
	)
}
