import { Swatch, hslToRgb } from "./color";
import type { Palette } from "./color";

export interface GeneratorOptions {
	targetDarkLuma: number;
	maxDarkLuma: number;
	minLightLuma: number;
	targetLightLuma: number;
	minNormalLuma: number;
	targetNormalLuma: number;
	maxNormalLuma: number;
	targetMutesSaturation: number;
	maxMutesSaturation: number;
	targetVibrantSaturation: number;
	minVibrantSaturation: number;
	weightSaturation: number;
	weightLuma: number;
	weightPopulation: number;
}

export const DefaultOpts: GeneratorOptions = {
	targetDarkLuma: 0.26,
	maxDarkLuma: 0.45,
	minLightLuma: 0.55,
	targetLightLuma: 0.74,
	minNormalLuma: 0.3,
	targetNormalLuma: 0.5,
	maxNormalLuma: 0.7,
	targetMutesSaturation: 0.3,
	maxMutesSaturation: 0.4,
	targetVibrantSaturation: 1.0,
	minVibrantSaturation: 0.35,
	weightSaturation: 3,
	weightLuma: 6.5,
	weightPopulation: 0,
};

const findMaxPopulation = (swatches: Array<Swatch>): number =>
	swatches.reduce((p, s) => Math.max(p, s.population), 0);

const isAlreadySelected = (palette: Palette, s: Swatch): boolean =>
	palette.Vibrant === s ||
	palette.DarkVibrant === s ||
	palette.LightVibrant === s ||
	palette.Muted === s ||
	palette.DarkMuted === s ||
	palette.LightMuted === s;

function createComparisonValue(
	saturation: number,
	targetSaturation: number,
	luma: number,
	targetLuma: number,
	population: number,
	maxPopulation: number,
	opts: GeneratorOptions,
): number {
	const weightedMean = (...values: number[]) => {
		let sum = 0;
		let weightSum = 0;
		for (let i = 0; i < values.length; i += 2) {
			const value = values[i];
			const weight = values[i + 1];
			if (!value || !weight) continue;
			sum += value * weight;
			weightSum += weight;
		}

		return sum / weightSum;
	};
	const invertDiff = (value: number, targetValue: number): number =>
		1 - Math.abs(value - targetValue);

	return weightedMean(
		invertDiff(saturation, targetSaturation),
		opts.weightSaturation,
		invertDiff(luma, targetLuma),
		opts.weightLuma,
		population / maxPopulation,
		opts.weightPopulation,
	);
}

function findColorVariation(
	palette: Palette,
	swatches: Array<Swatch>,
	maxPopulation: number,
	targetLuma: number,
	minLuma: number,
	maxLuma: number,
	targetSaturation: number,
	minSaturation: number,
	maxSaturation: number,
	opts: GeneratorOptions,
): Swatch | null {
	let max: Swatch | null = null;
	let maxValue = 0;

	swatches.forEach((swatch) => {
		const [, s, l] = swatch.hsl;

		if (
			s >= minSaturation &&
			s <= maxSaturation &&
			l >= minLuma &&
			l <= maxLuma &&
			!isAlreadySelected(palette, swatch)
		) {
			const value = createComparisonValue(
				s,
				targetSaturation,
				l,
				targetLuma,
				swatch.population,
				maxPopulation,
				opts,
			);

			if (max === null || value > maxValue) {
				max = swatch;
				maxValue = value;
			}
		}
	});

	return max;
}

