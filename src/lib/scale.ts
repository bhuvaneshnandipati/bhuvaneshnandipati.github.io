/** Minimal scale helpers for build-time SVG charts. */
export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** Evenly spaced ticks from `start` to `end` inclusive. */
export function ticks(start: number, end: number, step: number) {
  const out: number[] = [];
  const n = Math.round((end - start) / step);
  for (let i = 0; i <= n; i++) out.push(+(start + i * step).toFixed(10));
  return out;
}

export const fmt = (v: number, digits = 0) =>
  v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace('-', '−');
