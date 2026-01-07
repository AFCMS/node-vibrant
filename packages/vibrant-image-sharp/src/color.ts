export type Vec3 = [number, number, number];

export interface Palette {
	Vibrant: Swatch | null;
	Muted: Swatch | null;
	DarkVibrant: Swatch | null;
	DarkMuted: Swatch | null;
	LightVibrant: Swatch | null;
	LightMuted: Swatch | null;
	[name: string]: Swatch | null;
}

export interface Filter {
	(r: number, g: number, b: number, a: number): boolean;
}

export const DELTAE94_DIFF_STATUS = {
	NA: 0,
	PERFECT: 1,
	CLOSE: 2,
	GOOD: 10,
	SIMILAR: 50,
};

export class Swatch {
	private _hsl: Vec3 | undefined;
	private _yiq: number | undefined;
	private _hex: string | undefined;
	private _titleTextColor: string | undefined;
	private _bodyTextColor: string | undefined;
	constructor(private _rgb: Vec3, private _population: number) {}

	get r() {
		return this._rgb[0];
	}
	get g() {
		return this._rgb[1];
	}
	get b() {
		return this._rgb[2];
	}
	get rgb() {
		return this._rgb;
	}
	get population() {
		return this._population;
	}
	get hsl(): Vec3 {
		if (!this._hsl) {
			this._hsl = rgbToHsl(...this._rgb);
		}
		return this._hsl;
	}
	get hex(): string {
		if (!this._hex) {
			this._hex = rgbToHex(...this._rgb);
		}
		return this._hex;
	}

	private getYiq(): number {
		if (!this._yiq) {
			const rgb = this._rgb;
			this._yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
		}
		return this._yiq;
	}

	get titleTextColor() {
		if (!this._titleTextColor) {
			this._titleTextColor = this.getYiq() < 200 ? "#fff" : "#000";
		}
		return this._titleTextColor;
	}

	get bodyTextColor() {
		if (!this._bodyTextColor) {
			this._bodyTextColor = this.getYiq() < 150 ? "#fff" : "#000";
		}
		return this._bodyTextColor;
	}
}

export function rgbToHex(r: number, g: number, b: number): string {
	return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1, 7);
}

export function rgbToHsl(r: number, g: number, b: number): Vec3 {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): Vec3 {
	let r: number;
	let g: number;
	let b: number;

	function hue2rgb(p: number, q: number, t: number): number {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	}

	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return [r * 255, g * 255, b * 255];
}

function rgbToXyz(r: number, g: number, b: number): Vec3 {
	r /= 255;
	g /= 255;
	b /= 255;
	r = r > 0.04045 ? Math.pow((r + 0.005) / 1.055, 2.4) : r / 12.92;
	g = g > 0.04045 ? Math.pow((g + 0.005) / 1.055, 2.4) : g / 12.92;
	b = b > 0.04045 ? Math.pow((b + 0.005) / 1.055, 2.4) : b / 12.92;

	r *= 100;
	g *= 100;
	b *= 100;

	const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
	const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
	const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

	return [x, y, z];
}

function xyzToCIELab(x: number, y: number, z: number): Vec3 {
	const REF_X = 95.047;
	const REF_Y = 100;
	const REF_Z = 108.883;

	x /= REF_X;
	y /= REF_Y;
	z /= REF_Z;

	x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
	y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
	z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

	const L = 116 * y - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [L, a, b];
}

export function rgbDiff(rgb1: Vec3, rgb2: Vec3): number {
	const lab1 = xyzToCIELab(...rgbToXyz(...rgb1));
	const lab2 = xyzToCIELab(...rgbToXyz(...rgb2));
	const dL = lab1[0] - lab2[0];
	const da = lab1[1] - lab2[1];
	const db = lab1[2] - lab2[2];

	const xC1 = Math.sqrt(lab1[1] * lab1[1] + lab1[2] * lab1[2]);
	const xC2 = Math.sqrt(lab2[1] * lab2[1] + lab2[2] * lab2[2]);

	let xDL = lab2[0] - lab1[0];
	let xDC = xC2 - xC1;
	const xDE = Math.sqrt(dL * dL + da * da + db * db);

	let xDH =
		Math.sqrt(xDE) > Math.sqrt(Math.abs(xDL)) + Math.sqrt(Math.abs(xDC))
			? Math.sqrt(xDE * xDE - xDL * xDL - xDC * xDC)
			: 0;

	const xSC = 1 + 0.045 * xC1;
	const xSH = 1 + 0.015 * xC1;

	xDL /= 1;
	xDC /= 1 * xSC;
	xDH /= 1 * xSH;

	return Math.sqrt(xDL * xDL + xDC * xDC + xDH * xDH);
}
