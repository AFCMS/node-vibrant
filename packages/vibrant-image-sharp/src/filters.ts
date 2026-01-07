import type { Filter } from "./color";
import type { ImageData } from "./types";

export const applyFilters = (imageData: ImageData, filters: Filter[]) => {
	if (filters.length === 0) return imageData;
	const pixels = imageData.data;
	const n = pixels.length / 4;
	for (let i = 0; i < n; i++) {
		const offset = i * 4;
		const r = pixels[offset + 0]!;
		const g = pixels[offset + 1]!;
		const b = pixels[offset + 2]!;
		const a = pixels[offset + 3]!;
		for (let j = 0; j < filters.length; j++) {
			if (!filters[j]?.(r, g, b, a)) {
				pixels[offset + 3] = 0;
				break;
			}
		}
	}
	return imageData;
};