function generateVariationColors(
	swatches: Array<Swatch>,
	maxPopulation: number,
	opts: GeneratorOptions,
): Palette {
	const palette: Palette = {
		Vibrant: null,
		DarkVibrant: null,
		LightVibrant: null,
		Muted: null,
		DarkMuted: null,
		LightMuted: null,
	};
	palette.Vibrant = findColorVariation(
		palette,
		swatches,
		maxPopulation,
		opts.targetNormalLuma,
		opts.minNormalLuma,
		opts.maxNormalLuma,
		opts.targetVibrantSaturation,
		opts.minVibrantSaturation,
		1,
		opts,
	);
	palette.LightVibrant = findColorVariation(
		palette,
		swatches,
		maxPopulation,
		opts.targetLightLuma,
		opts.minLightLuma,
		1,
		opts.targetVibrantSaturation,
		opts.minVibrantSaturation,
		1,
		opts,
	);
	palette.DarkVibrant = findColorVariation(
		palette,
		swatches,
		maxPopulation,
		opts.targetDarkLuma,
		0,
		opts.maxDarkLuma,
		opts.targetVibrantSaturation,
		opts.minVibrantSaturation,
		1,
		opts,
	);
	palette.Muted = findColorVariation(
		palette,
		swatches,
		maxPopulation,
		opts.targetNormalLuma,
		opts.minNormalLuma,
		opts.maxNormalLuma,
		opts.targetMutesSaturation,
		0,
		opts.maxMutesSaturation,
		opts,
	);
	palette.LightMuted = findColorVariation(
		palette,
		swatches,
		maxPopulation,
		opts.targetLightLuma,
		opts.minLightLuma,
		1,
		opts.targetMutesSaturation,
		0,
		opts.maxMutesSaturation,
		opts,
	);
	palette.DarkMuted = findColorVariation(
		palette,
		swatches,
		maxPopulation,
		opts.targetDarkLuma,
		0,
		opts.maxDarkLuma,
		opts.targetMutesSaturation,
		0,
		opts.maxMutesSaturation,
		opts,
	);
	return palette;
}

function generateEmptySwatches(
	palette: Palette,
	opts: GeneratorOptions,
): void {
	if (!palette.Vibrant && palette.DarkVibrant) {
		let [h, s, l] = palette.DarkVibrant.hsl;
		l = opts.targetNormalLuma;
		palette.Vibrant = new Swatch(hslToRgb(h, s, l), 0);
	} else if (!palette.Vibrant && palette.LightVibrant) {
		let [h, s, l] = palette.LightVibrant.hsl;
		l = opts.targetNormalLuma;
		palette.Vibrant = new Swatch(hslToRgb(h, s, l), 0);
	}
	if (!palette.DarkVibrant && palette.Vibrant) {
		let [h, s, l] = palette.Vibrant.hsl;
		l = opts.targetDarkLuma;
		palette.DarkVibrant = new Swatch(hslToRgb(h, s, l), 0);
	}
	if (!palette.LightVibrant && palette.Vibrant) {
		let [h, s, l] = palette.Vibrant.hsl;
		l = opts.targetLightLuma;
		palette.LightVibrant = new Swatch(hslToRgb(h, s, l), 0);
	}
	if (!palette.Muted && palette.Vibrant) {
		let [h, s, l] = palette.Vibrant.hsl;
		l = opts.targetMutesSaturation;
		palette.Muted = new Swatch(hslToRgb(h, s, l), 0);
	}
	if (!palette.DarkMuted && palette.DarkVibrant) {
		let [h, s, l] = palette.DarkVibrant.hsl;
		l = opts.targetMutesSaturation;
		palette.DarkMuted = new Swatch(hslToRgb(h, s, l), 0);
	}
	if (!palette.LightMuted && palette.LightVibrant) {
		let [h, s, l] = palette.LightVibrant.hsl;
		l = opts.targetMutesSaturation;
		palette.LightMuted = new Swatch(hslToRgb(h, s, l), 0);
	}
}

export function generateDefaultPalette(
	swatches: Array<Swatch>,
	opts?: Partial<GeneratorOptions>,
): Palette {
	const settings = Object.assign({}, DefaultOpts, opts);
	const maxPopulation = findMaxPopulation(swatches);

	const palette = generateVariationColors(swatches, maxPopulation, settings);
	generateEmptySwatches(palette, settings);

	return palette;
}
