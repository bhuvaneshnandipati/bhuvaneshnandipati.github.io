# Design notes

## 1. Review of the previous site

The previous site (a single page on a ChatGPT-hosted subdomain) had good raw material but presented it like a template.

| Issue | Why it read as ordinary or generated |
|---|---|
| Warm beige, near-black text, orange accent, Georgia italic for emphasis | One of the most common generated palettes; nothing tied it to CFD |
| Hero: large headline, one sentence, round "Explore the work" button | A stock landing-page pattern with no engineering content above the fold |
| Three equal project cards with a pill tag and an "Explore the study" link | Interchangeable card grid; the strongest numbers were hidden in modals |
| Case-study content only in pop-up dialogs | Hard to scan, not linkable, not indexable, poor on mobile |
| Numbered labels ("01 / THE COLLECTION") on every section | Decorative numbering that encoded nothing |
| CSS-drawn decorations (stacked "paper" sheets, overlapping circles) | Ornament in place of the real figures the projects already had |
| Sixteen PDF pages of slides and a 22-page report linked but unused | The most persuasive material, including per-configuration forces, gate checks and setup tables, never reached the page |
| Generic copy ("Have a project in mind… engineering opportunity?") | Interchangeable with any portfolio; job-search tone |

## 2. Direction: a drawing set

The site reads as a set of engineering drawings rather than a marketing page.

- **Sheets:** each page is a numbered sheet ("Sheet 03/05") in a title strip, like a drawing set.
- **Title blocks:** each case study opens with a drafting-style table giving project, year, tools, status, headline result and source documents.
- **Test-section windows:** live and simulated flow sit in dark frames, the way a viewing window sits in a light tunnel hall.
- **Single ink colour:** cobalt marks interaction and emphasis. All other colour belongs to the data, using the same cool-warm (pressure) and Blues (speed) maps as the original simulation figures, so the page and the figures agree.
- **Type:** Archivo at condensed widths for display (engineered, compact, loud), Source Serif 4 for reading (journal-paper texture), JetBrains Mono for labels, units and data.
- **Structure means something:** chapter numbers follow the real sequence (Problem → Method → Simulation → Results → Insight). Index numbers follow project order. Verdict tags (Holds, Breaks, Near limit) encode results.
- **Uncertainty is a feature:** a "Verification" ledger on the home page and a "What this run doesn't prove yet" sheet at the end of each study put error bars and limits up front. That honesty is the strongest signal of engineering judgement.

## 3. Interactions and the concept each one explains

| Interaction | Where | Engineering idea |
|---|---|---|
| Live flow field with probe | Home hero | Potential flow past a sphere: speed peaks at 1.5 U∞; Cp = 1 − (u/U∞)². The probe draws the streamline through the cursor and reports u/U∞ and Cp. The caption says why real flow needs CFD. |
| Plate switch | Cold plate · Method | Same volume and wetted area, different topology |
| Eight acceptance gates | Cold plate · Simulation | A run only counts once conservation and mesh checks pass |
| Results bars and claims table | Cold plate · Results/Insight | What a 1-D model predicts against what CFD shows, and why |
| Mesh A/B switch | F1 · Problem | One prism layer moves downforce 41% and fixes y+ |
| Tyre-model switch with linked force charts | F1 · Method | Gap vs. contact patch vs. rotating wheel, with the forces that follow |
| Before/after slider | F1 · Results | Wakes grow when the tyre is sealed and spinning |
| Grid-convergence plots | F1 · Insight | Drag converges (GCI ±0.8%); downforce zigzags (±35%) |
| Field switch and shock-position plot | Orion · Results | Bow-shock standoff shrinks from Mach 2 to Mach 6 |
| Rayleigh pitot calculator | Orion · Insight | Stagnation Cp from theory against the simulation: 0.02% at Mach 2 |
| Caster map | Research | Where in the machine each paper and the thesis apply |

## 4. What was deliberately left out

- **Smooth-scroll hijacking, custom cursors, page-transition curtains:** they slow reading and break accessibility.
- **Glassmorphism, gradient blobs, glow:** none of them communicates anything about flow.
- **A WebGL scene on every page:** one honest, well-performing simulation is stronger than decoration everywhere.
- **Resume links, availability and job-search wording:** excluded at the owner's request. This is a CFD portfolio.
