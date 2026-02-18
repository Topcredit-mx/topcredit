import { ApplicationImmediateActions } from './application-immediate-actions'
import { ApplicationReasonActions } from './application-reason-actions'

interface ApplicationActionsProps {
	applicationId: number
}

export async function ApplicationActions({
	applicationId,
}: ApplicationActionsProps) {
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<ApplicationImmediateActions applicationId={applicationId} />
				<ApplicationReasonActions applicationId={applicationId} />
			</div>
		</div>
	)
}
