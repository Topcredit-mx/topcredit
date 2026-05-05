import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Decimal } from '~/lib/decimal'
import { getAbility } from '~/server/auth/ability'
import { getCompanyByDomain } from '~/server/queries'
import { isBlobStorageKey } from '~/server/storage'

interface CompanyDetailPageProps {
	params: Promise<{
		domain: string
	}>
}

export default async function CompanyDetailPage({
	params,
}: CompanyDetailPageProps) {
	const { domain } = await params
	const decodedDomain = decodeURIComponent(domain)
	const company = await getCompanyByDomain(decodedDomain)

	if (!company) {
		notFound()
	}

	const { isAdmin } = await getAbility()
	const t = await getTranslations('admin')

	const borrowingLabel = company.borrowingCapacityRate
		? `${new Decimal(company.borrowingCapacityRate).mul(100).toFixed(0)}%`
		: '—'

	const frequencyLabel =
		company.employeeSalaryFrequency === 'bi-monthly'
			? t('company-form-frequency-bi-monthly')
			: t('company-form-frequency-monthly')

	const authDownloadable =
		company.authorizationTemplateStorageKey != null &&
		company.authorizationTemplateFileName != null &&
		isBlobStorageKey(company.authorizationTemplateStorageKey)

	const contractDownloadable =
		company.contractTemplateStorageKey != null &&
		company.contractTemplateFileName != null &&
		isBlobStorageKey(company.contractTemplateStorageKey)

	const authHref = `/api/companies/${company.id}/templates/authorization/file`
	const contractHref = `/api/companies/${company.id}/templates/contract/file`

	return (
		<div className="container mx-auto py-6">
			<div className="max-w-2xl space-y-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="font-semibold text-2xl text-slate-900 tracking-tight">
							{company.name}
						</h1>
						<p className="mt-1 text-muted-foreground text-sm">
							{company.domain}
						</p>
					</div>
					{isAdmin ? (
						<Button variant="outline" asChild>
							<Link
								href={`/equipo/companies/${encodeURIComponent(company.domain)}/edit`}
							>
								{t('companies-detail-edit-link')}
							</Link>
						</Button>
					) : null}
				</div>

				<dl className="grid gap-4 rounded-lg border bg-card p-6 text-sm shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-2 border-border border-b pb-4 last:border-0 last:pb-0">
						<dt className="text-muted-foreground">{t('companies-col-rate')}</dt>
						<dd className="font-medium tabular-nums">
							{new Decimal(company.rate).mul(100).toFixed(2)}%
						</dd>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-2 border-border border-b pb-4 last:border-0 last:pb-0">
						<dt className="text-muted-foreground">
							{t('companies-col-borrowing')}
						</dt>
						<dd className="font-medium tabular-nums">{borrowingLabel}</dd>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-2 border-border border-b pb-4 last:border-0 last:pb-0">
						<dt className="text-muted-foreground">
							{t('companies-col-frequency')}
						</dt>
						<dd className="font-medium">{frequencyLabel}</dd>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-2 border-border border-b pb-4 last:border-0 last:pb-0">
						<dt className="text-muted-foreground">
							{t('companies-col-status')}
						</dt>
						<dd>
							<Badge variant={company.active ? 'default' : 'secondary'}>
								{company.active
									? t('companies-active')
									: t('companies-inactive')}
							</Badge>
						</dd>
					</div>
				</dl>

				<section aria-labelledby="company-detail-templates">
					<h2
						id="company-detail-templates"
						className="font-semibold text-lg text-slate-900"
					>
						{t('company-templates-section-title')}
					</h2>
					<ul className="mt-4 space-y-4">
						<li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
							<span className="font-medium">
								{t('company-template-authorization-label')}
							</span>
							{authDownloadable ? (
								<Button variant="brand" size="sm" asChild>
									<a href={authHref} target="_blank" rel="noopener noreferrer">
										{t('company-template-download')}
									</a>
								</Button>
							) : (
								<span className="text-muted-foreground text-sm">
									{t('company-template-missing')}
								</span>
							)}
						</li>
						<li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
							<span className="font-medium">
								{t('company-template-contract-label')}
							</span>
							{contractDownloadable ? (
								<Button variant="brand" size="sm" asChild>
									<a
										href={contractHref}
										target="_blank"
										rel="noopener noreferrer"
									>
										{t('company-template-download')}
									</a>
								</Button>
							) : (
								<span className="text-muted-foreground text-sm">
									{t('company-template-missing')}
								</span>
							)}
						</li>
					</ul>
				</section>
			</div>
		</div>
	)
}
