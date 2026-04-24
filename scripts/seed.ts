import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { getValidFirstDiscountDates } from '../src/lib/first-discount-date'
import type { Role } from '../src/server/auth/session'
import type { ApplicationStatus } from '../src/server/db/schema'
import * as schema from '../src/server/db/schema'
import {
	type FirstDiscountPreference,
	seedApplications,
	seedCompanies,
	seedTermOfferings,
	seedUsers,
	userCompanyAssignments,
} from './seed.fixtures'
import {
	insertCreditForSeededDisbursedApp,
	loadTermAndRateForApplication,
} from './seed-credits'

function isRole(s: string): s is Role {
	return (
		s === 'applicant' ||
		s === 'agent' ||
		s === 'requests' ||
		s === 'pre-authorizations' ||
		s === 'authorizations' ||
		s === 'hr' ||
		s === 'dispersions' ||
		s === 'installments' ||
		s === 'admin'
	)
}

const {
	users,
	userRoles,
	companies,
	userCompanies,
	terms,
	termOfferings,
	applications,
	applicationStatusHistory,
	applicationDocuments,
	credits,
} = schema

export function getDb() {
	const databaseUrl = process.env.DATABASE_URL
	if (!databaseUrl) {
		console.error('❌ DATABASE_URL environment variable is required')
		process.exit(1)
	}
	const sql = neon(databaseUrl)
	return drizzle({ client: sql, schema })
}

function getDefaultSeedStatusHistory(
	status: ApplicationStatus,
	setByUserId: number | null,
): ReadonlyArray<{ status: ApplicationStatus; setByUserId: number | null }> {
	switch (status) {
		case 'pending':
			return [{ status: 'pending', setByUserId }]
		case 'approved':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
			]
		case 'pre-authorized':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
				{ status: 'pre-authorized', setByUserId },
			]
		case 'awaiting-authorization':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
				{ status: 'pre-authorized', setByUserId },
				{ status: 'awaiting-authorization', setByUserId },
			]
		case 'authorized':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
				{ status: 'pre-authorized', setByUserId },
				{ status: 'awaiting-authorization', setByUserId },
				{ status: 'authorized', setByUserId },
			]
		case 'disbursed':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
				{ status: 'pre-authorized', setByUserId },
				{ status: 'awaiting-authorization', setByUserId },
				{ status: 'authorized', setByUserId },
				{ status: 'disbursed', setByUserId },
			]
		case 'denied':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'denied', setByUserId },
			]
		case 'invalid-documentation':
			throw new Error(
				'invalid-documentation is no longer a supported seed application status',
			)
	}
}

function endOfMonthMonthsAgo(today: Date, monthsBack: number): Date {
	const d = new Date(
		Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, 1),
	)
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
}

function resolveFirstDiscountDate(
	preference: FirstDiscountPreference,
	salaryFrequency: 'monthly' | 'bi-monthly',
	today: Date,
): Date | null {
	switch (preference) {
		case 'none':
			return null
		case 'next-valid': {
			const dates = getValidFirstDiscountDates(salaryFrequency, today, 1)
			return dates[0] ?? null
		}
		case 'overdue-credit':
			return endOfMonthMonthsAgo(today, 5)
		case 'settled-six':
			return endOfMonthMonthsAgo(today, 7)
	}
}

