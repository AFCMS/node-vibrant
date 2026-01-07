import sharp from "sharp";
import { applyFilters } from "./filters";
import { generateDefaultPalette } from "./generator-default";
import { mmcq } from "./mmcq";
import { resizeBilinear } from "./resize";
import type { Palette, Filter } from "./color";
import type { ImageData, SharpVibrantOptions } from "./types";
import { Swatch } from "./color";

const defaultFilter: Filter = (r, g, b, a) =>
	a >= 125 && !(r > 250 && g > 250 && b > 250);

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

	if (opts.maxDimension && opts.maxDimension > 0) {
		const maxSide: number = Math.max(width, height);
		if (maxSide > opts.maxDimension) {
			ratio = opts.maxDimension / maxSide;
		}
	} else if (opts.quality && opts.quality > 0) {
		ratio = 1 / opts.quality;
	}

	return ratio < 1 ? ratio : 1;
};

const loadSharpData = async (
	source: sharp.Sharp,
	opts: SharpVibrantOptions,
): Promise<ImageData> => {
	const image = source.clone();
	const metadata = await image.metadata();
	if (!metadata.width || !metadata.height) {
		throw new Error("Invalid image: missing dimensions");
	}

	const ratio = getScaleRatio(metadata.width, metadata.height, opts);
	const raw = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const base: ImageData = {
		data: raw.data,
		width: raw.info.width,
		height: raw.info.height,
	};

	if (ratio >= 1) return base;

	const targetWidth = Math.max(1, Math.round(metadata.width * ratio));
	const targetHeight = Math.max(1, Math.round(metadata.height * ratio));
	return resizeBilinear(base, targetWidth, targetHeight);
};

export const getPaletteFromSharp = async (
	image: sharp.Sharp,
	options: SharpVibrantOptions = {},
): Promise<Palette> => {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const imageData = await loadSharpData(image, opts);

	const filtered = applyFilters(imageData, [defaultFilter]);
	const swatches = mmcq(filtered.data, { colorCount: opts.colorCount });
	const palette = generateDefaultPalette(swatches);

	return palette;
};

export { Swatch, rgbDiff, rgbToHex } from "./color";
