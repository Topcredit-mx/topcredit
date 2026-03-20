import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { SupportAssistantPanel } from '~/components/app/support-assistant-panel'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

export default function CuentaSupportPage() {
	return (
		<div className={cn(shell.applicantMainMax, 'pb-8')}>
			<SupportAssistantPanel />
			<ApplicantPageFooter className="mt-12" />
		</div>
	)
}
