/**
 * Proves every rendered vector name is the taxonomy's canonical label.
 *
 * The canonical set is fetched from /api/customers, which derives its family
 * labels straight from the taxonomy. Anything rendered that is not in that set
 * was derived from an id somewhere, which is the bug.
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';

const BASE = process.argv[2] || process.env.FF_BASE || 'http://localhost:3100';
const EXE = process.env.FF_CHROME || path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const ok = (n, pass, detail) => results.push({ n, pass, detail });

const b = await chromium.launch({ executablePath: EXE });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();

const meta = await (await p.request.get(BASE + '/api/customers')).json();
const CANON = new Set(meta.families.map((f) => f.label));
console.log(`canonical labels: ${CANON.size}`);
console.log(`  e.g. ${meta.families.slice(0, 3).map((f) => `"${f.label}"`).join(', ')}\n`);

/* ── / Adapt: heading and bar list must agree ─────────────────────────── */
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await sleep(3500);

const adapt = await p.evaluate(() => {
  const panel = [...document.querySelectorAll('section')]
    .find((s) => /Planner chose/.test(s.querySelector('h2')?.textContent || ''));
  if (!panel) return null;
  const heading = panel.querySelector('h2').textContent.replace(/^Planner chose\s*/, '').trim();
  const rows = [...panel.querySelectorAll('div.flex.items-center.gap-3 > span:first-child')]
    .map((s) => s.textContent.trim())
    .filter(Boolean);
  const highlighted = [...panel.querySelectorAll('span')]
    .filter((s) => s.className.includes('text-ember') && !s.className.includes('font-mono'))
    .map((s) => s.textContent.trim())
    .filter(Boolean);
  return { heading, rows, highlighted };
});

ok('Adapt: heading label is canonical',
  CANON.has(adapt.heading), `heading = "${adapt.heading}"`);
ok('Adapt: every bar-list label is canonical',
  adapt.rows.every((r) => CANON.has(r)),
  adapt.rows.every((r) => CANON.has(r))
    ? `all ${adapt.rows.length} rows canonical`
    : `offenders: ${adapt.rows.filter((r) => !CANON.has(r)).join(' | ')}`);
ok('Adapt: heading appears verbatim in its own bar list',
  adapt.rows.includes(adapt.heading),
  `heading "${adapt.heading}" ${adapt.rows.includes(adapt.heading) ? 'found' : 'MISSING'} among rows`);
ok('Adapt: the highlighted row is the chosen vector',
  adapt.highlighted.includes(adapt.heading),
  `highlighted = ${adapt.highlighted.filter((h) => CANON.has(h)).join(', ') || '(none canonical)'}`);

/* ── /generate: sweep rows ───────────────────────────────────────────── */
await p.goto(BASE + '/generate', { waitUntil: 'networkidle' });
await sleep(5000);
const gen = await p.evaluate(() => [...document.querySelectorAll('[data-zone] button > span:first-child')]
  .map((s) => s.textContent.trim()).filter(Boolean));
ok('Generate: every sweep row label is canonical',
  gen.length > 0 && gen.every((g) => CANON_HAS(g)),
  gen.every((g) => CANON_HAS(g))
    ? `all ${gen.length} rows canonical`
    : `offenders: ${gen.filter((g) => !CANON_HAS(g)).join(' | ')}`);
function CANON_HAS(x) { return CANON.has(x); }

/* ── /report: "Attack selected" phase facts ──────────────────────────── */
await p.goto(BASE + '/report', { waitUntil: 'networkidle' });
await sleep(5500);
const rep = await p.evaluate(() => {
  const li = [...document.querySelectorAll('ol li')]
    .find((x) => /Attack selected/i.test(x.textContent));
  if (!li) return null;
  return {
    headline: li.querySelector('.text-h3')?.textContent.trim() || '',
    facts: [...li.querySelectorAll('dt')].map((d) => d.textContent.trim()),
  };
});
ok('Report: attack-selected fact labels are canonical',
  rep && rep.facts.length > 0 && rep.facts.every((x) => CANON.has(x)),
  rep ? (rep.facts.every((x) => CANON.has(x))
    ? `all ${rep.facts.length} facts canonical`
    : `offenders: ${rep.facts.filter((x) => !CANON.has(x)).join(' | ')}`) : 'phase not found');
ok('Report: headline names the canonical vector',
  rep && [...CANON].some((c) => rep.headline.startsWith(c)),
  rep ? `headline = "${rep.headline}"` : 'n/a');

/* ── Global: no Title-Cased id survives anywhere ─────────────────────── */
for (const url of ['/', '/generate', '/report']) {
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  await sleep(url === '/report' ? 5500 : url === '/generate' ? 5000 : 3500);
  const bad = await p.evaluate(() => {
    const suspects = ['Qr Swap', 'Task Scam', 'Feature Evasion', 'Subscription Trap',
      'Mule Recruitment', 'Card Testing', 'Sleeper Pacing', 'Velocity Anomaly',
      'Qr Substitution', 'Fake Merchant'];
    const t = document.querySelector('main').innerText;
    return suspects.filter((x) => t.includes(x));
  });
  ok(`${url}: no Title-Cased id text present`, bad.length === 0,
    bad.length ? `found: ${bad.join(', ')}` : 'clean');
}

await b.close();
const w = Math.max(...results.map((r) => r.n.length));
console.log(results.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.n.padEnd(w)}  ${r.detail}`).join('\n'));
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} label checks passed`);
if (fails.length) process.exitCode = 1;
