/**
 * Utilities for scaling and displaying recipe quantities.
 *
 * Quantities are free-form text, so we only scale values that look numeric or
 * fraction-based. Everything else is shown exactly as entered.
 */

const FRACTIONS: Array<[string, number]> = [
	['1/8', 0.125],
	['1/6', 1 / 6],
	['1/4', 0.25],
	['1/3', 1 / 3],
	['3/8', 0.375],
	['1/2', 0.5],
	['5/8', 0.625],
	['2/3', 2 / 3],
	['3/4', 0.75],
	['7/8', 0.875]
];

const RANGE = /^([+-]?\d+(?:[.,]\d+)?|[+-]?\d+\/\d+)\s*[-–—~]\s*([+-]?\d+(?:[.,]\d+)?|[+-]?\d+\/\d+)$/;
const MIXED = /^(\d+)\s+(\d+)\/(\d+)$/;
const FRACTION = /^([+-]?\d+)\s*\/\s*(\d+)$/;
const NUMBER = /^[+-]?\d+(?:[.,]\d+)?$/;

function toNumber(value: string): number | null {
	const normalized = value.trim().replace(',', '.');
	const fraction = FRACTION.exec(normalized);
	if (fraction) {
		const denominator = Number(fraction[2]);
		if (!denominator) return null;
		return Number(fraction[1]) / denominator;
	}
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number): string {
	const rounded = Math.round(value * 100) / 100;
	const whole = Math.floor(rounded);
	const fraction = rounded - whole;

	let closest: [string, number] | null = null;
	for (const candidate of FRACTIONS) {
		if (Math.abs(candidate[1] - fraction) < 0.03) {
			closest = candidate;
			break;
		}
	}

	if (closest) {
		return whole === 0 ? closest[0] : `${whole} ${closest[0]}`;
	}

	return String(rounded);
}

function scaleNumber(value: string, factor: number): string | null {
	const parsed = toNumber(value);
	if (parsed === null) return null;
	return formatNumber(parsed * factor);
}

export function scaleQuantity(value: string | null | undefined, factor: number): string {
	if (!value || !Number.isFinite(factor) || factor === 1) return value ?? '';

	const raw = value.trim();
	if (!raw || factor <= 0) return raw;

	const range = RANGE.exec(raw);
	if (range) {
		const start = scaleNumber(range[1], factor);
		const end = scaleNumber(range[2], factor);
		return start && end ? `${start}–${end}` : raw;
	}

	const mixed = MIXED.exec(raw);
	if (mixed) {
		const denominator = Number(mixed[3]);
		if (!denominator) return raw;
		const number = Number(mixed[1]) + Number(mixed[2]) / denominator;
		const scaled = formatNumber(number * factor);
		return scaled || raw;
	}

	return scaleNumber(raw, factor) ?? raw;
}
