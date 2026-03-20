import { Skeleton } from '~/components/ui/skeleton'

export default function ApplicationsLoading() {
	return (
		<div className="container mx-auto space-y-4 py-6">
			<Skeleton className="h-9 w-48" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-64 w-full" />
		</div>
	)
}
