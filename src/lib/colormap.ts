/**
 * Colormaps matching the project figures: Moreland's cool-warm for pressure
 * coefficient, and a Blues ramp (dark = slow) for air speed.
 */
type RGB = [number, number, number];

const COOLWARM: RGB[] = [
  [59, 76, 192], [98, 130, 234], [141, 176, 254], [184, 208, 249], [221, 221, 221],
  [245, 196, 173], [244, 154, 123], [222, 96, 77], [180, 4, 38],
];
const BLUES: RGB[] = [[8, 48, 107], [33, 113, 181], [107, 174, 214], [198, 219, 239], [247, 251, 255]];

function sample(stops: RGB[], t: number): RGB {
  const c = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(c));
  const f = c - i;
  const [a, b] = [stops[i], stops[i + 1]];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

export const coolwarm = (t: number) => sample(COOLWARM, t);
export const blues = (t: number) => sample(BLUES, t);
export const rgb = (c: RGB) => `rgb(${c.map((v) => Math.round(v)).join(' ')})`;

/** CSS linear-gradient for a legend bar. */
export function legendGradient(map: (t: number) => RGB, steps = 9) {
  const stops = Array.from({ length: steps }, (_, i) => `${rgb(map(i / (steps - 1)))} ${((i / (steps - 1)) * 100).toFixed(1)}%`);
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
