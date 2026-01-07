import type { ImageData, Pixels } from "./types";

export const resizeBilinear = (
	source: ImageData,
	targetWidth: number,
	targetHeight: number,
): ImageData => {
	const { data, width: srcW, height: srcH } = source;
	const dest = Buffer.alloc(targetWidth * targetHeight * 4);

	for (let y = 0; y < targetHeight; y++) {
		const sy = (y + 0.5) * (srcH / targetHeight) - 0.5;
		const y1 = Math.max(Math.floor(sy), 0);
		const y2 = Math.min(y1 + 1, srcH - 1);
		const yLerp = sy - y1;
		for (let x = 0; x < targetWidth; x++) {
			const sx = (x + 0.5) * (srcW / targetWidth) - 0.5;
			const x1 = Math.max(Math.floor(sx), 0);
			const x2 = Math.min(x1 + 1, srcW - 1);
			const xLerp = sx - x1;

			const idx = (y * targetWidth + x) * 4;

			for (let c = 0; c < 4; c++) {
				const i11 = (y1 * srcW + x1) * 4 + c;
				const i12 = (y1 * srcW + x2) * 4 + c;
				const i21 = (y2 * srcW + x1) * 4 + c;
				const i22 = (y2 * srcW + x2) * 4 + c;

				const v11 = data[i11]!;
				const v12 = data[i12]!;
				const v21 = data[i21]!;
				const v22 = data[i22]!;

				const v1 = v11 + (v12 - v11) * xLerp;
				const v2 = v21 + (v22 - v21) * xLerp;
				const v = v1 + (v2 - v1) * yLerp;

				dest[idx + c] = v;
			}
		}
	}

	return { data: dest as Pixels, width: targetWidth, height: targetHeight };
};
