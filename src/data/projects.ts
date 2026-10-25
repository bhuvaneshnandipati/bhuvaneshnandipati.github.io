/**
 * Project index. Values come from the project presentations and reports in
 * /public/reports. Detailed figures live in each case-study page.
 */
export interface Project {
  slug: string;
  index: string;
  title: string;
  discipline: string;
  context: string;
  year?: string;
  tools: string[];
  standfirst: string;
  headline: { value: string; unit?: string; label: string };
  status: string;
  evidence: { label: string; value: string; note: string };
  description: string;
}

export const projects: Project[] = [
  {
    slug: 'branching-cold-plate',
    index: '01',
    title: 'Branching cold-plate cooling',
    discipline: 'Thermal management · Conjugate heat transfer',
    context: 'Independent project · Data-center cooling',
    year: '2026',
    tools: ['OpenFOAM v2512', 'chtMultiRegionSimpleFoam'],
    standfirst:
      'A leaf-vein channel tree, laid out by a generalised Murray’s law, against 30 straight channels. Same copper, same water, same wetted area, one 700 W accelerator.',
    headline: { value: '−7.1', unit: 'K', label: 'peak case temperature, tree vs. parallel' },
    status: 'Coarse grid · refinement pending',
    evidence: {
      label: 'Conservation checks',
      value: '8 / 8',
      note: 'Mass, energy, flow rate, mesh quality and entropy closure passed on both plates before any number was used.',
    },
    description:
      'Conjugate heat-transfer CFD comparing a Murray-law branching cold plate with a 30-channel baseline for a 700 W accelerator: 7.1 K lower peak case temperature and 57% lower plenum pressure drop on a coarse grid.',
  },
  {
    slug: 'f1-tyre-road',
    index: '02',
    title: 'F1 tyre–road interaction',
    discipline: 'External aerodynamics · Ground effect',
    context: 'Independent project · Generic 2026 F1 model',
    year: '2026',
    tools: ['OpenFOAM v2512', 'simpleFoam', 'k-ω SST', 'snappyHexMesh'],
    standfirst:
      'A 41% downforce swing traced to a 20 mm gap under the rear tyres, then 14 runs to model the contact patch, spin the wheels and prove which numbers survive mesh refinement.',
    headline: { value: '0.694', label: 'drag coefficient, ±0.8% grid uncertainty' },
    status: 'Drag grid-independent · downforce a trend',
    evidence: {
      label: 'Grid convergence',
      value: '±0.8%',
      note: 'Drag on three grids by the GCI method. Downforce zigzags between grids, so it is reported as ±35%, not hidden.',
    },
    description:
      'OpenFOAM study of tyre–road contact and wheel rotation on a generic 2026 F1 model: contact patches, rotating wheels, three speeds, an open-road domain and a three-grid convergence study.',
  },
  {
    slug: 'orion-capsule',
    index: '03',
    title: 'Orion capsule aerodynamics',
    discipline: 'Compressible flow · Re-entry',
    context: 'Team course project · Gas Dynamics, BITS Pilani',
    tools: ['ANSYS Fluent', 'ANSYS Meshing', 'SpaceClaim'],
    standfirst:
      'An axisymmetric Orion-like capsule at Mach 2 and Mach 6: where the bow shock stands, how the surface pressure falls away, and what changes when the flow turns hypersonic.',
    headline: { value: 'M 2 → 6', label: 'supersonic and hypersonic cases, 0° angle of attack' },
    status: 'Qualitative validation',
    evidence: {
      label: 'Stagnation check',
      value: '0.02%',
      note: 'Simulated stagnation-point Cp at Mach 2 against the Rayleigh pitot relation, computed for this site. Mach 6 sits 1.8% above it.',
    },
    description:
      'ANSYS Fluent study of supersonic (Mach 2) and hypersonic (Mach 6) flow over an axisymmetric Orion-like re-entry capsule: bow-shock position, surface pressure coefficient and the shock layer.',
  },
];

export const projectBySlug = (slug: string) => {
  const p = projects.find((x) => x.slug === slug);
  if (!p) throw new Error(`Unknown project: ${slug}`);
  return p;
};
