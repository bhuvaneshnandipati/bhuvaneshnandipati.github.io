/**
 * Branching cold plate: coarse-grid conjugate CFD run of 9 October 2026.
 * Source: /reports/coldplate-study.pdf (project presentation).
 */
export const design = {
  plate: 'C110 copper, 60 × 60 × 5 mm',
  die: '40 × 40 mm heat source, 700 W',
  coolant: 'Water, 1.0 L/min, 40 °C inlet',
  fluidVolume: '2,084 mm³ (both plates)',
  wettedArea: '8,561 mm² (both plates)',
  match: 'Volume and wetted area matched within 0.03%',
};

export const plates = {
  tree: {
    name: 'Leaf-vein tree',
    layout: '4 → 128 channels over 6 generations, laid out by a generalised Murray’s law',
    channels: '3.42 mm wide at the trunk, 0.50 mm at the tips, 2.0 mm deep',
    ports: 'Inlet at the hub, four outlets on the ring',
    model: 'Quarter-symmetry model, 1.11 M cells (175 W of the 700 W)',
    screening: '99 Pa',
    velocity: '0.13 m/s in a terminal channel',
  },
  parallel: {
    name: 'Parallel channels',
    layout: '30 straight channels fed from end manifolds',
    channels: '0.643 mm wide, 2.0 mm deep',
    ports: 'End manifolds',
    model: 'Half-symmetry model, 2.42 M cells (350 W of the 700 W)',
    screening: '514 Pa',
    velocity: '0.43 m/s per channel',
  },
};

export const solver = [
  { k: 'Solver', v: 'OpenFOAM v2512, chtMultiRegionSimpleFoam' },
  { k: 'Physics', v: 'Steady, laminar conjugate heat transfer; copper and water solved together' },
  { k: 'Load', v: '700 W per full plate, 1.0 L/min water at 40 °C' },
  { k: 'Tree mesh', v: 'Quarter model, 1.11 M cells' },
  { k: 'Parallel mesh', v: 'Half model, 2.42 M cells' },
  { k: 'Material', v: 'C110 copper; constant properties' },
  { k: 'Not modelled', v: 'Contact resistance; turbulence at the ports' },
  { k: 'Screening', v: '1-D network model run before the CFD' },
];

/** Eight gates every run must pass before any number counts. All passed on both plates. */
export const gates = [
  { id: 'G1', name: 'Mesh quality', rule: 'non-orthogonality < 65°, no negative cells', tree: '64.96°', parallel: '45.41°' },
  { id: 'G2', name: 'Interface match', rule: 'fluid and solid faces agree exactly', tree: '198,212 faces', parallel: '355,474 faces' },
  { id: 'G3', name: 'Plenum zones', rule: 'both zones contain cells', tree: '1,368 + 2,472', parallel: '1,572 + 1,577' },
  { id: 'G4', name: 'Mass balance', rule: 'inlet = outlet within 0.1%', tree: '0.0000%', parallel: '0.0002%' },
  { id: 'G5', name: 'Flow rate', rule: 'matches the spec within 1%', tree: '0.000%', parallel: '0.000%' },
  { id: 'G6', name: 'Energy balance', rule: 'ṁ·cp·ΔT = heater power within 1%', tree: '0.008%', parallel: '0.073%' },
  { id: 'G7', name: 'Positive entropy', rule: 'no cell with S‴ < 0', tree: 'min 0', parallel: 'min 0' },
  { id: 'G8', name: 'Closure', rule: 'volume vs. boundary entropy within 15% (coarse grid)', tree: '−13.5%', parallel: '−7.9%' },
];

/** Results at 700 W, 1.0 L/min, 40 °C inlet. `better` = which plate wins on this row. */
export const results = [
  { q: 'Δp, plenum to plenum', tree: 696.2, parallel: 1630.2, unit: 'Pa', ratio: '2.34×', digits: 1, better: 'tree' },
  { q: 'Δp, port to port (lower bound, laminar ports)', tree: 1100.6, parallel: 5014.6, unit: 'Pa', ratio: '4.56×', digits: 1, better: 'tree' },
  { q: 'Peak case temperature', tree: 66.1, parallel: 73.21, unit: '°C', ratio: '−7.1 K', digits: 2, better: 'tree' },
  { q: 'Mean case temperature', tree: 63.89, parallel: 66.06, unit: '°C', ratio: '−2.2 K', digits: 2, better: 'tree' },
  { q: 'Coolant temperature rise', tree: 10.15, parallel: 10.14, unit: 'K', ratio: 'same', digits: 2, better: 'none' },
  { q: 'Entropy generation, whole plate', tree: 0.1064, parallel: 0.1255, unit: 'W/K', ratio: '1.18×', digits: 4, better: 'tree' },
] as const;

export const extraResults = [
  { q: 'Viscous entropy generation', tree: '1.22 × 10⁻⁵ W/K', parallel: '3.08 × 10⁻⁵ W/K', ratio: '2.52×' },
  { q: 'Bejan number', tree: '0.99989', parallel: '0.99976', ratio: '' },
  { q: 'Entropy closure, volume vs. boundary', tree: '−13.5%', parallel: '−7.9%', ratio: '' },
  { q: 'Steadiness, entropy band over last 100 samples', tree: '0.68%', parallel: '0.78%', ratio: '' },
  { q: 'Energy balance (heat in vs. heater)', tree: '175.0 / 175 W', parallel: '349.8 / 350 W', ratio: '' },
];

/** Claims stated before the run, answered by the coarse-grid CFD. */
export const claims = [
  { claim: 'Tree cuts channel Δp', screening: '5.18×', cfd: '2.34×', verdict: 'Holds at about half the screening ratio. Junction and plenum losses, which the 1-D model omits, take the rest. Port to port it is 4.56×.' },
  { claim: 'Case temperature at 700 W', screening: '< 72.4 °C', cfd: '66.1 / 73.2 °C peak', verdict: 'Means sit below the ceiling on both plates. The 7.1 K gap in the peaks is heat spreading that the 1-D model cannot see.' },
  { claim: 'Loss is almost all thermal (Bejan ≈ 1)', screening: '0.99997', cfd: '0.99989', verdict: 'Holds. Friction is about 0.01% of the loss; the plate’s loss is heat crossing a temperature difference.' },
  { claim: 'Wall shear even across generations', screening: '24.6% spread', cfd: '164% spread', verdict: 'Breaks. Developing flow puts high shear at every branch entry; the developing-flow estimate was 185%.' },
  { claim: 'Volume entropy equals boundary ledger', screening: '0.174 W/K', cfd: '−13.5% / −7.9%', verdict: 'Within the 15% coarse-grid limit. The tree sits close to it, so its entropy numbers carry that uncertainty until the grid study.' },
];

export const limits = [
  'It is one coarse mesh. The 7 °C gap has to survive a finer one.',
  'The tree’s entropy check closes at −13.5%, inside the 15% coarse-grid limit but close to it.',
  'Flow at the ports is near-turbulent, so the port-to-port pressure drop is a lower bound.',
  'Steady laminar flow, constant properties and no contact resistance.',
];

export const next = 'A grid study and a turbulence check at the ports, to see whether the 7 °C holds.';
