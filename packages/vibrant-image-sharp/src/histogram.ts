import type { Pixels } from "./types";

export interface HistogramOptions {
	sigBits: number;
}

export class Histogram {
	rmin: number;
	rmax: number;
	gmin: number;
	gmax: number;
	bmin: number;
	bmax: number;
	hist: Uint32Array;
	get colorCount() {
		return this._colorCount;
	}
	getColorIndex: (r: number, g: number, b: number) => number;
	private _colorCount: number;

	constructor(public pixels: Pixels, public opts: HistogramOptions) {
		const { sigBits } = opts;
		const getColorIndex = (r: number, g: number, b: number) =>
			(r << (2 * sigBits)) + (g << sigBits) + b;

		this.getColorIndex = getColorIndex;

		const rshift = 8 - sigBits;
		const hn = 1 << (3 * sigBits);
		const hist = new Uint32Array(hn);
		let rmax = 0;
		let rmin = Number.MAX_VALUE;
		let gmax = 0;
		let gmin = Number.MAX_VALUE;
		let bmax = 0;
		let bmin = Number.MAX_VALUE;
		const n = pixels.length / 4;
		let i = 0;

		while (i < n) {
			const offset = i * 4;
			i++;
			let r = pixels[offset + 0]!;
			let g = pixels[offset + 1]!;
			let b = pixels[offset + 2]!;
			const a = pixels[offset + 3]!;

			if (a === 0) continue;

			r = r >> rshift;
			g = g >> rshift;
			b = b >> rshift;

			const index = getColorIndex(r, g, b);
			hist[index]! += 1;

			if (r > rmax) rmax = r;
			if (r < rmin) rmin = r;
			if (g > gmax) gmax = g;
			if (g < gmin) gmin = g;
			if (b > bmax) bmax = b;
			if (b < bmin) bmin = b;
		}
		this._colorCount = hist.reduce(
			(total, c) => (c > 0 ? total + 1 : total),
			0,
		);
		this.hist = hist;
		this.rmax = rmax;
		this.rmin = rmin;
		this.gmax = gmax;
		this.gmin = gmin;
		this.bmax = bmax;
		this.bmin = bmin;
	}
}
