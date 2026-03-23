import type { DocumentType } from '../../src/server/db/schema'

export type E2ePreAuthDocumentSeedRow = {
	documentType: DocumentType
	fileName: string
	storageKey: string
	status: 'pending' | 'approved' | 'rejected'
}

export const E2E_PRE_AUTH_INITIAL_INTAKE_APPROVED: readonly E2ePreAuthDocumentSeedRow[] =
	[
		{
			documentType: 'official-id',
			fileName: 'e2e-ine.pdf',
			storageKey: 'https://example.com/e2e/ine.pdf',
			status: 'approved',
		},
		{
			documentType: 'proof-of-address',
			fileName: 'e2e-address.pdf',
			storageKey: 'https://example.com/e2e/address.pdf',
			status: 'approved',
		},
		{
			documentType: 'bank-statement',
			fileName: 'e2e-bank.pdf',
			storageKey: 'https://example.com/e2e/bank.pdf',
			status: 'approved',
		},
	]

export const E2E_PRE_AUTH_PACKAGE_PENDING: readonly E2ePreAuthDocumentSeedRow[] =
	[
		{
			documentType: 'payroll-receipt',
			fileName: 'e2e-payroll.pdf',
			storageKey: 'https://example.com/e2e/payroll.pdf',
			status: 'pending',
		},
		{
			documentType: 'contract',
			fileName: 'e2e-contract.pdf',
			storageKey: 'https://example.com/e2e/contract.pdf',
			status: 'pending',
		},
		{
			documentType: 'authorization',
			fileName: 'e2e-authorization.pdf',
			storageKey: 'https://example.com/e2e/authorization.pdf',
			status: 'pending',
		},
	]

export const E2E_PRE_AUTH_PAYROLL_APPROVED_LATEST: E2ePreAuthDocumentSeedRow = {
	documentType: 'payroll-receipt',
	fileName: 'e2e-payroll-approved-rescan.pdf',
	storageKey: 'https://example.com/e2e/payroll-approved.pdf',
	status: 'approved',
}

export type SeedPreAuthorizedPackageVariant =
	| 'initialIntakeApprovedOnly'
	| 'initialIntakeApprovedAndPackagePending'
	| 'initialIntakeApprovedAndPackagePending_payrollLatestApproved'
