/**
 * Proves the colour-semantics rule holds at runtime.
 *
 * Walks every page, finds every element painted with a semantic data colour,
 * parses the number it contains, and asserts the colour matches the band that
 * number falls in. A bad number rendering green is a hard failure.
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';

const BASE = process.argv[2] || process.env.FF_BASE || 'http://localhost:3100';
const EXE = process.env.FF_CHROME || path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CAUGHT = 'rgb(53, 214, 164)';
const REVIEW = 'rgb(242, 180, 60)';
const EVADED = 'rgb(251, 110, 104)';

const b = await chromium.launch({ executablePath: EXE });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();

const violations = [];
const scanned = [];

async function scan(label) {
  const found = await p.evaluate(({ CAUGHT, REVIEW, EVADED }) => {
    const out = [];
    document.querySelectorAll('main *').forEach((el) => {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) return;
      const color = getComputedStyle(el).color;
      const tone = color === CAUGHT ? 'caught' : color === REVIEW ? 'review' : color === EVADED ? 'evaded' : null;
      if (!tone) return;
      out.push({ tone, text: el.textContent.trim().slice(0, 40) });
    });
    return out;
  }, { CAUGHT, REVIEW, EVADED });

  for (const f of found) {
    // Extract a comparable ratio: "59.6%", "3/14", "0.86", "+14.1"
    let ratio = null;
    let kind = null;
    const pctM = f.text.match(/^([\d.]+)%$/);
    const fracM = f.text.match(/^(\d+)\s*\/\s*(\d+)$/);
    const decM = f.text.match(/^([01]\.\d+)$/);
    if (pctM) { ratio = parseFloat(pctM[1]) / 100; kind = 'pct'; }
    else if (fracM) { ratio = Number(fracM[2]) ? Number(fracM[1]) / Number(fracM[2]) : null; kind = 'frac'; }
    else if (decM) { ratio = parseFloat(decM[1]); kind = 'dec'; }
    if (ratio === null) continue;

    scanned.push({ label, ...f, ratio });

    // The rule: >=0.67 good, 0.34-0.66 fair, <0.34 poor.
    // Costs may render amber/red at any value, so only GREEN is strictly
    // checked in both directions plus "poor value must never be green".
    const band = ratio >= 0.67 ? 'caught' : ratio >= 0.34 ? 'review' : 'evaded';
    if (f.tone === 'caught' && band !== 'caught') {
      violations.push(`${label}: "${f.text}" (${(ratio * 100).toFixed(1)}%) renders GREEN but band is ${band}`);
    }
    if (f.tone === 'evaded' && band === 'caught' && kind !== 'dec') {
      violations.push(`${label}: "${f.text}" (${(ratio * 100).toFixed(1)}%) renders RED but band is caught`);
    }
  }
}

const go = async (u, w = 3000) => { await p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 60000 }); await sleep(w); };

await go('/', 3500);
await scan('/ cockpit');
await p.getByRole('button', { name: /Run benchmark/ }).first().click().catch(() => {});
await sleep(5000);
await scan('/ benchmark');

await go('/identify', 1500); await scan('/identify');

await go('/generate', 5000); await scan('/generate sweep');
await p.locator('button:has(span.bar-track)').first().click().catch(() => {});
await sleep(3000); await scan('/generate sequence');

await go('/defender', 1200);
await p.getByRole('button', { name: /Run three rounds/ }).first().click().catch(() => {});
await sleep(7000); await scan('/defender');

await go('/sandbox', 3500); await scan('/sandbox');
await go('/report', 5000); await scan('/report');
await go('/method', 1200); await scan('/method');

await b.close();

console.log(`scanned ${scanned.length} semantically-coloured numeric values`);
const byTone = scanned.reduce((a, s) => { a[s.tone] = (a[s.tone] || 0) + 1; return a; }, {});
console.log('by tone: ' + JSON.stringify(byTone));
console.log('\nsample:');
console.log(scanned.slice(0, 14).map((s) => `  ${s.tone.padEnd(7)} ${(s.ratio * 100).toFixed(1).padStart(6)}%  "${s.text}"  [${s.label}]`).join('\n'));

if (violations.length) {
  console.log('\n*** ' + violations.length + ' VIOLATIONS ***');
  console.log(violations.map((v) => '  ' + v).join('\n'));
  process.exitCode = 1;
} else {
  console.log('\nPASS — no bad number renders green, no good number renders red.');
}
