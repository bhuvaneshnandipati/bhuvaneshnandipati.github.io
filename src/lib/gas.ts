/**
 * Calorically perfect gas relations used for the Orion stagnation-point check.
 * These are textbook results (e.g. Anderson, Modern Compressible Flow), not simulation output.
 */

/** Rayleigh pitot formula: total pressure behind a normal shock over freestream static pressure. */
export function pitotRatio(M: number, g = 1.4): number {
  const a = ((g + 1) ** 2 * M * M) / (4 * g * M * M - 2 * (g - 1));
  return a ** (g / (g - 1)) * ((1 - g + 2 * g * M * M) / (g + 1));
}

/** Stagnation-point pressure coefficient behind a normal shock, Cp,max = (p02/p∞ − 1) / (γM²/2). */
export const cpMax = (M: number, g = 1.4) => (pitotRatio(M, g) - 1) / ((g * M * M) / 2);

/** Hypersonic limit of Cp,max as M → ∞. */
export const cpMaxLimit = (g = 1.4) => ((g + 1) ** 2 / (4 * g)) ** (g / (g - 1)) * (4 / (g + 1));

/** Normal-shock static pressure and temperature ratios and downstream Mach number. */
export function normalShock(M: number, g = 1.4) {
  const p = 1 + ((2 * g) / (g + 1)) * (M * M - 1);
  const rho = ((g + 1) * M * M) / ((g - 1) * M * M + 2);
  return { p, rho, T: p / rho, M2: Math.sqrt((1 + 0.5 * (g - 1) * M * M) / (g * M * M - 0.5 * (g - 1))) };
}

/** Freestream stagnation temperature, T0 = T (1 + (γ−1)/2 M²). */
export const stagnationTemperature = (T: number, M: number, g = 1.4) => T * (1 + 0.5 * (g - 1) * M * M);
