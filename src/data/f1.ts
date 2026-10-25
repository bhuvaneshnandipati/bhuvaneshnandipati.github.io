/**
 * F1 tyre–road study on a generic 2026 F1 model, OpenFOAM v2512.
 * Sources: /reports/f1-study.pdf (Post 1: near-wall mesh study) and
 * /reports/f1-contact-study.pdf (Post 3: contact patch and rotating wheels).
 */

/** Post 1: same case, two near-wall meshes. Mean of iterations 700–1000. */
export const meshStudy = {
  setup: [
    { k: 'Geometry', v: 'Generic 2026 F1 STL, repaired (424 self-intersections)' },
    { k: 'Solver', v: 'OpenFOAM v2512, simpleFoam (steady RANS)' },
    { k: 'Turbulence', v: 'k-ω SST with wall functions' },
    { k: 'Flow', v: '20 m/s inlet, moving ground at 20 m/s' },
    { k: 'Wheels', v: 'Static (no-slip), 20 mm gap to the road' },
    { k: 'Domain', v: '20 × 8 × 6 m, symmetry top and sides, 2.8% blockage' },
    { k: 'Mesh A', v: 'snappyHexMesh, no prism layers' },
    { k: 'Mesh B', v: 'Same base mesh + 1 prism layer, 88% coverage' },
    { k: 'Reference area', v: '1.327 m², frontal area from the STL' },
  ],
  coeffs: { A: { cd: 0.634, cl: -0.74 }, B: { cd: 0.638, cl: -0.524 } },
  /** Share of the total change in Cl between meshes A and B, by region. */
  dClShare: [
    { label: 'Rear tyres, bottom 20 mm', v: 66 },
    { label: 'Rear tyres, rest', v: 30 },
    { label: 'Front tyres', v: 5 },
    { label: 'Floor, body, front wing', v: 4 },
    { label: 'Viscous (all surfaces)', v: 2 },
    { label: 'Rear wing', v: -6 },
  ],
  axle: { A: { front: 0.48, rear: 0.26 }, B: { front: 0.47, rear: 0.05 } },
  yplus: { A: '30.0% of faces above y+ 300, median y+ 231', B: '4.0% above y+ 300, 1.1% below 11, median y+ 98' },
  parallel: { serial: { cd: '0.6380 ± 0.0018', cl: '−0.5239 ± 0.0039' }, p8: { cd: '0.6387 ± 0.0016', cl: '−0.5250 ± 0.0043' } },
};

/** Post 3 setup. */
export const contactSetup = [
  { k: 'Contact patch', v: '120 mm block under each tyre, tread-wide, moving with the road' },
  { k: 'Rotating wheels', v: 'Tyre surface spins at road speed (rigid rotation)' },
  { k: 'Solver', v: 'simpleFoam, k-ω SST, Spalding wall function' },
  { k: 'Mesh', v: '3 prism layers on the car; grids of 0.80 / 1.43 / 2.67 M cells' },
  { k: 'Flow', v: '20, 50 and 80 m/s; 1% inlet turbulence' },
  { k: 'Domain', v: 'Standard 20 × 8 × 6 m (2.8% blockage) and an open-road domain (0.9%)' },
  { k: 'Averaging', v: 'Mean of iterations 2000–3000' },
  { k: 'Checks', v: 'Momentum balance at 5 wake planes, all 14 runs' },
];

/** Three ways to put a tyre on the road: 20 m/s, medium grid. */
export const configs = [
  { id: 'gap', label: 'Gap, static', short: 'Gap · static', drag: 221, downforce: 102, note: 'Tyres 20 mm above the moving road, wheels static. Air jets through the slot under each tyre.' },
  { id: 'patch', label: 'Contact patch, static', short: 'Patch · static', drag: 236, downforce: 72, note: 'Sealing the gap with static wheels: drag +6.8%, downforce −30%. The jet is gone and the backflow behind the tyre grows.' },
  { id: 'rot', label: 'Contact patch, rotating', short: 'Patch · rotating', drag: 226, downforce: 89, note: 'Spinning the wheels gives part of it back: drag −3.9%, downforce +25% against the static patch. Net against the gap model: drag +2.6%, downforce −13%.' },
] as const;

/** Change in pressure lift by region vs. the gap model (N). Positive = less downforce. */
export const regionDelta = [
  { label: 'Front wheels', patch: 20, rot: 15 },
  { label: 'Rear wheels', patch: 20, rot: 10 },
  { label: 'Front wing', patch: 11, rot: 6 },
  { label: 'Rear wing', patch: 7, rot: 7 },
  { label: 'Floor + diffuser', patch: -11, rot: -14 },
  { label: 'Body, sidepods, suspension', patch: -17, rot: -12 },
];

/** Wheel forces, contact-patch model, 20 m/s: static vs rotating (N). */
export const wheelForces = [
  { label: 'Front wheels, drag', static: 57.2, rot: 55.4 },
  { label: 'Front wheels, lift', static: 43.8, rot: 39.2 },
  { label: 'Rear wheels, drag', static: 63.9, rot: 55.4 },
  { label: 'Rear wheels, lift', static: 49.2, rot: 39.4 },
];

/** Realistic model (patch, rotating) across speeds. */
export const speeds = [
  { u: 20, cd: 0.696, mcl: 0.274 },
  { u: 50, cd: 0.697, mcl: 0.269 },
  { u: 80, cd: 0.689, mcl: 0.259 },
];

export const openRoad = [
  { u: 20, cdStd: 0.696, cdOpen: 0.674, mclStd: 0.274, mclOpen: 0.271 },
  { u: 50, cdStd: 0.697, cdOpen: 0.67, mclStd: 0.269, mclOpen: 0.265 },
];

/** Realistic model at 20 m/s on three grids. */
export const grid = [
  { cells: 0.8, drag: 226, downforce: 165, frontWing: -141, rearWing: -85 },
  { cells: 1.43, drag: 226, downforce: 89, frontWing: -118, rearWing: -57 },
  { cells: 2.67, drag: 226, downforce: 109, frontWing: -108, rearWing: -72 },
];

export const checks = [
  { q: 'Why is downforce 41% lower than in the earlier wake study?', a: 'A control run with that study’s wall function on the new mesh: 92% of the change comes from the new 3-layer near-wall mesh, 8% from the wall function, mostly on the tyres in the 20 mm gap and the front wing.' },
  { q: 'Does the contact-patch size matter?', a: '100 / 120 / 140 mm blocks: Cd 0.699 / 0.696 / 0.690, −Cl 0.282 / 0.274 / 0.281. Within the scatter.' },
  { q: 'Is the rotation set up right?', a: 'Every tyre face checked against rigid-body rotation before the run: worst error 0.27% of road speed.' },
  { q: 'Do the forces add up?', a: 'Body + wheels add up to the total on every run. Momentum balance at five wake planes matches the surface drag within ±1.4% (13 runs) and ±2.9% on the coarse grid.' },
  { q: 'Does parallel decomposition change the answer?', a: 'Mesh B run serial and 8-way (scotch): Cd 0.6380 ± 0.0018 vs 0.6387 ± 0.0016, Cl −0.5239 ± 0.0039 vs −0.5250 ± 0.0043. Both differences are well under one standard deviation.' },
  { q: 'Is a static wheel on a moving road real?', a: 'No. It is kept as a modelling step to separate the contact-patch effect from the rotation effect.' },
];
