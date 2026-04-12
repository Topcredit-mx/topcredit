import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { getEquipoBreadcrumbSegments } from './breadcrumb-config'

const base = '/equipo'

describe('getEquipoBreadcrumbSegments - deductions', () => {
	test('deductions list shows Home > Deducciones', () => {
		const segments = getEquipoBreadcrumbSegments(`${base}/deductions`, {})
		assert.equal(segments.length, 2)
		assert.equal(segments[0]?.labelKey, 'equipo-home')
		assert.equal(segments[1]?.labelKey, 'equipo-deductions')
		assert.equal(segments[1]?.href, `${base}/deductions`)
	})

	test('deductions/history shows Home > Deducciones > Historial', () => {
		const segments = getEquipoBreadcrumbSegments(
			`${base}/deductions/history`,
			{},
		)
		assert.equal(segments.length, 3)
		assert.equal(segments[0]?.labelKey, 'equipo-home')
		assert.equal(segments[1]?.labelKey, 'equipo-deductions')
		assert.equal(segments[1]?.href, `${base}/deductions`)
		assert.equal(segments[2]?.labelKey, 'equipo-deductions-history')
		assert.equal(segments[2]?.href, `${base}/deductions/history`)
	})

	test('deductions/overdue shows Home > Deducciones > Retrasos', () => {
		const segments = getEquipoBreadcrumbSegments(
			`${base}/deductions/overdue`,
			{},
		)
		assert.equal(segments.length, 3)
		assert.equal(segments[0]?.labelKey, 'equipo-home')
		assert.equal(segments[1]?.labelKey, 'equipo-deductions')
		assert.equal(segments[1]?.href, `${base}/deductions`)
		assert.equal(segments[2]?.labelKey, 'equipo-deductions-overdue')
		assert.equal(segments[2]?.href, `${base}/deductions/overdue`)
	})
})

describe('getEquipoBreadcrumbSegments - payments', () => {
	test('payments shows Home > Pagos', () => {
		const segments = getEquipoBreadcrumbSegments(`${base}/payments`, {})
		assert.equal(segments.length, 2)
		assert.equal(segments[0]?.labelKey, 'equipo-home')
		assert.equal(segments[1]?.labelKey, 'equipo-payments')
		assert.equal(segments[1]?.href, `${base}/payments`)
	})
})
