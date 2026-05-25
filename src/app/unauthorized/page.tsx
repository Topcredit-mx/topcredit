import { redirect } from 'next/navigation'

export default function UnauthorizedRoute() {
	redirect('/')
}
