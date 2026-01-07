export type Pixels = Uint8ClampedArray | Buffer;

export interface ImageData {
	data: Pixels;
	width: number;
	height: number;
}

export interface SharpVibrantOptions {
	quality?: number;
	maxDimension?: number;
	colorCount?: number;
}
