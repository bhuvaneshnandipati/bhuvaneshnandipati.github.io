/**
 * End-to-end checks against the production build in /dist.
 *   npm run build && npm test
 * Writes logs/test.log, logs/test-report.json and screenshots to logs/screens/.
 * Exits non-zero when any check fails.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const ROOT = resolve('dist');
const LOGS = resolve('logs');
const SHOTS = join(LOGS, 'screens');
const PAGES = ['/', '/work/branching-cold-plate/', '/work/branching-cold-plate/explorer/', '/work/f1-tyre-road/', '/work/orion-capsule/', '/research/', '/does-not-exist/'];
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'laptop', width: 1366, height: 820 },
  { name: 'desktop', width: 1920, height: 1080 },
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };

const lines = [];
const log = (...a) => { const s = `[${new Date().toISOString()}] ${a.join(' ')}`; lines.push(s); console.log(s); };

async function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = join(ROOT, decodeURIComponent(url.pathname));
    try {
      const s = await stat(p).catch(() => null);
      if (s?.isDirectory()) p = join(p, 'index.html');
      else if (!s && !extname(p)) p = join(p, 'index.html');
      const body = await readFile(p);
      res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      const body = await readFile(join(ROOT, '404.html')).catch(() => Buffer.from('not found'));
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(body);
    }
  });
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

const { server, base } = await serve();
await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const report = { base, startedAt: new Date().toISOString(), pages: [], links: {}, failures: [] };
const fail = (msg) => { report.failures.push(msg); log('FAIL', msg); };
const internalLinks = new Set();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !(path === '/does-not-exist/' && /404/.test(m.text()))) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const t0 = Date.now();
    const resp = await page.goto(base + path, { waitUntil: 'load' });
    const loadMs = Date.now() - t0;
    // Scroll through to trigger lazy images and reveal transitions.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
      pendingReveal: document.querySelectorAll('.is-pending').length,
      heroLive: !!document.querySelector('flow-window.is-live'),
      title: document.title,
      h1: document.querySelectorAll('h1').length,
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    }));
    for (const href of info.links) if (href.startsWith('/') && !href.startsWith('//')) internalLinks.add(href.split('#')[0] || '/');
    const expected404 = path === '/does-not-exist/';
    if (!expected404 && resp.status() !== 200) fail(`${vp.name} ${path} status ${resp.status()}`);
    if (info.overflowX > 1) fail(`${vp.name} ${path} horizontal overflow ${info.overflowX}px`);
    if (info.brokenImages.length) fail(`${vp.name} ${path} broken images ${info.brokenImages.join(', ')}`);
    if (errors.length) fail(`${vp.name} ${path} console errors: ${errors.join(' | ')}`);
    if (info.h1 !== 1) fail(`${vp.name} ${path} has ${info.h1} h1 elements`);
    if (info.pendingReveal) fail(`${vp.name} ${path} ${info.pendingReveal} elements still hidden by reveal after scroll`);
    if (path === '/' && !info.heroLive) log('WARN', `${vp.name} hero WebGL scene not live (static poster shown)`);

    let axe = { violations: [] };
    if (vp.name === 'laptop' || vp.name === 'phone') {
      axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      for (const v of axe.violations) {
        const msg = `${vp.name} ${path} axe ${v.impact} ${v.id}: ${v.help} (${v.nodes.length} nodes) e.g. ${v.nodes[0]?.target?.join(' ')}`;
        if (v.impact === 'serious' || v.impact === 'critical') fail(msg); else log('WARN', msg);
      }
    }
    const shot = join(SHOTS, `${vp.name}${path.replace(/\//g, '_') || '_'}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    report.pages.push({ viewport: vp.name, path, status: resp.status(), loadMs, ...info, links: undefined, consoleErrors: errors, axeViolations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) });
    log('OK  ', vp.name.padEnd(7), path.padEnd(30), `status=${resp.status()} load=${loadMs}ms overflow=${info.overflowX} hero=${info.heroLive} axe=${axe.violations.length}`);
    await page.close();
  }
  await ctx.close();
}

// Link check: every internal href found must resolve to a 200 in the build.
for (const href of internalLinks) {
  const r = await fetch(base + href);
  report.links[href] = r.status;
  if (r.status !== 200) fail(`broken internal link ${href} -> ${r.status}`);
}
log('Checked', internalLinks.size, 'internal links');

// Interaction checks on desktop.
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 } });
  const page = await ctx.newPage();
  await page.goto(base + '/work/f1-tyre-road/');
  await page.click('state-switch button[data-id="rot"]');
  const shown = await page.evaluate(() => [...document.querySelectorAll('[data-when]')].filter((e) => !e.hidden && e.closest('state-switch[data-state="rot"]')).length);
  if (shown < 1) fail('StateSwitch did not show the rotating-wheel panel'); else log('OK   state switch shows', shown, 'panel(s) for "rot"');
  const range = page.locator('#topdown-range');
  await range.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  const pos = await page.evaluate(() => getComputedStyle(document.querySelector('compare-slider')).getPropertyValue('--pos'));
  if (pos.trim() !== '60%') fail(`compare slider keyboard: expected 60%, got ${pos}`); else log('OK   compare slider responds to keyboard (--pos 60%)');

  await page.goto(base + '/work/branching-cold-plate/explorer/');
  const dp0 = (await page.textContent('#dpTreeBig'))?.trim();
  const dpB0 = (await page.textContent('#dpBaseBig'))?.trim();
  if (!dp0?.startsWith('99') || !dpB0?.startsWith('514')) fail(`explorer design point: expected 99 / 514 Pa, got ${dp0} / ${dpB0}`); else log('OK   explorer reproduces the 1-D design point (99 / 514 Pa)');
  await page.fill('#q', '1100'); await page.dispatchEvent('#q', 'input');
  const q = (await page.textContent('#qo'))?.trim();
  const ladder = await page.evaluate(() => document.querySelectorAll('#ladder .rung').length);
  if (q !== '1,100 W' || ladder !== 5) fail(`explorer slider: got ${q}, ladder rows ${ladder}`); else log('OK   explorer slider updates readouts (1,100 W, 5 ladder rows)');
  const drawn = await page.evaluate(() => { const c = document.querySelector('#cvTree'); const d = c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data; return d[3] > 0; });
  if (!drawn) fail('explorer canvas not drawn'); else log('OK   explorer canvas drawn');

  await page.goto(base + '/work/orion-capsule/');
  await page.fill('#pc-mach', '2');
  await page.dispatchEvent('#pc-mach', 'input');
  const cp = await page.textContent('[data-o="cp"]');
  if (cp?.trim() !== '1.657') fail(`pitot check at M=2: expected 1.657, got ${cp}`); else log('OK   pitot check computes Cp,max(2) = 1.657');

  await page.goto(base + '/research/');
  await page.click('.cm__pick >> nth=1');
  const on = await page.evaluate(() => document.querySelectorAll('.cm__zone.is-on').length);
  if (on < 1) fail('caster map did not highlight a zone'); else log('OK   caster map highlights', on, 'zone(s)');

  await page.goto(base + '/');
  await page.mouse.move(200, 200); // the hero boots on the first interaction
  await page.waitForTimeout(2500);
  const live = await page.evaluate(() => !!document.querySelector('flow-window.is-live'));
  if (!live) log('WARN', 'hero WebGL scene did not start after interaction (static poster kept)');
  if (live) {
    const box = await page.locator('flow-window canvas').boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.waitForTimeout(300);
    const probe = await page.textContent('.probe [data-k="cp"]');
    if (!probe || probe.trim() === '—') log('WARN', 'hero probe did not report a value at the test point'); else log('OK   hero probe reports Cp =', probe.trim());
  }
  await page.click('#cf-name');
  await page.click('button[type="submit"]');
  const invalid = await page.evaluate(() => document.activeElement?.id);
  if (invalid !== 'cf-name') fail(`contact form: focus should move to the first invalid field, got ${invalid}`); else log('OK   contact form validation focuses the first invalid field');
  await ctx.close();
}

// Reduced motion: the page must still render with the hero poster or a static frame.
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + '/');
  await page.waitForTimeout(1500);
  if (errs.length) fail('reduced-motion errors: ' + errs.join(' | ')); else log('OK   reduced-motion render without errors');
  await page.screenshot({ path: join(SHOTS, 'laptop_reduced-motion_home.png') });
  await ctx.close();
}

await browser.close();
server.close();
report.finishedAt = new Date().toISOString();
await writeFile(join(LOGS, 'test-report.json'), JSON.stringify(report, null, 2));
log(report.failures.length ? `DONE with ${report.failures.length} failure(s)` : 'DONE, all checks passed');
await writeFile(join(LOGS, 'test.log'), lines.join('\n') + '\n');
process.exit(report.failures.length ? 1 : 0);
