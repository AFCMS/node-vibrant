import sharp from "sharp";
import { expect, it, describe } from "vitest";

import { loadTestSamples } from "../../../fixtures/sample/loader";
import { getPaletteFromSharp } from "../src";
import { rgbDiff } from "../src/color";

const SAMPLES = loadTestSamples();

describe("Sharp palette extraction", () => {
	SAMPLES.forEach((sample) => {
		it(`matches node palette for ${sample.name}`, async () => {
			const sharpPalette = await getPaletteFromSharp(sharp(sample.filePath));

			const nodePalette = sample.palettes["node"] as Record<
				string,
				{ rgb: [number, number, number] } | null
			>;

			const names = Object.keys(nodePalette);

			for (const name of names) {
				const a = sharpPalette[name];
				const b = nodePalette[name];
				expect(a, "sharp swatch missing").not.toBeNull();
				expect(b, "node swatch missing").not.toBeNull();
				if (a && b) {
					const diff = rgbDiff(a.rgb as [number, number, number], b.rgb as [
						number,
						number,
						number,
					]);
					expect(diff).toBeLessThanOrEqual(2);
				}
			}
		});
	});
});
