import { ValidationCode } from '~/lib/validation-codes'

const RFC_PERSON_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/
const RFC_CHECK_DIGIT_DICTIONARY = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ'
const CLABE_WEIGHTS = [3, 7, 1] as const
const CLABE_INSTITUTION_BY_CODE: Record<string, string> = {
	'002': 'BANAMEX',
	'012': 'BBVA MEXICO',
	'014': 'SANTANDER',
	'021': 'HSBC',
	'030': 'BAJIO',
	'032': 'IXE',
	'036': 'INBURSA',
	'042': 'MIFEL',
	'044': 'SCOTIABANK',
	'058': 'BANREGIO',
	'060': 'BANSI',
	'062': 'AFIRME',
	'072': 'BANORTE',
	'106': 'BANK OF AMERICA',
	'108': 'MUFG',
	'110': 'JP MORGAN',
	'112': 'BMONEX',
	'113': 'VE POR MAS',
	'124': 'CITI MEXICO',
	'127': 'AZTECA',
	'128': 'KAPITAL',
	'129': 'BARCLAYS',
	'130': 'COMPARTAMOS',
	'132': 'MULTIVA BANCO',
	'137': 'BANCOPPEL',
	'138': 'UALA',
	'140': 'CONSUBANCO',
	'141': 'VOLKSWAGEN',
	'143': 'CIBANCO',
	'145': 'BBASE',
	'147': 'BANKAOOL',
	'148': 'PAGATODO',
	'150': 'INMOBILIARIO',
	'151': 'DONDE',
	'152': 'BANCREA',
	'154': 'BANCO COVALTO',
	'155': 'ICBC',
	'156': 'SABADELL',
	'157': 'SHINHAN',
	'158': 'MIZUHO BANK',
	'159': 'BANK OF CHINA',
	'160': 'BANCO S3',
	'167': 'HEY BANCO',
	'600': 'MONEXCB',
	'601': 'GBM',
	'602': 'MASARI',
	'605': 'VALUE',
	'616': 'FINAMEX',
	'617': 'VALMEX',
	'620': 'PROFUTURO',
	'638': 'NU MEXICO',
	'646': 'STP',
	'653': 'KUSPIT',
	'656': 'UNAGRA',
	'659': 'ASP INTEGRA OPC',
	'661': 'KLAR',
	'670': 'LIBERTAD',
	'677': 'CAJA POP MEXICA',
	'680': 'CRISTOBAL COLON',
	'683': 'CAJA TELEFONIST',
	'684': 'TRANSFER',
	'685': 'FONDO (FIRA)',
	'688': 'CREDICLUB',
	'699': 'FONDEADORA',
	'706': 'ARCUS FI',
	'710': 'NVIO',
	'715': 'CASHI CUENTA',
	'720': 'MexPago',
	'721': 'albo',
	'722': 'Mercado Pago W',
	'723': 'Cuenca',
	'727': 'TRANSFER DIRECT',
	'728': 'SPIN BY OXXO',
	'729': 'Dep y Pag Dig',
	'730': 'Swap',
	'732': 'Peibo',
	'734': 'FINCO PAY',
	'738': 'FINTOC',
}

type ValidationResult = { ok: true } | { ok: false; code: string }

function resolveTwoDigitYear(year: number): number {
	const currentYear = new Date().getFullYear() % 100
	return year <= currentYear ? 2000 + year : 1900 + year
}

function isValidDateParts(year: number, month: number, day: number): boolean {
	if (month < 1 || month > 12 || day < 1) return false
	const date = new Date(Date.UTC(year, month - 1, day))
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	)
}

function getRfcCheckDigit(input: string): string | null {
	let sum = 0

	for (const [index, char] of [...input].entries()) {
		const value = RFC_CHECK_DIGIT_DICTIONARY.indexOf(char)
		if (value < 0) return null
		sum += value * (13 - index)
	}

	const remainder = sum % 11
	const digit = 11 - remainder

	if (digit === 11) return '0'
	if (digit === 10) return 'A'
	return String(digit)
}

function getClabeWeight(index: number): (typeof CLABE_WEIGHTS)[number] {
	const remainder = index % CLABE_WEIGHTS.length
	if (remainder === 0) return 3
	if (remainder === 1) return 7
	return 1
}

export function getClabeInstitutionName(value: string): string | null {
	const normalized = value.trim()
	if (!/^\d{3,18}$/.test(normalized)) return null

	const institutionCode = normalized.slice(0, 3)
	return CLABE_INSTITUTION_BY_CODE[institutionCode] ?? null
}

export function validateIndividualRfc(value: string): ValidationResult {
	if (value.length !== 13) {
		return { ok: false, code: ValidationCode.APPLICATION_RFC_LENGTH }
	}

	if (!RFC_PERSON_REGEX.test(value)) {
		return { ok: false, code: ValidationCode.APPLICATION_RFC_INVALID }
	}

	const year = Number.parseInt(value.slice(4, 6), 10)
	const month = Number.parseInt(value.slice(6, 8), 10)
	const day = Number.parseInt(value.slice(8, 10), 10)
	if (!isValidDateParts(resolveTwoDigitYear(year), month, day)) {
		return { ok: false, code: ValidationCode.APPLICATION_RFC_INVALID }
	}

	const expectedCheckDigit = getRfcCheckDigit(value.slice(0, 12))
	if (expectedCheckDigit == null || expectedCheckDigit !== value.slice(12)) {
		return { ok: false, code: ValidationCode.APPLICATION_RFC_INVALID }
	}

	return { ok: true }
}

export function validateClabe(value: string): ValidationResult {
	if (value.length !== 18) {
		return { ok: false, code: ValidationCode.APPLICATION_CLABE_LENGTH }
	}

	if (!/^\d{18}$/.test(value)) {
		return { ok: false, code: ValidationCode.APPLICATION_CLABE_INVALID }
	}

	const digits = [...value].map((digit) => Number.parseInt(digit, 10))
	const checkDigit = digits[17]
	if (checkDigit == null) {
		return { ok: false, code: ValidationCode.APPLICATION_CLABE_INVALID }
	}

	const weightedSum = digits
		.slice(0, 17)
		.reduce(
			(sum, digit, index) => sum + ((digit * getClabeWeight(index)) % 10),
			0,
		)
	const expectedCheckDigit = (10 - (weightedSum % 10)) % 10

	if (expectedCheckDigit !== checkDigit) {
		return { ok: false, code: ValidationCode.APPLICATION_CLABE_INVALID }
	}

	return { ok: true }
}
