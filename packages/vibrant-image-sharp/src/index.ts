import type { Palette } from "@vibrant/color";
import { BasicPipeline } from "@vibrant/core";
import type { ImageData, ImageOptions } from "@vibrant/image";
import { DefaultGenerator } from "@vibrant/generator-default";
import { MMCQ } from "@vibrant/quantizer-mmcq";
import type { Sharp } from "sharp";

const sharpPipeline = new BasicPipeline()
	.filter.register(
		"default",
		(r: number, g: number, b: number, a: number) =>
			a >= 125 && !(r > 250 && g > 250 && b > 250),
	)
	.quantizer.register("mmcq", MMCQ)
	.generator.register("default", DefaultGenerator);

export interface SharpVibrantOptions extends Partial<ImageOptions> {
	colorCount?: number;
}

const DEFAULT_OPTIONS: Required<SharpVibrantOptions> = {
	colorCount: 64,
	quality: 5,
	maxDimension: 0,
};

const getScaleRatio = (
	width: number,
	height: number,
	opts: SharpVibrantOptions,
) => {
	let ratio = 1;

	if (opts.maxDimension > 0) {
		const maxSide: number = Math.max(width, height);
		if (maxSide > opts.maxDimension) {
			ratio = opts.maxDimension / maxSide;
		}
	} else if (opts.quality > 0) {
		ratio = 1 / opts.quality;
	}

	return ratio < 1 ? ratio : 1;
};

const getSharpImageData = async (
	image: Sharp,
	opts: SharpVibrantOptions,
): Promise<ImageData> => {
	const metadata = await image.metadata();
	if (!metadata.width || !metadata.height) {
		throw new Error("Invalid image: missing dimensions");
	}

	const ratio = getScaleRatio(metadata.width, metadata.height, opts);
	const targetWidth = Math.max(1, Math.round(metadata.width * ratio));
	const targetHeight = Math.max(1, Math.round(metadata.height * ratio));

	const base = image.clone().ensureAlpha();

	const pipeline =
		ratio < 1
			? base.resize(targetWidth, targetHeight, {
					fit: "fill",
					kernel: "cubic",
				})
			: base;

	const { data, info } = await pipeline
		.raw()
		.toBuffer({ resolveWithObject: true });

	return {
		data,
		width: info.width,
		height: info.height,
	};
};

export const getPaletteFromSharp = async (
	image: Sharp,
	options: SharpVibrantOptions = {},
): Promise<Palette> => {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const imageData = await getSharpImageData(image, opts);
	const result = await sharpPipeline.process(imageData, {
		filters: ["default"],
		quantizer: {
			name: "mmcq",
			options: { colorCount: opts.colorCount },
		},
		generators: ["default"],
	});

	const palette = result.palettes.default;

	if (!palette) {
		throw new Error("Failed to generate palette from sharp image");
	}

	return palette;
};