export async function seedDatabase(db: ReturnType<typeof getDb>) {
	console.log('🌱 Seeding database...\n')

	const userIdByEmail = new Map<string, number>()

	// Users + roles
	for (const u of seedUsers) {
		let user = await db.query.users.findFirst({
			where: eq(users.email, u.email),
		})
		if (!user) {
			const [inserted] = await db
				.insert(users)
				.values({ email: u.email, name: u.name })
				.returning()
			if (!inserted) {
				console.error(`❌ Failed to create user: ${u.email}`)
				process.exit(1)
			}
			user = inserted
			console.log(`  ✓ Created user: ${u.email}`)
		} else {
			console.log(`  ✓ User already exists: ${u.email}`)
		}
		userIdByEmail.set(u.email, user.id)

		const existingRoles = await db.query.userRoles.findMany({
			where: eq(userRoles.userId, user.id),
		})
		const toAdd: Role[] = []
		for (const role of u.roles) {
			if (isRole(role) && !existingRoles.some((r) => r.role === role)) {
				toAdd.push(role)
			}
		}
		if (toAdd.length > 0) {
			await db
				.insert(userRoles)
				.values(toAdd.map((role) => ({ userId: user.id, role })))
			console.log(`  ✓ Ensured roles for ${u.email}: ${toAdd.join(', ')}`)
		}
	}

	// Companies
	const companyIdByDomain = new Map<string, number>()
	for (const co of seedCompanies) {
		const existing = await db.query.companies.findFirst({
			where: eq(companies.domain, co.domain),
		})
		if (existing) {
			companyIdByDomain.set(co.domain, existing.id)
		} else {
			const [inserted] = await db
				.insert(companies)
				.values({
					name: co.name,
					domain: co.domain,
					rate: co.rate,
					borrowingCapacityRate: co.borrowingCapacityRate,
					employeeSalaryFrequency: co.employeeSalaryFrequency,
					active: co.active,
				})
				.returning()
			if (inserted) {
				companyIdByDomain.set(co.domain, inserted.id)
				console.log(`  ✓ Created company: ${co.name} (${co.domain})`)
			}
		}
	}

	// Terms and term offerings (applicant happy path: company with rate + terms)
	const termByKey = new Map<string, number>()
	const termOfferingByKey = new Map<string, number>()
	for (const offering of seedTermOfferings) {
		const termKey = `${offering.durationType}-${offering.duration}`
		const offeringKey = `${offering.companyDomain}-${offering.durationType}-${offering.duration}`
		let termId = termByKey.get(termKey)
		if (termId == null) {
			const existing = await db.query.terms.findFirst({
				where: and(
					eq(terms.durationType, offering.durationType),
					eq(terms.duration, offering.duration),
				),
				columns: { id: true },
			})
			if (existing) {
				termId = existing.id
			} else {
				const [inserted] = await db
					.insert(terms)
					.values({
						durationType: offering.durationType,
						duration: offering.duration,
					})
					.returning()
				if (inserted) {
					termId = inserted.id
					console.log(
						`  ✓ Created term: ${offering.durationType} ${offering.duration}`,
					)
				}
			}
			if (termId != null) termByKey.set(termKey, termId)
		}
		if (termId != null) {
			const companyId = companyIdByDomain.get(offering.companyDomain)
			if (companyId != null) {
				const existing = await db.query.termOfferings.findFirst({
					where: and(
						eq(termOfferings.companyId, companyId),
						eq(termOfferings.termId, termId),
					),
					columns: { id: true },
				})
				if (existing) {
					termOfferingByKey.set(offeringKey, existing.id)
				} else {
					const [inserted] = await db
						.insert(termOfferings)
						.values({
							companyId,
							termId,
							disabled: false,
						})
						.returning()
					if (inserted) {
						termOfferingByKey.set(offeringKey, inserted.id)
						const co = seedCompanies.find(
							(c) => c.domain === offering.companyDomain,
						)
						console.log(
							`  ✓ Created term offering for ${co?.name ?? offering.companyDomain}`,
						)
					}
				}
			}
		}
	}

	const today = new Date()
	const logSampleIds: { label: string; id: number }[] = []
	const addLogSample = (label: string, id: number) => {
		const key = `${label}|${id}`
		if (
			logSampleIds.length < 16 &&
			!logSampleIds.some((x) => `${x.label}|${x.id}` === key)
		) {
			logSampleIds.push({ label, id })
		}
	}

	// Applications
	for (const app of seedApplications) {
		const applicantId = userIdByEmail.get(app.applicantEmail)
		const companyId = companyIdByDomain.get(app.companyDomain)
		const offeringKey = `${app.companyDomain}-${app.durationType}-${app.duration}`
		const termOfferingId = termOfferingByKey.get(offeringKey)
		if (applicantId == null || companyId == null || termOfferingId == null) {
			console.warn(
				`  ⚠ Skipping app row (falta usuario, empresa o plazo): ${app.applicantEmail} ${app.creditAmount} ${app.companyDomain}`,
			)
			continue
		}
		const firstDiscountDate = resolveFirstDiscountDate(
			app.firstDiscount,
			app.salaryFrequency,
			today,
		)
		const existing = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, applicantId),
				eq(applications.termOfferingId, termOfferingId),
				eq(applications.creditAmount, app.creditAmount),
			),
			columns: { id: true },
		})
		if (!existing) {
			const timeline =
				app.statusHistory?.map((status) => ({
					status,
					setByUserId: applicantId,
				})) ?? getDefaultSeedStatusHistory(app.status, applicantId)
			const lastTimelineStatus = timeline[timeline.length - 1]?.status
			if (lastTimelineStatus !== app.status) {
				console.error(
					`❌ Seed history must end with current status for ${app.applicantEmail}`,
				)
				process.exit(1)
			}
			const timelineBaseTime = new Date()
			const [createdApplication] = await db
				.insert(applications)
				.values({
					applicantId,
					companyId,
					termOfferingId,
					creditAmount: app.creditAmount,
					salaryAtApplication: app.salaryAtApplication,
					salaryFrequency: app.salaryFrequency,
					status: app.status,
					denialReason: app.denialReason ?? null,
					firstDiscountDate,
					transferReference:
						app.status === 'disbursed' ? (app.transferReference ?? null) : null,
					receiptFileName:
						app.status === 'disbursed' ? (app.receiptFileName ?? null) : null,
					receiptStorageKey: null,
				})
				.returning()

			if (!createdApplication) {
				console.error(`❌ Failed to create application: ${app.applicantEmail}`)
				process.exit(1)
			}
			if (
				app.status === 'disbursed' &&
				app.receiptFileName != null &&
				app.receiptFileName.length > 0
			) {
				const key = `disbursement-receipts/${createdApplication.id}/${app.receiptFileName}`
				await db
					.update(applications)
					.set({ receiptStorageKey: key, updatedAt: new Date() })
					.where(eq(applications.id, createdApplication.id))
			}
			if (app.status === 'pre-authorized') {
				addLogSample('pre-authorized (Sofía / paquete)', createdApplication.id)
			} else if (app.status === 'denied') {
				addLogSample('denegada (Patricia / CVA)', createdApplication.id)
			} else if (app.creditAmount === '5000.00' && app.status === 'pending') {
				addLogSample('pendiente + documentos iniciales', createdApplication.id)
			}

			await db.insert(applicationStatusHistory).values(
				timeline.map((entry, index) => ({
					applicationId: createdApplication.id,
					status: entry.status,
					setByUserId: entry.setByUserId,
					createdAt: new Date(timelineBaseTime.getTime() + index * 60_000),
				})),
			)
			console.log(
				`  ✓ Created application: ${app.applicantEmail} ${app.status} (${app.creditAmount}) id=${createdApplication.id}`,
			)
		} else {
			console.log(
				`  ○ Application already exists: ${app.applicantEmail} ${app.creditAmount} (id ${existing.id})`,
			)
		}
	}

	// Pending application documents (for testing document approve/reject)
	const applicantId = userIdByEmail.get('sofia.estrada@grupoandares.com.mx')
	if (applicantId != null) {
		const pendingApp = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, applicantId),
				eq(applications.status, 'pending'),
				eq(applications.creditAmount, '5000.00'),
			),
			columns: { id: true },
		})
		if (pendingApp) {
			const existingDocs = await db.query.applicationDocuments.findMany({
				where: eq(applicationDocuments.applicationId, pendingApp.id),
				columns: { documentType: true },
			})
			const existingTypes = new Set(existingDocs.map((d) => d.documentType))
			const docsToAdd: Array<{
				documentType: 'authorization' | 'contract' | 'payroll-receipt'
				fileName: string
				storageKey: string
			}> = [
				{
					documentType: 'authorization',
					fileName: 'seed-authorization.pdf',
					storageKey: `application-documents/${pendingApp.id}/authorization/seed-authorization.pdf`,
				},
				{
					documentType: 'contract',
					fileName: 'seed-contract.pdf',
					storageKey: `application-documents/${pendingApp.id}/contract/seed-contract.pdf`,
				},
			]
			for (const doc of docsToAdd) {
				if (existingTypes.has(doc.documentType)) continue
				await db.insert(applicationDocuments).values({
					applicationId: pendingApp.id,
					documentType: doc.documentType,
					status: 'pending',
					fileName: doc.fileName,
					storageKey: doc.storageKey,
				})
				existingTypes.add(doc.documentType)
				console.log(
					`  ✓ Created application document: ${doc.documentType} (application ${pendingApp.id})`,
				)
			}
		}
	}

	const invalidDocsApplicantId = userIdByEmail.get(
		'miguel.herrera@grupoandares.com.mx',
	)
	if (invalidDocsApplicantId != null) {
		const invalidApp = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, invalidDocsApplicantId),
				eq(applications.status, 'pending'),
				eq(applications.creditAmount, '9500.00'),
			),
			columns: { id: true },
		})
		if (invalidApp) {
			const existingInvalidDocs = await db.query.applicationDocuments.findMany({
				where: eq(applicationDocuments.applicationId, invalidApp.id),
				columns: { id: true },
			})
			if (existingInvalidDocs.length === 0) {
				await db.insert(applicationDocuments).values({
					applicationId: invalidApp.id,
					documentType: 'authorization',
					status: 'rejected',
					fileName: 'seed-authorization-rejected.pdf',
					storageKey: `application-documents/${invalidApp.id}/authorization/seed-authorization-rejected.pdf`,
					rejectionReason:
						'Documento ilegible (semilla de desarrollo). Sube una versión más clara.',
				})
				console.log(
					`  ✓ Created rejected application document (pending application ${invalidApp.id})`,
				)
			}
		}
	}

	// Pre-authorized package: payroll, contract, authorization (pendiente de autorización)
	const preAuthApplicant = userIdByEmail.get(
		'sofia.estrada@grupoandares.com.mx',
	)
	if (preAuthApplicant != null) {
		const preApp = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, preAuthApplicant),
				eq(applications.status, 'pre-authorized'),
				eq(applications.creditAmount, '15000.00'),
			),
			columns: { id: true },
		})
		if (preApp) {
			const preExisting = await db.query.applicationDocuments.findMany({
				where: eq(applicationDocuments.applicationId, preApp.id),
				columns: { documentType: true },
			})
			const have = new Set(preExisting.map((d) => d.documentType))
			const packageDocs: Array<{
				documentType: 'payroll-receipt' | 'contract' | 'authorization'
				fileName: string
				storageKey: string
			}> = [
				{
					documentType: 'payroll-receipt',
					fileName: 'comprobante-nomina-cargo.pdf',
					storageKey: `application-documents/${preApp.id}/payroll-receipt/comprobante-nomina-cargo.pdf`,
				},
				{
					documentType: 'contract',
					fileName: 'contrato-cargo-firmado.pdf',
					storageKey: `application-documents/${preApp.id}/contract/contrato-cargo-firmado.pdf`,
				},
				{
					documentType: 'authorization',
					fileName: 'autorizacion-descuento-cargo.pdf',
					storageKey: `application-documents/${preApp.id}/authorization/autorizacion-descuento-cargo.pdf`,
				},
			]
			for (const d of packageDocs) {
				if (have.has(d.documentType)) continue
				await db.insert(applicationDocuments).values({
					applicationId: preApp.id,
					documentType: d.documentType,
					status: 'pending',
					fileName: d.fileName,
					storageKey: d.storageKey,
				})
				have.add(d.documentType)
				console.log(
					`  ✓ Pre-autorizado: documento ${d.documentType} (solicitud ${preApp.id})`,
				)
			}
		}
	}

	// Assign companies to users that require them (e.g. requests); admin does not need assignments
	for (const [userEmail, domains] of Object.entries(userCompanyAssignments)) {
		const userId = userIdByEmail.get(userEmail)
		if (userId == null) continue
		for (const domain of domains) {
			const companyId = companyIdByDomain.get(domain)
			if (companyId == null) continue
			const existing = await db.query.userCompanies.findFirst({
				where: and(
					eq(userCompanies.userId, userId),
					eq(userCompanies.companyId, companyId),
				),
			})
			if (!existing) {
				await db.insert(userCompanies).values({
					userId,
					companyId,
				})
				const co = seedCompanies.find((c) => c.domain === domain)
				console.log(`  ✓ Assigned ${co?.name ?? domain} to ${userEmail}`)
			}
		}
	}

	const adminUserId = userIdByEmail.get('admin@topcredit.mx')
	if (adminUserId != null) {
		for (const app of seedApplications) {
			if (app.status !== 'disbursed' || app.afterCreditInsert === 'none')
				continue
			const applicant = userIdByEmail.get(app.applicantEmail)
			const oKey = `${app.companyDomain}-${app.durationType}-${app.duration}`
			const toId = termOfferingByKey.get(oKey)
			if (applicant == null || toId == null) continue
			const appRow = await db.query.applications.findFirst({
				where: and(
					eq(applications.applicantId, applicant),
					eq(applications.termOfferingId, toId),
					eq(applications.creditAmount, app.creditAmount),
				),
			})
			if (
				appRow == null ||
				appRow.firstDiscountDate == null ||
				appRow.creditAmount == null
			) {
				continue
			}
			const tinfo = await loadTermAndRateForApplication(db, appRow.id)
			if (tinfo == null) continue
			await insertCreditForSeededDisbursedApp(db, {
				applicationId: appRow.id,
				loanPrincipal: String(appRow.creditAmount),
				companyRate: tinfo.companyRate,
				afterCredit: app.afterCreditInsert,
				duration: tinfo.duration,
				durationType: tinfo.durationType,
				firstDiscountDate: appRow.firstDiscountDate,
				adminUserId,
			})
			const cRow = await db.query.credits.findFirst({
				where: eq(credits.applicationId, appRow.id),
				columns: { id: true },
			})
			if (cRow && app.creditAmount === '38000.00') {
				addLogSample('crédito disperso (fila cola deducciones)', cRow.id)
			}
			if (cRow && app.creditAmount === '24000.00') {
				addLogSample('crédito liquidado (CVA, 6 meses)', cRow.id)
			}
		}
	} else {
		console.warn('  ⚠ No admin@topcredit.mx: no se insertaron créditos semilla')
	}

	console.log(
		'\n--- Referencia demo: cuentas (login) e IDs (ej. /equipo o /cuenta) ---\n' +
			'  Aplicante principal: sofia.estrada@grupoandares.com.mx\n' +
			'  Aplicante CVA: patricia.vega@cva-ingenieros.com.mx\n' +
			'  Aplicante Luminor: daniel.rios@luminor-tech.com.mx\n' +
			'  Colas RH / dispersión: andrea.lopez@, luis.torres@, elena.suarez@ topcredit.mx\n' +
			'  En /equipo elige empresa: Grupo Andares, CVA o Luminor (header).\n' +
			'  Muestras de solicitud o crédito (IDs reales en esta base):\n',
	)
	if (logSampleIds.length > 0) {
		for (const s of logSampleIds) {
			const path =
				s.label.startsWith('crédito') || s.label.includes('crédito')
					? `/equipo/credits/${s.id}`
					: `/equipo/applications/${s.id}`
			console.log(
				`  · ${s.label} → id ${s.id}  (${path} o análoga en cuenta)\n`,
			)
		}
	}
	console.log('✅ Seed completed!')
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
	const db = getDb()
	seedDatabase(db).catch((error) => {
		console.error('❌ Seed failed:', error)
		process.exit(1)
	})
}
