import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
	parseGitNameStatus,
	selectAnyErrorVideos,
	selectChangedTestVideos,
} from '../../scripts/playwright-changed-videos'

describe('parseGitNameStatus', () => {
	it('returns changed Playwright specs and ignores deleted specs', () => {
		const specs = parseGitNameStatus(
			[
				'M\te2e/other/login.spec.ts',
				'D\te2e/other/landing.spec.ts',
				'M\tsrc/app/page.tsx',
				'A\te2e/equipo/installments-history.spec.ts',
			].join('\n'),
		)

		assert.deepEqual(specs, [
			{ path: 'e2e/other/login.spec.ts', status: 'M' },
			{ path: 'e2e/equipo/installments-history.spec.ts', status: 'A' },
		])
	})

	it('uses the new path for renamed Playwright specs', () => {
		const specs = parseGitNameStatus(
			'R100\te2e/other/login-old.spec.ts\te2e/other/login.spec.ts',
		)

		assert.deepEqual(specs, [
			{ path: 'e2e/other/login.spec.ts', status: 'R100' },
		])
	})
})

describe('selectAnyErrorVideos', () => {
	it('keeps at most the requested number of videos in input order', () => {
		const selected = selectAnyErrorVideos({
			maxVideos: 2,
			videoPaths: [
				'test-results/e2e-other-login-1-chromium/video.webm',
				'test-results/e2e-equipo-installments-history-1-chromium/video.webm',
				'test-results/e2e-other-login-2-chromium/video.webm',
			],
		})

		assert.deepEqual(selected, [
			{
				label: 'e2e-other-login-1-chromium',
				videoPath: 'test-results/e2e-other-login-1-chromium/video.webm',
			},
			{
				label: 'e2e-equipo-installments-history-1-chromium',
				videoPath:
					'test-results/e2e-equipo-installments-history-1-chromium/video.webm',
			},
		])
	})

	it('returns no videos when the maximum is zero', () => {
		const selected = selectAnyErrorVideos({
			maxVideos: 0,
			videoPaths: ['test-results/e2e-other-login-1-chromium/video.webm'],
		})

		assert.deepEqual(selected, [])
	})
})

describe('selectChangedTestVideos', () => {
	it('selects only videos that match changed Playwright specs', () => {
		const selected = selectChangedTestVideos({
			changedSpecFiles: ['e2e/other/login.spec.ts'],
			videoPaths: [
				'test-results/e2e-other-landing-loads-chromium/video.webm',
				'test-results/e2e-other-login-allows-sign-in-chromium/video.webm',
			],
		})

		assert.deepEqual(selected, [
			{
				specFile: 'e2e/other/login.spec.ts',
				videoPath:
					'test-results/e2e-other-login-allows-sign-in-chromium/video.webm',
			},
		])
	})

	it('keeps at most the requested number of matching videos in input order', () => {
		const selected = selectChangedTestVideos({
			changedSpecFiles: [
				'e2e/equipo/installments-history.spec.ts',
				'e2e/other/login.spec.ts',
			],
			maxVideos: 2,
			videoPaths: [
				'test-results/e2e-other-login-1-chromium/video.webm',
				'test-results/e2e-equipo-installments-history-1-chromium/video.webm',
				'test-results/e2e-other-login-2-chromium/video.webm',
			],
		})

		assert.deepEqual(
			selected.map((video) => video.videoPath),
			[
				'test-results/e2e-other-login-1-chromium/video.webm',
				'test-results/e2e-equipo-installments-history-1-chromium/video.webm',
			],
		)
	})

	it('uses the strongest spec path match when filenames share words', () => {
		const selected = selectChangedTestVideos({
			changedSpecFiles: [
				'e2e/equipo/installments.spec.ts',
				'e2e/equipo/installments-history.spec.ts',
			],
			videoPaths: [
				'test-results/e2e-equipo-installments-history-opens-chromium/video.webm',
			],
		})

		const [first] = selected
		assert.equal(first?.specFile, 'e2e/equipo/installments-history.spec.ts')
	})
})
