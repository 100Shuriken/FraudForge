/**
 * Proves the chart-scaling fixes hold at runtime, by measuring rendered
 * geometry rather than trusting the source.
 *
 * The shared principle being asserted: a chart's marks must occupy a
 * meaningful fraction of the space the chart reserves. A plot where every mark
 * lands within a few pixels of every other is not showing the thing it exists
 * to show.
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
const go = async (u, w = 3000) => { await p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 60000 }); await sleep(w); };

/* ── FINDING 3 · Adapt dot plot spread ──────────────────────────────── */
await go('/', 3500);
const adapt = await p.evaluate(() => {
  const panel = [...document.querySelectorAll('section')]
    .find((s) => /Planner chose/.test(s.querySelector('h2')?.textContent || ''));
  if (!panel) return null;
  const dots = [...panel.querySelectorAll('span[style*="left"]')]
    .filter((el) => el.className.includes('rounded-full') && !el.className.includes('h-0.5'));
  if (!dots.length) return null;
  const track = dots[0].parentElement.getBoundingClientRect();
  const xs = dots.map((d) => d.getBoundingClientRect().left + d.getBoundingClientRect().width / 2 - track.left);
  return { n: dots.length, spread: (Math.max(...xs) - Math.min(...xs)) / track.width, trackW: Math.round(track.width) };
});
ok('F3 adapt: dot spread uses >60% of the track',
  adapt && adapt.spread > 0.6,
  adapt ? `${(adapt.spread * 100).toFixed(1)}% of ${adapt.trackW}px, ${adapt.n} dots` : 'plot not found');
ok('F3 adapt: zoomed domain is printed, not implied',
  await p.locator('text=/axis zoomed to/').count() > 0,
  'domain label present');

/* ── FINDING 4 · Attack Replay domain + legend ──────────────────────── */
const seq = await p.evaluate(() => {
  const bars = [...document.querySelectorAll('button[aria-label^="Payment "]')]
    .map((btn) => {
      const fill = btn.querySelector('span[style*="height"]');
      return fill ? fill.getBoundingClientRect().height : 0;
    })
    .filter(Boolean);
  const lane = document.querySelector('button[aria-label^="Payment "]');
  const laneH = lane ? lane.getBoundingClientRect().height : 0;
  return { bars, laneH, tallest: Math.max(...bars), n: bars.length };
});
ok('F4 replay: tallest risk bar uses >55% of the plot height',
  seq && seq.tallest / seq.laneH > 0.55,
  seq ? `tallest ${Math.round(seq.tallest)}px of ${Math.round(seq.laneH)}px = ${((seq.tallest / seq.laneH) * 100).toFixed(0)}%` : 'no bars');

const legendRows = await p.evaluate(() => {
  const panel = [...document.querySelectorAll('section')]
    .find((s) => /Attack sequence/.test(s.querySelector('h2')?.textContent || ''));
  if (!panel) return null;
  const labels = [...new Set([...panel.querySelectorAll('span')]
    .map((s) => s.textContent.trim())
    .filter((t) => /^(Caught|Step-up|Evaded) —/.test(t))
    .map((t) => t.split(' ')[0]))];
  const states = new Set([...panel.querySelectorAll('button[aria-label^="Payment "]')]
    .map((b) => (b.getAttribute('aria-label').match(/, (\w+)$/) || [])[1]));
  return { legend: labels.length, states: [...states] };
});
ok('F4 replay: legend lists only outcomes present in the data',
  legendRows && legendRows.legend === new Set(legendRows.states.map((s) =>
    s === 'BLOCK' ? 'caught' : s === 'STEP_UP' ? 'review' : 'evaded')).size,
  legendRows ? `${legendRows.legend} legend rows, outcomes present: ${legendRows.states.join('/')}` : 'not found');

/* ── FINDING 5 · amount lane must not crowd the risk baseline ───────── */
const amt = await p.evaluate(() => {
  const panel = [...document.querySelectorAll('section')]
    .find((s) => /Attack sequence/.test(s.querySelector('h2')?.textContent || ''));
  if (!panel) return null;
  const riskBtn = panel.querySelector('button[aria-label^="Payment "]');
  const riskBottom = riskBtn ? riskBtn.getBoundingClientRect().bottom : 0;
  const amtRow = panel.querySelector('[data-amount-lane]');
  if (!amtRow) return { present: false, gap: null };
  const r = amtRow.getBoundingClientRect();
  const bars = [...amtRow.querySelectorAll('span[style*="height"]')].map((s) => s.getBoundingClientRect().height);
  const spread = bars.length ? (Math.max(...bars) - Math.min(...bars)) / Math.max(...bars) : 0;
  return { present: true, gap: Math.round(r.top - riskBottom), spread, n: bars.length };
});
if (amt && amt.present) {
  ok('F5 amount lane: clear separation from the risk baseline',
    amt.gap >= 8, `${amt.gap}px gap below the risk axis`);
  ok('F5 amount lane: carries visible variation (>25% spread)',
    amt.spread > 0.25, `${(amt.spread * 100).toFixed(0)}% spread across ${amt.n} bars`);
} else {
  // Absence of the marker is only a pass if the lane is genuinely gone.
  const stillThere = await p.evaluate(() => {
    const panel = [...document.querySelectorAll('section')]
      .find((s) => /Attack sequence/.test(s.querySelector('h2')?.textContent || ''));
    return panel ? /amt/.test(panel.textContent) : false;
  });
  ok('F5 amount lane: reworked or removed', !stillThere,
    stillThere ? 'lane still present but not instrumented (data-amount-lane missing)' : 'lane removed');
}

/* ── FINDING 11 · Generate ladder ───────────────────────────────────── */
await go('/generate', 5000);
const gen = await p.evaluate(() => {
  const zones = [...document.querySelectorAll('[data-zone]')].map((z) => ({
    key: z.getAttribute('data-zone'),
    rows: z.querySelectorAll('button').length,
  }));
  const refs = [...document.querySelectorAll('[data-ref-line]')];
  const refVisible = refs.length
    ? Math.max(...refs.map((r) => parseFloat(getComputedStyle(r).opacity) || 1))
    : 0;
  const legendEls = [...document.querySelectorAll('span')]
    .filter((s) => /^Caught —/.test(s.textContent.trim()) && !s.querySelector('span'));
  const legends = legendEls.length;
  return { zones, refCount: refs.length, refVisible, legends };
});
ok('F11 generate: rows grouped into performance zones',
  gen.zones.length >= 2,
  gen.zones.length ? gen.zones.map((z) => `${z.key}:${z.rows}`).join(' ') : 'no zones');
ok('F11 generate: reference line rendered and visible',
  gen.refCount > 0 && gen.refVisible >= 0.5,
  `${gen.refCount} ref marks, opacity ${gen.refVisible}`);
ok('F11 generate: legend appears at most once',
  gen.legends <= 1, `${gen.legends} "Caught —" legend rows on the page`);

await b.close();

const w = Math.max(...results.map((r) => r.n.length));
console.log(results.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.n.padEnd(w)}  ${r.detail}`).join('\n'));
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} chart checks passed`);
if (fails.length) process.exitCode = 1;
