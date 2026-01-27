import path from "node:path";
import { fileURLToPath } from "node:url";
import * as util from "@vibrant/color";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import palettesJson from "../../../fixtures/sample/images/palettes.json";
import { getPaletteFromSharp } from "../src/index";

import type { Palette, Swatch } from "@vibrant/color";

// Load the same fixture samples that node-vibrant uses
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reference palettes from the fixtures (same as node-vibrant/node tests)
const FIXTURE_DIR = path.join(__dirname, "../../../fixtures/sample/images");

interface SamplePalette {
	name: string;
	palettes: {
		node: Palette;
		browser: Palette;
	};
}

const REFERENCE_PALETTES = palettesJson as SamplePalette[];

const assertPalette = (reference: Palette, palette: Palette) => {
	expect(palette, "palette should be returned").not.toBeNull();

	let failCount = 0;
	const names = ["Vibrant", "LightVibrant", "DarkVibrant", "Muted", "LightMuted", "DarkMuted"];
	
	for (const name of names) {
		const expected = reference[name] as Swatch | undefined | null;
		const actual = palette[name];

		if (!expected) {
			if (actual) {
				console.warn(`WARN: ${name} color was not expected. Got ${actual.hex}`);
			}
		} else {
			expect(actual, `${name} color was expected`).not.toBeNull();
			if (actual) {
				const diff = util.rgbDiff(actual.rgb, expected.rgb);
				if (diff > util.DELTAE94_DIFF_STATUS.SIMILAR) {
					console.error(`${name}: diff=${diff.toPrecision(2)}, expected=${expected.rgb}, actual=${actual.rgb}`);
					failCount++;
				}
			}
		}
	}

	expect(
		failCount,
		`${failCount} colors are too different from reference palettes`,
	).toBe(0);
};

describe("@vibrant/sharp", () => {
	describe("getPaletteFromSharp", () => {
		for (const sample of REFERENCE_PALETTES) {
			it(`should extract correct palette from ${sample.name}`, async () => {
				const imagePath = path.join(FIXTURE_DIR, sample.name);
				const sharpInstance = sharp(imagePath);
				
				const palette = await getPaletteFromSharp(sharpInstance);
				
				// Validate against the node reference palette (since we're Node-only)
				assertPalette(sample.palettes.node, palette);
			});
		}
	});

	describe("palette structure", () => {
		it("should return all six palette colors", async () => {
			const imagePath = path.join(FIXTURE_DIR, "1.jpg");
			const sharpInstance = sharp(imagePath);
			
			const palette = await getPaletteFromSharp(sharpInstance);
			
			// Check that all expected keys exist
			expect(palette).toHaveProperty("Vibrant");
			expect(palette).toHaveProperty("DarkVibrant");
			expect(palette).toHaveProperty("LightVibrant");
			expect(palette).toHaveProperty("Muted");
			expect(palette).toHaveProperty("DarkMuted");
			expect(palette).toHaveProperty("LightMuted");
		});

		it("should return Swatch objects with correct properties", async () => {
			const imagePath = path.join(FIXTURE_DIR, "1.jpg");
			const sharpInstance = sharp(imagePath);
			
			const palette = await getPaletteFromSharp(sharpInstance);
			
			// Check Vibrant swatch properties
			const vibrant = palette.Vibrant;
			expect(vibrant).not.toBeNull();
			if (vibrant) {
				expect(vibrant.rgb).toBeInstanceOf(Array);
				expect(vibrant.rgb).toHaveLength(3);
				expect(typeof vibrant.hex).toBe("string");
				expect(vibrant.hex).toMatch(/^#[0-9a-f]{6}$/i);
				expect(typeof vibrant.population).toBe("number");
				expect(vibrant.hsl).toBeInstanceOf(Array);
				expect(vibrant.hsl).toHaveLength(3);
				expect(typeof vibrant.titleTextColor).toBe("string");
				expect(typeof vibrant.bodyTextColor).toBe("string");
			}
		});
	});
});
