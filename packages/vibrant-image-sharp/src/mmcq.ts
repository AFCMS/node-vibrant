import { Histogram } from "./histogram";
import { Swatch } from "./color";
import type { Pixels } from "./types";
import type { Vec3 } from "./color";

const SIGBITS = 5;
const RSHIFT = 8 - SIGBITS;

interface Dimension {
	r1: number;
	r2: number;
	g1: number;
	g2: number;
	b1: number;
	b2: number;
	[d: string]: number;
}

class VBox {
	dimension: Dimension;
	private _volume = -1;
	private _avg: Vec3 | null = null;
	private _count = -1;
	constructor(
		r1: number,
		r2: number,
		g1: number,
		g2: number,
		b1: number,
		b2: number,
		public histogram: Histogram,
	) {
		this.dimension = { r1, r2, g1, g2, b1, b2 };
	}

	static build(pixels: Pixels): VBox {
		const h = new Histogram(pixels, { sigBits: SIGBITS });
		const { rmin, rmax, gmin, gmax, bmin, bmax } = h;
		return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, h);
	}

	invalidate(): void {
		this._volume = this._count = -1;
		this._avg = null;
	}

	volume(): number {
		if (this._volume < 0) {
			const { r1, r2, g1, g2, b1, b2 } = this.dimension;
			this._volume = (r2 - r1 + 1) * (g2 - g1 + 1) * (b2 - b1 + 1);
		}
		return this._volume;
	}

	count(): number {
		if (this._count < 0) {
			const { hist, getColorIndex } = this.histogram;
			const { r1, r2, g1, g2, b1, b2 } = this.dimension;
			let c = 0;

			for (let r = r1; r <= r2; r++) {
				for (let g = g1; g <= g2; g++) {
					for (let b = b1; b <= b2; b++) {
						const index = getColorIndex(r, g, b);
						if (!hist[index]) continue;
						c += hist[index]!;
					}
				}
			}
			this._count = c;
		}
		return this._count;
	}

	clone(): VBox {
		const { histogram } = this;
		const { r1, r2, g1, g2, b1, b2 } = this.dimension;
		return new VBox(r1, r2, g1, g2, b1, b2, histogram);
	}

	avg(): Vec3 {
		if (!this._avg) {
			const { hist, getColorIndex } = this.histogram;
			const { r1, r2, g1, g2, b1, b2 } = this.dimension;
			let ntot = 0;
			const mult = 1 << RSHIFT;
			let rsum = 0;
			let gsum = 0;
			let bsum = 0;

			for (let r = r1; r <= r2; r++) {
				for (let g = g1; g <= g2; g++) {
					for (let b = b1; b <= b2; b++) {
						const index = getColorIndex(r, g, b);
						const h = hist[index];
						if (!h) continue;
						ntot += h;
						rsum += h * (r + 0.5) * mult;
						gsum += h * (g + 0.5) * mult;
						bsum += h * (b + 0.5) * mult;
					}
				}
			}
			if (ntot) {
				this._avg = [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)];
			} else {
				this._avg = [
					~~((mult * (r1 + r2 + 1)) / 2),
					~~((mult * (g1 + g2 + 1)) / 2),
					~~((mult * (b1 + b2 + 1)) / 2),
				];
			}
		}
		return this._avg;
	}

	split(): VBox[] {
		const { hist, getColorIndex } = this.histogram;
		const { r1, r2, g1, g2, b1, b2 } = this.dimension;
		const count = this.count();
		if (!count) return [];
		if (count === 1) return [this.clone()];
		const rw = r2 - r1 + 1;
		const gw = g2 - g1 + 1;
		const bw = b2 - b1 + 1;

		const maxw = Math.max(rw, gw, bw);
		let accSum: Uint32Array | null = null;
		let sum: number;
		let total: number;
		sum = total = 0;

		let maxd: "r" | "g" | "b" | null = null;

		if (maxw === rw) {
			maxd = "r";
			accSum = new Uint32Array(r2 + 1);
			for (let r = r1; r <= r2; r++) {
				sum = 0;
				for (let g = g1; g <= g2; g++) {
					for (let b = b1; b <= b2; b++) {
						const index = getColorIndex(r, g, b);
						if (!hist[index]) continue;
						sum += hist[index]!;
					}
				}
				total += sum;
				accSum[r] = total;
			}
		} else if (maxw === gw) {
			maxd = "g";
			accSum = new Uint32Array(g2 + 1);
			for (let g = g1; g <= g2; g++) {
				sum = 0;
				for (let r = r1; r <= r2; r++) {
					for (let b = b1; b <= b2; b++) {
						const index = getColorIndex(r, g, b);
						if (!hist[index]) continue;
						sum += hist[index]!;
					}
				}
				total += sum;
				accSum[g] = total;
			}
		} else {
			maxd = "b";
			accSum = new Uint32Array(b2 + 1);
			for (let b = b1; b <= b2; b++) {
				sum = 0;
				for (let r = r1; r <= r2; r++) {
					for (let g = g1; g <= g2; g++) {
						const index = getColorIndex(r, g, b);
						if (!hist[index]) continue;
						sum += hist[index]!;
					}
				}
				total += sum;
				accSum[b] = total;
			}
		}

		let splitPoint = -1;
		const reverseSum = new Uint32Array(accSum.length);
		for (let i = 0; i < accSum.length; i++) {
			const d = accSum[i];
			if (!d) continue;
			if (splitPoint < 0 && d > total / 2) splitPoint = i;
			reverseSum[i] = total - d;
		}

		const vbox = this;

		function doCut(d: string): VBox[] {
			const dim1 = d + "1";
			const dim2 = d + "2";
			const d1 = vbox.dimension[dim1]!;
			let d2 = vbox.dimension[dim2]!;
			const vbox1 = vbox.clone();
			const vbox2 = vbox.clone();
			const left = splitPoint - d1;
			const right = d2 - splitPoint;

			if (left <= right) {
				d2 = Math.min(d2 - 1, ~~(splitPoint + right / 2));
				d2 = Math.max(0, d2);
			} else {
				d2 = Math.max(d1, ~~(splitPoint - 1 - left / 2));
				d2 = Math.min(vbox.dimension[dim2]!, d2);
			}

			while (!accSum![d2]) d2++;

			let c2 = reverseSum[d2];
			while (!c2 && accSum![d2 - 1]) c2 = reverseSum[--d2];

			vbox1.dimension[dim2] = d2;
			vbox2.dimension[dim1] = d2 + 1;

			return [vbox1, vbox2];
		}

		return doCut(maxd);
	}
}

