import assert from 'node:assert/strict'
import test from 'node:test'
import {
	isAuthorizationPackageFullyApproved,
	isAuthorizationPackageReadyForSubmit,
} from './authorization-package-readiness'

const baseDate = new Date('2025-01-15T12:00:00Z')

test('isAuthorizationPackageReadyForSubmit: false when a package type is missing', () => {
	assert.equal(
		isAuthorizationPackageReadyForSubmit([
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
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
				hasBlobContent: true,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
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
				hasBlobContent: true,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
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
				hasBlobContent: true,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
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
				hasBlobContent: true,
			},
			{
				documentType: 'payroll-receipt',
				status: 'pending',
				createdAt: newer,
				hasBlobContent: true,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
			},
		]),
		true,
	)
})

test('isAuthorizationPackageFullyApproved: false when a package type is missing', () => {
	assert.equal(
		isAuthorizationPackageFullyApproved([
			{
				documentType: 'contract',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'authorization',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: true,
			},
		]),
		false,
	)
})

test('isAuthorizationPackageFullyApproved: false when latest is not approved', () => {
	assert.equal(
		isAuthorizationPackageFullyApproved([
			{
				documentType: 'payroll-receipt',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'contract',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'authorization',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: true,
			},
		]),
		false,
	)
})

test('isAuthorizationPackageFullyApproved: true when all three latest are approved', () => {
	assert.equal(
		isAuthorizationPackageFullyApproved([
			{
				documentType: 'payroll-receipt',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'contract',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: true,
			},
			{
				documentType: 'authorization',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: true,
			},
		]),
		true,
	)
})

test('isAuthorizationPackageReadyForSubmit: ignores rows without uploaded file', () => {
	assert.equal(
		isAuthorizationPackageReadyForSubmit([
			{
				documentType: 'payroll-receipt',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: false,
			},
			{
				documentType: 'contract',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: false,
			},
			{
				documentType: 'authorization',
				status: 'pending',
				createdAt: baseDate,
				hasBlobContent: false,
			},
		]),
		false,
	)
})

test('isAuthorizationPackageFullyApproved: ignores rows without uploaded file', () => {
	assert.equal(
		isAuthorizationPackageFullyApproved([
			{
				documentType: 'payroll-receipt',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: false,
			},
			{
				documentType: 'contract',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: false,
			},
			{
				documentType: 'authorization',
				status: 'approved',
				createdAt: baseDate,
				hasBlobContent: false,
			},
		]),
		false,
	)
})
