import { ImageBase } from "@vibrant/image";
import { BasicPipeline, Vibrant } from "@vibrant/core";
import { MMCQ } from "@vibrant/quantizer-mmcq";
import { DefaultGenerator } from "@vibrant/generator-default";
import type { ImageData, ImageSource } from "@vibrant/image";
import type { Palette } from "@vibrant/color";
import type sharp from "sharp";

/**
 * Internal Image class implementation using sharp.
 * This class wraps a sharp.Sharp object and implements the ImageBase interface
 * required by the vibrant pipeline.
 */
class SharpImage extends ImageBase {
	private _width = 0;
	private _height = 0;
	private _data: Buffer | undefined;

	private _getImageData() {
		if (!this._data) {
			throw new Error("Image not loaded");
		}
		return this._data;
	}

	/**
	 * Load is not supported for SharpImage - use loadFromSharp instead.
	 * This method exists only to satisfy the ImageBase interface.
	 */
	load(_image: ImageSource): Promise<ImageBase> {
		return Promise.reject(
			new Error(
				"SharpImage does not support load(). Use getPaletteFromSharp() instead.",
			),
		);
	}

	/**
	 * Load image data from a sharp.Sharp object.
	 * Converts the image to raw RGBA pixel data.
	 */
	async loadFromSharp(sharpInstance: sharp.Sharp): Promise<SharpImage> {
		// Ensure we get raw RGBA data
		const { data, info } = await sharpInstance
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		this._width = info.width;
		this._height = info.height;
		this._data = data;

		return this;
	}

	clear(): void {}

	update(_imageData: ImageData): void {}

	getWidth(): number {
		return this._width;
	}

	getHeight(): number {
		return this._height;
	}

	resize(
		_targetWidth: number,
		_targetHeight: number,
		_ratio: number,
	): void {
		// For sharp, resize is a no-op since we handle it differently
		// The image is already loaded at this point, but we can update dimensions
		// if needed. In practice, the scaleDown is handled by the Vibrant class
		// before calling getImageData.
	}

	getPixelCount(): number {
		return this._width * this._height;
	}

	getImageData(): ImageData {
		return {
			data: this._getImageData(),
			width: this._width,
			height: this._height,
		};
	}

	remove(): void {}
}

// Create a pipeline matching the node-vibrant/node configuration
const pipeline = new BasicPipeline().filter
	.register(
		"default",
		(r: number, g: number, b: number, a: number) =>
			a >= 125 && !(r > 250 && g > 250 && b > 250),
	)
	.quantizer.register("mmcq", MMCQ)
	.generator.register("default", DefaultGenerator);

/**
 * Extract vibrant colors from a sharp.Sharp object.
 *
 * This function takes a sharp.Sharp instance and returns a Palette containing
 * the predefined vibrant colors: Vibrant, DarkVibrant, LightVibrant, Muted,
 * DarkMuted, and LightMuted.
 *
 * @param sharpInstance - A sharp.Sharp object containing the image to analyze
 * @returns A Promise that resolves to a Palette with the extracted colors
 *
 * @example
 * ```typescript
 * import sharp from "sharp";
 * import { getPaletteFromSharp } from "@vibrant/sharp";
 *
 * const image = sharp("path/to/image.jpg");
 * const palette = await getPaletteFromSharp(image);
 *
 * console.log(palette.Vibrant?.hex);
 * console.log(palette.DarkVibrant?.hex);
 * console.log(palette.LightVibrant?.hex);
 * console.log(palette.Muted?.hex);
 * console.log(palette.DarkMuted?.hex);
 * console.log(palette.LightMuted?.hex);
 * ```
 */
export async function getPaletteFromSharp(
	sharpInstance: sharp.Sharp,
): Promise<Palette> {
	// Get image metadata to determine original dimensions
	const metadata = await sharpInstance.metadata();
	const originalWidth = metadata.width ?? 0;
	const originalHeight = metadata.height ?? 0;

	// Apply the same scaling logic as the default Vibrant options
	// Default quality is 5, meaning we scale down by factor of 5
	const quality = 5;
	const ratio = 1 / quality;

	const targetWidth = Math.max(1, Math.floor(originalWidth * ratio));
	const targetHeight = Math.max(1, Math.floor(originalHeight * ratio));

	// Clone the sharp instance and resize it before extracting raw data
	const resizedSharp = sharpInstance.clone().resize(targetWidth, targetHeight);

	// Load the image into our SharpImage wrapper
	const image = new SharpImage();
	await image.loadFromSharp(resizedSharp);

	// Process the image through the vibrant pipeline
	const imageData = image.getImageData();
	const result = await pipeline.process(imageData, {
		quantizer: {
			name: "mmcq",
			options: {
				colorCount: Vibrant.DefaultOpts.colorCount ?? 64,
			},
		},
		generators: ["default"],
		filters: ["default"],
	});

	const palette = result.palettes["default"];
	if (!palette) {
		throw new Error(
			"Something went wrong and a palette was not found, please file a bug against our GitHub repo: https://github.com/Vibrant-Colors/node-vibrant/",
		);
	}

	image.remove();

	return palette;
}
