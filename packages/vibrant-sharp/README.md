# @vibrant/sharp

Extract vibrant colors from images using [sharp](https://sharp.pixelplumbing.com) for image processing.

This package provides a simple function to extract the 6 predefined vibrant colors from a `sharp.Sharp` object:
- Vibrant
- Dark Vibrant
- Light Vibrant
- Muted
- Dark Muted
- Light Muted

## Installation

```bash
npm install @vibrant/sharp sharp
```

## Usage

```typescript
import sharp from "sharp";
import { getPaletteFromSharp } from "@vibrant/sharp";

const image = sharp("path/to/image.jpg");
const palette = await getPaletteFromSharp(image);

console.log(palette.Vibrant?.hex);      // e.g., "#3bd5d2"
console.log(palette.DarkVibrant?.hex);  // e.g., "#3b1a0d"
console.log(palette.LightVibrant?.hex); // e.g., "#d4d874"
console.log(palette.Muted?.hex);        // e.g., "#9e685e"
console.log(palette.DarkMuted?.hex);    // e.g., "#56392c"
console.log(palette.LightMuted?.hex);   // e.g., "#cbc9cc"
```

## API

### `getPaletteFromSharp(sharpInstance: sharp.Sharp): Promise<Palette>`

Extracts vibrant colors from a sharp.Sharp object.

**Parameters:**
- `sharpInstance` - A sharp.Sharp instance containing the image to analyze

**Returns:**
A Promise that resolves to a `Palette` object with the following properties:
- `Vibrant` - A `Swatch` object or `null`
- `DarkVibrant` - A `Swatch` object or `null`
- `LightVibrant` - A `Swatch` object or `null`
- `Muted` - A `Swatch` object or `null`
- `DarkMuted` - A `Swatch` object or `null`
- `LightMuted` - A `Swatch` object or `null`

Each `Swatch` object contains:
- `rgb` - The RGB color as `[r, g, b]`
- `hex` - The hex color string (e.g., `"#ff0000"`)
- `hsl` - The HSL color as `[h, s, l]`
- `population` - The number of pixels with this color
- `titleTextColor` - Appropriate text color for titles (`"#fff"` or `"#000"`)
- `bodyTextColor` - Appropriate text color for body text (`"#fff"` or `"#000"`)

## Features

- **Node.js only** - Designed for server-side usage
- **Sharp-based** - Uses sharp for fast, efficient image processing
- **No jimp dependency** - Unlike `node-vibrant/node`, this package doesn't depend on jimp
- **Same output** - Produces identical color extraction results as `node-vibrant/node`

## License

MIT
