# Sai Bhuvanesh Nandipati: CFD portfolio

Source code for a static, deployable portfolio website. It covers three CFD case studies, an M.S. thesis and four coauthored papers, plus an interactive flow field.

- **Framework:** [Astro 7](https://astro.build) (static output, one HTML file per route)
- **Interactivity:** framework-free TypeScript custom elements, plus [Three.js](https://threejs.org) for the hero
- **Hosting:** any static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages)
- **Node:** 20.19 or newer (22 recommended; see `.nvmrc`)

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321 with hot reload
npm run build      # production build into ./dist
npm run preview    # serve ./dist locally
npm test           # end-to-end checks against ./dist (run build first)
npm run check      # TypeScript and Astro diagnostics
```

## Routes

| Route | Content |
|---|---|
| `/` | Hero with the live flow field, project index, verification ledger, research teaser, about, contact form |
| `/work/branching-cold-plate/` | Case study 01: conjugate heat transfer, leaf-vein vs. parallel cold plate |
| `/work/f1-tyre-road/` | Case study 02: near-wall mesh, contact patch, rotating wheels, grid convergence |
| `/work/orion-capsule/` | Case study 03: Mach 2 / Mach 6 capsule, shock position, stagnation-pressure check |
| `/research/` | Thesis, interactive caster map, publication list with author lists |
| `/404` | Not-found page |
| `/robots.txt`, `/sitemap-index.xml` | Generated at build time |

## Project structure

```
src/
  data/            All content and numbers. Edit these first.
    site.ts        Name, email, LinkedIn, nav, practice areas, contact endpoint
    projects.ts    Project index: titles, headline metrics, status, evidence
    coldplate.ts   Cold-plate geometry, solver, 8 gates, results, claims, limits
    f1.ts          F1 setups, configurations, forces, speed sweep, grid study, checks
    orion.ts       Orion freestream, mesh, shock positions, Cp table
    research.ts    Thesis record and papers (titles, venues, dates, authors, DOIs)
  pages/           One file per route (case studies compose components with data)
  components/      Reusable building blocks
    FlowHero.astro       Hero, build-time SVG poster and HUD; boots the WebGL scene
    ProjectIndex.astro   Project rows with signature glyphs (glyphs/)
    Chapter*.astro       Case-study chapters and the sticky chapter rail
    CompareSlider.astro  Before/after slider (keyboard accessible)
    StateSwitch.astro    Toggle group that shows/hides [data-when] panels
    PitotCheck.astro     Interactive Rayleigh pitot / normal-shock calculator
    CasterMap.astro      Interactive slab-caster schematic linked to papers
    charts/              BarRows, Columns (HTML) and LinePlot (SVG), drawn to scale at build time
    ContactForm.astro    Validated form with AJAX delivery and email fallback
  lib/             Engineering maths shared by build and browser
    flow.ts        Potential flow past a sphere, meridian streamlines
    gas.ts         Rayleigh pitot, normal shock, stagnation temperature
    colormap.ts    Cool-warm and Blues colormaps matching the project figures
    scale.ts       Linear scales, ticks, number formatting
  scripts/         Browser scripts (flow-scene.ts is the Three.js scene; reveal.ts)
  styles/global.css  Design tokens and base styles
  assets/img/      Source figures (optimised to WebP/srcset at build)
public/
  reports/         Original project PDFs, linked from each case study
  og.png           Social preview image (regenerate with scripts/og-image.mjs)
  _headers         Cache and security headers (Netlify, Cloudflare Pages)
scripts/
  test-site.mjs    Playwright + axe end-to-end checks; writes logs/
  og-image.mjs     Renders public/og.png from the built home page
logs/              Test log, JSON report, screenshots, Lighthouse reports
```

## Editing content

- **Change a number or sentence:** edit the matching file in `src/data/`. Every page, chart and the structured data read from there.
- **Add a figure:** put the PNG/JPG in `src/assets/img/`, import it in the page and render it with `<Figure src={img} alt="…" caption="…" />`. Astro generates responsive WebP sizes automatically.
- **Add a project:** add an entry to `src/data/projects.ts`, create `src/pages/work/<slug>.astro` from an existing case study, and add a glyph in `ProjectIndex.astro` if you want one.
- **Add a paper:** append to `papers` in `src/data/research.ts`. The `zones` field places it on the caster map.

Every value on the site is traceable to `public/reports/*.pdf`, the previous site, or the DOI records. Two things are added computations, and both are labelled as such on the page: the analytic flow field in the hero, and the Rayleigh pitot check on the Orion page.

## Contact form

The form posts to FormSubmit's AJAX endpoint, the same service the previous site used:

1. Deploy the site, then send one test message from the live URL.
2. FormSubmit emails an activation link to nandipatibhuvan@gmail.com the first time a new site uses it. Click it, and later messages are delivered.
3. To use another service (Formspree, Netlify Forms, Basin), set `PUBLIC_CONTACT_ENDPOINT` at build time. The script expects a JSON response with `success: true`, or HTTP 2xx for services that return other JSON.

If delivery fails, the form tells the visitor to use the email address shown beside it, which also has an "Open email app" button and a "Copy address" button. With JavaScript off, the form posts normally to FormSubmit.

## Deployment

Build command `npm run build`, output directory `dist`. Set `SITE_URL` to your final domain (for example `https://bhuvanesh.dev`) so canonical links, Open Graph URLs and the sitemap use it. Without it the build falls back to the URL the host provides.

### Cloudflare Pages
1. Push this folder to a GitHub repository.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → choose the repo.
3. Framework preset **Astro**, build command `npm run build`, output `dist`.
4. Environment variables: `SITE_URL` = your domain (optional), `NODE_VERSION` = `22`.
5. Deploy. `public/_headers` is applied automatically.

No Git? Run `npm run build` and drag the `dist` folder into Pages → **Upload assets**.

### Netlify
`netlify.toml` is included. Netlify → Add new site → Import from Git → pick the repo → Deploy. Or drag `dist` onto https://app.netlify.com/drop.

### Vercel
`vercel.json` is included. Vercel → Add New → Project → import the repo → Deploy. The framework is detected as Astro.

### Custom domain
Add the domain in the host's dashboard, follow its DNS instructions, then set `SITE_URL` to it and redeploy.

## Quality checks (latest run)

`npm test` serves `dist/` and runs every page at 390, 820, 1366 and 1920 px. It checks:
- HTTP status
- horizontal overflow
- broken images
- console errors
- one `h1` per page
- content stuck hidden by scroll reveal
- axe WCAG 2.1 AA rules
- every internal link
- the interactive parts: state switch, keyboard slider, pitot calculator, caster map, hero probe, form validation and reduced-motion rendering

Results go to `logs/test.log` and `logs/test-report.json`, with screenshots in `logs/screens/`.

Lighthouse (`logs/lighthouse-summary.txt`):

| Page | Mobile perf | Desktop perf | A11y | Best practices | SEO |
|---|---|---|---|---|---|
| Home | 98 | 100 | 100 | 100 | 100 |
| Cold plate | 94 | 100 | 100 | 100 | 100 |
| F1 | 96 | 100 | 100 | 100 | 100 |
| Orion | 96 | 100 | 100 | 100 | 100 |
| Research | 98 | 100 | 100 | 100 | 100 |

Every page measured 0 ms Total Blocking Time and CLS 0.

## Performance notes

- Case-study and research pages ship no JavaScript files. Their small enhancement scripts are inlined, and every chart is static HTML/SVG.
- The hero loads Three.js (about 133 KB gzipped) only after the first pointer, key, scroll or touch event. Until then it shows a build-time SVG of the same flow.
- The scene pauses when off screen or when the tab is hidden. It caps the pixel ratio at 1.75, uses fewer particles on small screens, and renders a single still frame under `prefers-reduced-motion`.
- CSS is inlined per page. The four fonts the hero needs are self-hosted and preloaded.

## Browser support

Current Chrome, Edge, Firefox and Safari (desktop and mobile). Without WebGL, the hero keeps its static poster. Without JavaScript, every page still reads in full: charts are static, the before/after slider shows both images stacked, and the form posts normally.
