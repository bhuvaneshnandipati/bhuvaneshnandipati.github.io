/**
 * 1-D screening model for the cold plates, ported line for line from the owner's explainer
 * (itself a port of murray_schedule.py, Milestone 1). Inputs: heat load Q [W], water flow
 * V [L/min], inlet temperature Tin [°C]. Geometry fixed (see data/coldplate-geom.ts).
 *  - Pressure drop: fully developed friction scaled by the Muzychka–Yovanovich apparent
 *    friction factor for developing flow.
 *  - Temperature: Nu = 4.5 (fully developed bound, Dh_eff 0.9 mm), conduction through the base.
 *  - Entropy generation split into viscous and thermal parts.
 */
import { GEOM } from '../data/coldplate-geom';

export interface GenResult { gen: number; n: number; v: number; Re: number; dp: number; tau: number }
export interface Thermal { h: number; UA: number; dTb: number; Tbm: number; dTc: number; dTk: number; Tw: number; Tcase: number }
export interface Entropy { Sv: number; St: number; S: number; Be: number; W: number }
export interface Screening {
  tree: { dp: number; dpFd: number; th: Thermal; s: Entropy; gens: GenResult[] };
  base: { dp: number; Re: number; th: Thermal; s: Entropy };
}

export function screening(Q: number, Vlpm: number, Tin: number): Screening {
  const wt = GEOM.water, cu = GEOM.copper, d = GEOM.design;
  const mu = wt.mu, rho = wt.rho, cp = wt.cp, kf = wt.k;
  const V = Vlpm / 60000;

  let dpTree = 0, dpTreeFd = 0;
  const gens: GenResult[] = [];
  for (const r of GEOM.rows) {
    const A = r.A_mm2 * 1e-6, Dh = r.Dh_mm * 1e-3, L = r.L_mm * 1e-3;
    const v = V / r.n / A, Re = (rho * v * Dh) / mu;
    const dpfd = (r.fRe * mu * L * v) / (2 * Dh * Dh);
    const xp = r.L_mm / (r.Dh_mm * Re);
    const fapp = Math.sqrt(Math.pow(3.44 / Math.sqrt(xp), 2) + r.fRe * r.fRe);
    const dpa = (dpfd * fapp) / r.fRe;
    dpTree += dpa;
    dpTreeFd += dpfd;
    gens.push({ gen: r.gen, n: r.n, v, Re, dp: dpa, tau: ((fapp / Re) * rho * v * v) / 8 });
  }

  const b = GEOM.base, Ab = b.A_mm2 * 1e-6, Dhb = b.Dh_mm * 1e-3, Lb = b.span * 1e-3;
  const vb = V / b.n / Ab, Reb = (rho * vb * Dhb) / mu;
  const dpbfd = (b.fRe * mu * Lb * vb) / (2 * Dhb * Dhb);
  const xpb = b.span / (b.Dh_mm * Reb);
  const fappb = Math.sqrt(Math.pow(3.44 / Math.sqrt(xpb), 2) + b.fRe * b.fRe);
  const dpBase = (dpbfd * fappb) / b.fRe;

  const therm = (area_mm2: number): Thermal => {
    const h = (4.5 * kf) / 0.9e-3, UA = h * area_mm2 * 1e-6;
    const dTb = Q / (rho * V * cp), Tbm = Tin + dTb / 2, dTc = Q / UA;
    const dTk = (Q * (d.base_mm * 1e-3)) / (cu.k * Math.pow(d.footprint_mm * 1e-3, 2));
    return { h, UA, dTb, Tbm, dTc, dTk, Tw: Tbm + dTc, Tcase: Tbm + dTc + dTk };
  };
  const entropy = (dp: number, t: Thermal): Entropy => {
    const Tf = t.Tbm + 273.15, Tw = t.Tw + 273.15;
    const Sv = (V * dp) / Tf, St = (Q * (Tw - Tf)) / (Tw * Tf);
    return { Sv, St, S: Sv + St, Be: St / (St + Sv), W: V * dp };
  };

  const tT = therm(GEOM.tree_area_mm2), tB = therm(b.area_mm2);
  return {
    tree: { dp: dpTree, dpFd: dpTreeFd, th: tT, s: entropy(dpTree, tT), gens },
    base: { dp: dpBase, Re: Reb, th: tB, s: entropy(dpBase, tB) },
  };
}

/** Mean channel speed in the parallel plate [m/s]. */
export const parallelSpeed = (Vlpm: number) => Vlpm / 60000 / GEOM.base.n / (GEOM.base.A_mm2 * 1e-6);

/** Generation index (0-based) of each tree segment, from the per-generation counts. */
export const segmentGenerations = (): number[] => {
  const cum: number[] = [];
  let c = 0;
  for (const r of GEOM.rows) { c += r.n; cum.push(c); }
  return GEOM.tree.map((_, i) => cum.findIndex((x) => i < x));
};
