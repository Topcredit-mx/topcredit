import { FileText } from 'lucide-react'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

type ApplicantDocumentFileDisplayProps = {
	fileName: string
	href?: string
	ariaLabel?: string
	className?: string
}

export function ApplicantDocumentFileDisplay({
	fileName,
	href,
	ariaLabel,
	className,
}: ApplicantDocumentFileDisplayProps) {
	const row = (
		<span className={cn(shell.applicantDocumentFileRow, className)}>
			<FileText className={shell.applicantDocumentFileRowIcon} aria-hidden />
			<span className={shell.applicantDocumentFileRowName} title={fileName}>
				{fileName}
			</span>
		</span>
	)

	if (href != null) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className={cn('block w-full min-w-0', shell.textLinkStrong)}
				aria-label={ariaLabel}
			>
				{row}
			</a>
		)
	}

	return row
}
