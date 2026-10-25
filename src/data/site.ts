/**
 * Identity and contact details. Every page reads from here, so a change made once
 * updates the header, footer, metadata and structured data together.
 */
export const site = {
  name: 'Sai Bhuvanesh Nandipati',
  shortName: 'S. B. Nandipati',
  descriptor: 'Mechanical engineer · CFD',
  tagline: 'Modeling flow. Solving thermal problems.',
  description:
    'CFD and thermal-fluid engineering portfolio of Sai Bhuvanesh Nandipati: OpenFOAM and ANSYS Fluent studies in race-car aerodynamics, data-center cold plates, re-entry capsule flow and continuous casting of steel.',
  email: 'nandipatibhuvan@gmail.com',
  linkedin: 'https://www.linkedin.com/in/nandipati-sai-bhuvanesh/',
  linkedinLabel: 'linkedin.com/in/nandipati-sai-bhuvanesh',
  /**
   * Web3Forms access key. When set, the form posts to Web3Forms instead of FormSubmit.
   * The key is designed to be public (it can only send mail to its owner's inbox).
   * Get one at https://web3forms.com, then paste it here or set PUBLIC_WEB3FORMS_KEY.
   */
  web3formsKey: import.meta.env.PUBLIC_WEB3FORMS_KEY || '',
  /**
   * Contact form endpoint. FormSubmit's AJAX endpoint is the one the previous site used,
   * used only when no Web3Forms key is set.
   * Override with PUBLIC_CONTACT_ENDPOINT (e.g. a Formspree or Netlify Forms URL).
   */
  contactEndpoint:
    import.meta.env.PUBLIC_CONTACT_ENDPOINT || 'https://formsubmit.co/ajax/nandipatibhuvan@gmail.com',
} as const;

export const nav = [
  { href: '/#work', label: 'Work', index: '01' },
  { href: '/research/', label: 'Research', index: '02' },
  { href: '/#about', label: 'About', index: '03' },
  { href: '/#contact', label: 'Contact', index: '04' },
] as const;

/** Areas of practice, in the owner's own words. */
export const practice = [
  'Computational fluid dynamics',
  'OpenFOAM simulation',
  'Formula 1 aerodynamics',
  'Biomimetic cooling-channel design for data centers',
  'Continuous casting and solidification modeling',
  'Thermal-fluid engineering',
  'Mechanical design and engineering automation',
] as const;

/** Tools named in the project sources. */
export const tools = ['OpenFOAM v2512', 'snappyHexMesh', 'ANSYS Fluent', 'ANSYS Meshing', 'SpaceClaim'] as const;
