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

describe('getEquipoBreadcrumbSegments - credits defaulted', () => {
	test('credits/defaulted shows Home > Créditos > Cartera vencida', () => {
		const segments = getEquipoBreadcrumbSegments(
			`${base}/credits/defaulted`,
			{},
		)
		assert.equal(segments.length, 3)
		assert.equal(segments[0]?.labelKey, 'equipo-home')
		assert.equal(segments[1]?.labelKey, 'equipo-credits')
		assert.equal(segments[1]?.href, `${base}/credits`)
		assert.equal(segments[2]?.labelKey, 'equipo-credits-defaulted')
		assert.equal(segments[2]?.href, `${base}/credits/defaulted`)
	})
})

describe('getEquipoBreadcrumbSegments - installments', () => {
	test('installments shows Home > Instalaciones', () => {
		const segments = getEquipoBreadcrumbSegments(`${base}/installments`, {})
		assert.equal(segments.length, 2)
		assert.equal(segments[0]?.labelKey, 'equipo-home')
		assert.equal(segments[1]?.labelKey, 'equipo-installments')
		assert.equal(segments[1]?.href, `${base}/installments`)
	})

	test('installments/history shows Home > Instalaciones > Historial', () => {
		const segments = getEquipoBreadcrumbSegments(
			`${base}/installments/history`,
			{},
		)
		assert.equal(segments.length, 3)
		assert.equal(segments[0]?.labelKey, 'equipo-home')
		assert.equal(segments[1]?.labelKey, 'equipo-installments')
		assert.equal(segments[1]?.href, `${base}/installments`)
		assert.equal(segments[2]?.labelKey, 'equipo-installments-history')
		assert.equal(segments[2]?.href, `${base}/installments/history`)
	})

	test('installments/overdue shows Home > Instalaciones > Retrasos', () => {
		const segments = getEquipoBreadcrumbSegments(
			`${base}/installments/overdue`,
			{},
		)
		assert.equal(segments.length, 3)
		assert.equal(segments[0]?.labelKey, 'equipo-home')
		assert.equal(segments[1]?.labelKey, 'equipo-installments')
		assert.equal(segments[1]?.href, `${base}/installments`)
		assert.equal(segments[2]?.labelKey, 'equipo-installments-overdue')
		assert.equal(segments[2]?.href, `${base}/installments/overdue`)
	})
})
