import assert from 'node:assert/strict'
import test from 'node:test'
import { isAuthorizationPackageReadyForSubmit } from './authorization-package-readiness'

const baseDate = new Date('2025-01-15T12:00:00Z')

test('isAuthorizationPackageReadyForSubmit: false when a package type is missing', () => {
	assert.equal(
		isAuthorizationPackageReadyForSubmit([
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
			},
		]),
		false,
	)
})

test('isAuthorizationPackageReadyForSubmit: false when latest for a type is rejected', () => {
	assert.equal(
		isAuthorizationPackageReadyForSubmit([
			{
				documentType: 'payroll-receipt',
				status: 'rejected',
				createdAt: baseDate,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
			},
		]),
		false,
	)
})

test('isAuthorizationPackageReadyForSubmit: false when latest is approved not pending', () => {
	assert.equal(
		isAuthorizationPackageReadyForSubmit([
			{
				documentType: 'payroll-receipt',
				status: 'approved',
				createdAt: baseDate,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
			},
		]),
		false,
	)
})

test('isAuthorizationPackageReadyForSubmit: true when all three latest are pending', () => {
	assert.equal(
		isAuthorizationPackageReadyForSubmit([
			{
				documentType: 'payroll-receipt',
				status: 'pending',
				createdAt: baseDate,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
			},
		]),
		true,
	)
})

test('isAuthorizationPackageReadyForSubmit: uses latest row per type by createdAt', () => {
	const older = new Date('2025-01-10T12:00:00Z')
	const newer = new Date('2025-01-12T12:00:00Z')
	assert.equal(
		isAuthorizationPackageReadyForSubmit([
			{
				documentType: 'payroll-receipt',
				status: 'rejected',
				createdAt: older,
			},
			{
				documentType: 'payroll-receipt',
				status: 'pending',
				createdAt: newer,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
			},
		]),
		true,
	)
})
