import type { ApplicationStatus } from '~/server/db/schema'

export type SeedStatusHistoryStep = {
	status: ApplicationStatus
	setByUserId: number | null
}

function getDefaultSeedStatusHistory(
	finalStatus: ApplicationStatus,
	defaultActorUserId: number | null,
): readonly SeedStatusHistoryStep[] {
	switch (finalStatus) {
		case 'pending':
			return [{ status: 'pending', setByUserId: defaultActorUserId }]
		case 'approved':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
			]
		case 'pre-authorized':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
				{ status: 'pre-authorized', setByUserId: defaultActorUserId },
			]
		case 'awaiting-authorization':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
				{ status: 'pre-authorized', setByUserId: defaultActorUserId },
				{
					status: 'awaiting-authorization',
					setByUserId: defaultActorUserId,
				},
			]
		case 'authorized':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
				{ status: 'pre-authorized', setByUserId: defaultActorUserId },
				{
					status: 'awaiting-authorization',
					setByUserId: defaultActorUserId,
				},
				{ status: 'authorized', setByUserId: defaultActorUserId },
			]
		case 'denied':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'denied', setByUserId: defaultActorUserId },
			]
		case 'disbursed':
			return [
				{ status: 'pending', setByUserId: defaultActorUserId },
				{ status: 'approved', setByUserId: defaultActorUserId },
				{ status: 'pre-authorized', setByUserId: defaultActorUserId },
				{
					status: 'awaiting-authorization',
					setByUserId: defaultActorUserId,
				},
				{ status: 'authorized', setByUserId: defaultActorUserId },
				{ status: 'disbursed', setByUserId: defaultActorUserId },
			]
		case 'invalid-documentation':
			throw new Error(
				'invalid-documentation is no longer a supported seed application status',
			)
	}
}

export function createOrderedSeedStatusHistory(options: {
	finalStatus: ApplicationStatus
	defaultActorUserId: number | null
	steps?: readonly SeedStatusHistoryStep[]
}): SeedStatusHistoryStep[] {
	const steps =
		options.steps ??
		getDefaultSeedStatusHistory(options.finalStatus, options.defaultActorUserId)
	const lastStep = steps[steps.length - 1]

	if (!lastStep || lastStep.status !== options.finalStatus) {
		throw new Error('Seed status history must end with the current status')
	}

	return [...steps]
}
