import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { SupportAssistantPanel } from '~/components/app/support-assistant-panel'

export default function DashboardSupportPage() {
	return (
		<div className="mx-auto w-full max-w-4xl pb-8">
			<SupportAssistantPanel />
			<ApplicantPageFooter className="mt-12" />
		</div>
	)
}
