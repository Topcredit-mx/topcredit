import { eq } from 'drizzle-orm'
import { ApplicantSidebar } from '~/components/app/applicant-sidebar'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '~/components/ui/sidebar'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const user = await getRequiredApplicantUser()
	const dbUser = await db.query.users.findFirst({
		where: eq(users.id, user.id),
		columns: { emailVerified: true },
	})
	const emailVerified = dbUser?.emailVerified != null

	return (
		<SidebarProvider
			className={cn('h-svh min-h-0 overflow-hidden', shell.applicantCanvas)}
		>
			<ApplicantSidebar user={{ ...user, emailVerified }} />
			{/* No `overflow-hidden`: it clips hero/card `box-shadow` at the rail seam. Scroll + extra left pad so `overflow-y-auto` doesn’t shear shadows. */}
			<SidebarInset
				className={cn(
					'flex min-h-0 min-w-0 flex-1 flex-col md:rounded-xl',
					shell.applicantCanvas,
				)}
			>
				<header className="shrink-0 px-4 pt-3 pb-2 sm:px-6 md:sr-only">
					<div className="mx-auto flex max-w-7xl items-center md:hidden">
						<SidebarTrigger className="size-9 rounded-lg" />
					</div>
				</header>
				<div className="min-h-0 flex-1 overflow-y-auto pt-2 pr-4 pb-12 pl-5 sm:pr-5 sm:pl-8 md:pt-6 md:pr-8 md:pl-14">
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
