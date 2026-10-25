/**
 * Thesis and publications. Titles, venues, dates and author lists come from the
 * DOI records (Crossref; DataCite for the thesis).
 */
export const thesis = {
  title: 'Computational Analysis of Fluid Flow and Chemical Segregation Phenomena in Continuous Casting',
  degree: 'Master of Science in Mechanical Engineering',
  institution: 'Purdue University Northwest',
  year: '2025',
  doi: '10.25394/PGS.28953131',
  url: 'https://doi.org/10.25394/PGS.28953131',
  question: 'How do fluid motion, solidification and carbon transport interact while steel solidifies in a continuous caster?',
  methods: [
    { term: 'Solidification', detail: 'Enthalpy–porosity method, tracking the mushy zone and shell growth under realistic thermal and flow boundary conditions.' },
    { term: 'Carbon segregation', detail: 'Solute partitioning and mass-transport equations for carbon redistribution during solidification.' },
    { term: 'Argon injection', detail: 'Two-phase Euler–Lagrange model of gas bubbles in the mold, studied for bubble size and distribution.' },
    { term: 'Parametric studies', detail: 'Three steel grades, superheat, casting speed, and thin-slab mold width.' },
  ],
  findings:
    'The work examines how steel composition affects segregation severity, how mold width and casting speed shape jet impingement and recirculation, and how argon bubbles interact with mold flow. It closes with guidance on casting conditions that reduce centerline segregation, improve flow uniformity and minimize surface defects.',
};

export interface Paper {
  year: string;
  date: string;
  type: string;
  venue: string;
  title: string;
  authors: string[];
  doi: string;
  summary: string;
  /** Which part of the caster the paper studies; drives the caster map. */
  zones: Array<'mold' | 'sprays' | 'strand' | 'whole'>;
}

export const papers: Paper[] = [
  {
    year: '2025',
    date: '2025-10-04',
    type: 'Journal article',
    venue: 'Metals (MDPI)',
    title: 'Impacts of Cooling Reduction Due to Spray Nozzle Clogging on Shell Formation in Continuous Casting of Steel',
    authors: ['Dianzhi Meng', 'Sai Bhuvanesh Nandipati', 'Armin K. Silaen', 'Yufeng Wang', 'Sunday Abraham', 'Dallas Brown', 'Chenn Zhou'],
    doi: '10.3390/met15101107',
    summary: 'How impaired spray cooling from clogged nozzles changes shell formation in a steel caster.',
    zones: ['sprays', 'strand'],
  },
  {
    year: '2025',
    date: '2025',
    type: 'Proceedings chapter',
    venue: 'TMS · The Minerals, Metals & Materials Series',
    title: 'Development and Validation of Optimization Tool for Continuous Caster Operations Based on CFD Simulations',
    authors: ['Sai Bhuvanesh Nandipati', 'Kyle Toth', 'Armin K. Silaen', 'Yufeng Wang', 'Sunday Abraham', 'Dallas Brown', 'Chenn Q. Zhou'],
    doi: '10.1007/978-3-031-80748-0_144',
    summary: 'A multiphase CFD-based tool that predicts temperature and solidification across defined casting conditions and steel compositions.',
    zones: ['whole'],
  },
  {
    year: '2024',
    date: '2024-11-17',
    type: 'Conference paper',
    venue: 'ASME IMECE 2024 · Heat Transfer and Thermal Engineering',
    title: 'Investigating the Effects of Spray Nozzle Clogging in Continuous Casting of Steel',
    authors: ['Dianzhi Meng', 'Sai Bhuvanesh Nandipati', 'Armin Silaen', 'Chenn Zhou'],
    doi: '10.1115/IMECE2024-145700',
    summary: 'Three-dimensional modeling of spray-cooling performance in a full-scale continuous caster.',
    zones: ['sprays'],
  },
  {
    year: '2024',
    date: '2024-10-06',
    type: 'Conference paper',
    venue: 'AIST Steel Properties & Applications Conference (MS&T)',
    title: 'Impact of Steel Composition on Macrosegregation of Carbon in Continuous Casting',
    authors: ['Sai Bhuvanesh Nandipati', 'Armin K. Silaen', 'Yufeng Wang', 'Dallas Brown', 'Sunday Abraham', 'Chenn Q. Zhou'],
    doi: '10.33313/282/002',
    summary: 'How different steel compositions change carbon redistribution as the strand solidifies.',
    zones: ['strand'],
  },
];
