/** Orion report data (BITS Pilani Gas Dynamics course project). */

/** Bow-shock locations read from Mach-number traces along y = 0, 1, 2.6 and 4 m. */
export const shockPoints: { mach2: [number, number][]; mach6: [number, number][] } = {
  mach2: [[-1.75, 0], [-1.8, 1], [-1.45, 2.6], [-1, 4]],
  mach6: [[-1.25, 0], [-1.25, 1], [-0.8, 2.6], [0.1, 4]],
};

/** Table 3: surface pressure coefficient at reference points along the body (L = 3.302 m). */
export const cpTable = [
  { point: 'Tip', x: 0, xl: 0, m2: 1.657, m6: 1.85 },
  { point: '1', x: 0.481, xl: 0.146, m2: 0.8209, m6: 1.39 },
  { point: '2', x: 0.713, xl: 0.216, m2: -0.2541, m6: 0.1602 },
  { point: '3', x: 0.848, xl: 0.257, m2: -0.3294, m6: 0.0199 },
  { point: '4', x: 3.278, xl: 0.993, m2: -0.2056, m6: -0.0318 },
  { point: '5', x: 3.302, xl: 1, m2: -0.0662, m6: -0.0269 },
];

export const freestream = {
  mach2: { M: 2, p: 2891, T: 219 },
  mach6: { M: 6, p: 1064, T: 234 },
};

export const mesh = { elements: 42956, nodes: 43481, minEdge: 0.00509, bodySizing: 0.004, edgeSizing: 0.002 };
