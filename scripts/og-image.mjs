/**
 * Regenerates public/og.png (1200×630 social preview) from the built home page.
 *   npm run build && node scripts/og-image.mjs && npm run build
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve('dist');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer(async (q, r) => {
  let p = join(ROOT, new URL(q.url, 'http://x').pathname);
  try {
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
    r.writeHead(200, { 'Content-Type': T[extname(p)] || 'application/octet-stream' });
    r.end(await readFile(p));
  } catch { r.writeHead(404); r.end(); }
}).listen(0);
await new Promise((r) => server.on('listening', r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.addStyleTag({ content: '.hdr{display:none!important}.hero{padding-top:44px!important}.hero__sub .btn{display:none!important}' });
await page.waitForTimeout(5000);
await page.screenshot({ path: resolve('public/og.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
server.close();
console.log('wrote public/og.png');
