/**
 * Inviscid, incompressible potential flow past a sphere of radius `a` in a uniform
 * stream U∞ = 1 along +x. Velocity potential: φ = x (1 + a³ / 2r³).
 *
 *   u = ∇φ = (1 + a³/2r³) x̂ − (3a³ x / 2r⁵) r⃗
 *
 * Surface speed peaks at 1.5 U∞ on the equator (θ = 90°), so the surface pressure
 * coefficient Cp = 1 − (|u|/U∞)² runs from +1 at the stagnation points to −1.25.
 * Shared by the WebGL hero and the build-time SVG fallback.
 */
export function sphereVelocity(x: number, y: number, z: number, a = 1): [number, number, number] {
  const r2 = x * x + y * y + z * z;
  const r = Math.sqrt(r2);
  const a3 = a * a * a;
  const r3 = r2 * r;
  const r5 = r3 * r2;
  const k = (3 * a3 * x) / (2 * r5);
  return [1 + a3 / (2 * r3) - k * x, -k * y, -k * z];
}

export const pressureCoefficient = (u: [number, number, number]) => 1 - (u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);

/** Surface Cp on the sphere at polar angle θ from the upstream axis. */
export const surfaceCp = (theta: number) => 1 - 2.25 * Math.sin(theta) ** 2;

/**
 * Streamlines in the meridian plane (x, ρ), integrated with RK4 on unit-speed arcs.
 * Returns polylines in flow units; used to draw the static poster at build time.
 */
export function meridianStreamlines(seeds: number[], opts: { x0?: number; x1?: number; ds?: number; a?: number } = {}) {
  const { x0 = -5.5, x1 = 5.5, ds = 0.05, a = 1 } = opts;
  const dir = (x: number, p: number): [number, number] => {
    const u = sphereVelocity(x, p, 0, a);
    const m = Math.hypot(u[0], u[1]) || 1;
    return [u[0] / m, u[1] / m];
  };
  return seeds.map((rho) => {
    const pts: Array<[number, number]> = [[x0, rho]];
    let x = x0;
    let p = rho;
    for (let i = 0; i < 2000 && x < x1; i++) {
      const k1 = dir(x, p);
      const k2 = dir(x + (ds / 2) * k1[0], p + (ds / 2) * k1[1]);
      const k3 = dir(x + (ds / 2) * k2[0], p + (ds / 2) * k2[1]);
      const k4 = dir(x + ds * k3[0], p + ds * k3[1]);
      x += (ds / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      p += (ds / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      if (i % 2 === 0) pts.push([x, p]);
    }
    return pts;
  });
}
