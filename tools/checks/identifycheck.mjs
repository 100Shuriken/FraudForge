/**
 * Findings 12, 13, 18 — measured, not eyeballed.
 *
 * F12 groups the rendered cards into rows by their top offset and asserts that
 * every row's rightmost card reaches the grid's right edge. That is what
 * "no ragged edge" actually means geometrically.
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

async function rowAudit(label) {
  return p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.even-grid').forEach((grid, gi) => {
      const gr = grid.getBoundingClientRect();
      const cards = [...grid.children].map((c) => c.getBoundingClientRect());
      const rows = new Map();
      cards.forEach((r) => {
        const key = Math.round(r.top);
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push(r);
      });
      [...rows.entries()].forEach(([top, rs], ri) => {
        const rightmost = Math.max(...rs.map((r) => r.right));
        out.push({
          grid: gi, row: ri, cards: rs.length,
          gap: Math.round(gr.right - rightmost),
        });
      });
    });
    return out;
  });
}

/* ── F12 · ragged edges ───────────────────────────────────────────────── */
await p.goto(BASE + '/identify', { waitUntil: 'networkidle' });
await sleep(1800);

const rows = await rowAudit();
const ragged = rows.filter((r) => r.gap > 2);
ok('F12: every row reaches the grid right edge (1440px)',
  ragged.length === 0,
  ragged.length
    ? `ragged rows: ${ragged.map((r) => `grid${r.grid}/row${r.row} gap ${r.gap}px`).join(', ')}`
    : `${rows.length} rows across ${new Set(rows.map((r) => r.grid)).size} sections, max gap ${Math.max(...rows.map((r) => r.gap))}px`);

const perSection = await p.evaluate(() =>
  [...document.querySelectorAll('.even-grid')].map((g) => ({
    n: g.children.length,
    cols: getComputedStyle(g).getPropertyValue('--cols').trim(),
  })));
ok('F12: column count adapts per section',
  new Set(perSection.map((x) => x.cols)).size > 1,
  perSection.map((x) => `${x.n}→${x.cols}col`).join('  '));

// and at a narrower viewport
await p.setViewportSize({ width: 1100, height: 900 });
await sleep(900);
const rows1100 = await rowAudit();
const ragged1100 = rows1100.filter((r) => r.gap > 2);
ok('F12: still flush at 1100px',
  ragged1100.length === 0,
  ragged1100.length ? `${ragged1100.length} ragged rows` : `${rows1100.length} rows flush`);
await p.setViewportSize({ width: 1440, height: 1000 });
await sleep(700);

/* ── F13 · affordance ─────────────────────────────────────────────────── */
const caretsAtRest = await p.evaluate(() =>
  [...document.querySelectorAll('main button.card svg')].length);
ok('F13: every card carries a standing affordance',
  caretsAtRest === 28, `${caretsAtRest} carets on 28 cards`);

const card = p.locator('main button.card').first();
const before = await card.evaluate((el) => getComputedStyle(el).borderColor);
await card.hover();
await sleep(400);
const after = await card.evaluate((el) => getComputedStyle(el).borderColor);
const caretColor = await card.locator('svg').evaluate((el) => getComputedStyle(el).color);
ok('F13: hover changes the card border',
  before !== after, `${before} → ${after}`);
ok('F13: caret turns azure on hover',
  caretColor === 'rgb(75, 158, 248)', `caret colour on hover ${caretColor}`);

/* ── F18 · count repetition ───────────────────────────────────────────── */
await p.goto(BASE + '/identify', { waitUntil: 'networkidle' });
await sleep(1500);
const occurrences = await p.evaluate(() => {
  const head = document.querySelector('main').innerText.slice(0, 900);
  return (head.match(/\b28\b/g) || []).length;
});
ok('F18: "28" appears once in the page head region',
  occurrences === 1, `${occurrences} occurrence(s) in the first 900 chars`);

const showingHidden = await p.locator('text=/Showing .* of .* vectors/').count();
ok('F18: "Showing X of Y" hidden when nothing is filtered',
  showingHidden === 0, `${showingHidden} shown at rest`);

await p.locator('button:has-text("Model-directed")').click();
await sleep(700);
const showingVisible = await p.locator('text=/Showing .* of .* vectors/').count();
ok('F18: "Showing X of Y" appears once a filter is active',
  showingVisible === 1, `${showingVisible} shown when filtered`);
const raggedFiltered = (await rowAudit()).filter((r) => r.gap > 2);
ok('F12: still flush after filtering',
  raggedFiltered.length === 0, `${raggedFiltered.length} ragged rows when filtered`);

await b.close();
const w = Math.max(...results.map((r) => r.n.length));
console.log(results.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.n.padEnd(w)}  ${r.detail}`).join('\n'));
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} identify checks passed`);
if (fails.length) process.exitCode = 1;
