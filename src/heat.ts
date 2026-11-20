type Rgba = [number, number, number, number];

const STOPS: [number, Rgba][] = [
  [0, [37, 52, 148, 0]],
  [0.25, [44, 127, 184, 90]],
  [0.5, [65, 182, 196, 130]],
  [0.7, [254, 217, 118, 170]],
  [0.85, [253, 141, 60, 200]],
  [1, [227, 26, 28, 225]],
];

const LOOKUP = buildLookup();

export function heatColor(level: number): Rgba {
  const value = Math.min(1, Math.max(0, level));
  for (let index = 1; index < STOPS.length; index++) {
    const [position, to] = STOPS[index] as [number, Rgba];
    const [start, from] = STOPS[index - 1] as [number, Rgba];
    if (value <= position) {
      const t = (value - start) / (position - start);
      return from.map((channel, i) =>
        Math.round(channel + ((to[i] as number) - channel) * t),
      ) as Rgba;
    }
  }
  return (STOPS.at(-1) as [number, Rgba])[1];
}

export function colorize(pixels: Uint8ClampedArray): void {
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const base = (pixels[offset] ?? 0) * 4;
    pixels[offset] = LOOKUP[base] as number;
    pixels[offset + 1] = LOOKUP[base + 1] as number;
    pixels[offset + 2] = LOOKUP[base + 2] as number;
    pixels[offset + 3] = LOOKUP[base + 3] as number;
  }
}

function buildLookup(): Uint8ClampedArray {
  const table = new Uint8ClampedArray(256 * 4);
  for (let level = 0; level < 256; level++) table.set(heatColor(level / 255), level * 4);
  return table;
}
