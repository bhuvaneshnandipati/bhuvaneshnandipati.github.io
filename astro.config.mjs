// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Canonical site URL, used for canonical links, Open Graph URLs and the sitemap.
 * Set SITE_URL in your host's environment once you have a domain. Until then the
 * build falls back to the URL each host injects automatically.
 */
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site =
  process.env.SITE_URL ||
  process.env.URL || // Netlify
  (vercelUrl ? `https://${vercelUrl}` : undefined) ||
  process.env.CF_PAGES_URL || // Cloudflare Pages
  'https://sai-bhuvanesh-nandipati.pages.dev';

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  image: { responsiveStyles: false },
  vite: { build: { chunkSizeWarningLimit: 700 } },
});
