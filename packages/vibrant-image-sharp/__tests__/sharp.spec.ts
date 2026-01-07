import sharp from "sharp";
import { expect, it, describe } from "vitest";

import { loadTestSamples } from "../../../fixtures/sample/loader";
import { Vibrant } from "../../node-vibrant/src/node";
import { getPaletteFromSharp } from "../src";

const SAMPLES = loadTestSamples();

const SCENARIOS = [
	{
		label: "quality 1",
		sharpOptions: { quality: 1 },
		configure: (builder: ReturnType<typeof Vibrant.from>) => builder.quality(1),
	},
	{
		label: "default options",
		sharpOptions: undefined,
		configure: (builder: ReturnType<typeof Vibrant.from>) => builder,
	},
];

describe("Sharp palette extraction", () => {
	SCENARIOS.forEach(({ label, sharpOptions, configure }) => {
		describe(label, () => {
			SAMPLES.forEach((sample) => {
				it(`matches node palette for ${sample.name}`, async () => {
					const sharpPalette = await getPaletteFromSharp(
						sharp(sample.filePath),
						sharpOptions ?? {},
					);

					const nodePalette = await configure(
						Vibrant.from(sample.filePath),
					).getPalette();

					const names = Object.keys(nodePalette);

					for (const name of names) {
						expect(sharpPalette[name]?.hex ?? null).toEqual(
							nodePalette[name]?.hex ?? null,
						);
					}
				});
			});
		});
	});
});
