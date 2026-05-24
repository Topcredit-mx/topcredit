import { forbidden } from 'next/navigation'

export function accessDenied(): never {
	forbidden()
}