class PQueue<T> {
	contents: T[] = [];
	private sorted = false;
	constructor(private sort: (a: T, b: T) => number) {}
	private ensureSorted() {
		if (!this.sorted) {
			this.contents.sort(this.sort);
			this.sorted = true;
		}
	}
	push(item: T) {
		this.contents.push(item);
		this.sorted = false;
	}
	pop(): T | undefined {
		this.ensureSorted();
		return this.contents.pop();
	}
	size() {
		return this.contents.length;
	}
}

export interface QuantizerOptions {
	colorCount: number;
}

export const mmcq = (pixels: Pixels, opts: QuantizerOptions): Array<Swatch> => {
	if (pixels.length === 0 || opts.colorCount < 2 || opts.colorCount > 256) {
		throw new Error("Wrong MMCQ parameters");
	}

	const vbox = VBox.build(pixels);
	const pq = new PQueue<VBox>((a, b) => a.count() - b.count());

	pq.push(vbox);

	// first set of colors, sorted by population
	splitBoxes(pq, 0.75 * opts.colorCount);

	// Re-order
	const pq2 = new PQueue<VBox>(
		(a, b) => a.count() * a.volume() - b.count() * b.volume(),
	);
	pq2.contents = pq.contents;

	// next set - generate the median cuts using the (npix * vol) sorting.
	splitBoxes(pq2, opts.colorCount - pq2.size());

	// calculate the actual colors
	return generateSwatches(pq2);
};

function splitBoxes(pq: PQueue<VBox>, target: number): void {
	let lastSize = pq.size();
	while (pq.size() < target) {
		const vbox = pq.pop();

		if (vbox && vbox.count() > 0) {
			const [vbox1, vbox2] = vbox.split();

			if (!vbox1) break;

			pq.push(vbox1);
			if (vbox2 && vbox2.count() > 0) pq.push(vbox2);

			if (pq.size() === lastSize) {
				break;
			} else {
				lastSize = pq.size();
			}
		} else {
			break;
		}
	}
}

function generateSwatches(pq: PQueue<VBox>) {
	const swatches: Swatch[] = [];
	while (pq.size()) {
		const v = pq.pop()!;
		const color = v.avg();
		swatches.push(new Swatch(color, v.count()));
	}
	return swatches;
}
