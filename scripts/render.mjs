// Renders site/ from templates/ + content.json + cms.json using the REAL
// Orbit renderer (../orbit/lib/cms-render.ts) so the deployed HTML is
// byte-identical to what Orbit CMS produces after its first save.
//
// Dev-only tool for this machine: requires the Orbit repo at LVerbeeck/orbit
// (this repo lives at LVerbeeck/... too) and Node >= 23 (native TS stripping).
// CF Pages never runs this - it serves site/ as-is.
//
// Usage: node scripts/render.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
// Orbit repo lives in the LVerbeeck folder, not next to this repo.
const orbitRender = '/Users/lud/Claude Code/LVerbeeck/orbit/lib/cms-render.ts';

const { renderPage, renderCollectionItemPage } = await import(orbitRender);

const cms = JSON.parse(readFileSync(join(root, 'cms.json'), 'utf8'));
const content = JSON.parse(readFileSync(join(root, 'content.json'), 'utf8'));

const SITE_NAME = cms.site.name;          // 'TrackTrendy'
const SITE_DOMAIN = 'tracktrendy.com';    // bare host: og:url + TrackTrendy data-site (matches canonical)

// ---- Pages --------------------------------------------------------------
for (const pageSchema of cms.pages) {
  const pageContent = content.pages[pageSchema.id];
  if (!pageContent) { console.error(`! no content for page ${pageSchema.id}`); continue; }
  const template = readFileSync(join(root, pageSchema.template), 'utf8');
  const html = renderPage(
    template,
    pageContent,
    pageSchema,
    content.typography,
    undefined,            // systemVars
    SITE_DOMAIN,
    content.collections,
    cms.content_types,
    undefined,            // storeConfig
    SITE_NAME,
  );
  const out = join(root, pageSchema.output);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`  page ${pageSchema.id} -> ${pageSchema.output}`);
}

// ---- Collection items (none on this site yet) ---------------------------
for (const ct of cms.content_types ?? []) {
  const template = readFileSync(join(root, ct.item_template), 'utf8');
  for (const entry of content.collections?.[ct.id] ?? []) {
    const html = renderCollectionItemPage(
      template, entry, ct, content.typography, undefined, SITE_DOMAIN,
      undefined, content.collections, cms.content_types, SITE_NAME,
    );
    const out = join(root, ct.item_output.replace('{{slug}}', entry.slug));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log(`  ${ct.id} ${entry.slug} -> ${out.replace(root + '/', '')}`);
  }
}

console.log('done');
