import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const BASE = process.argv[2] || process.env.FF_BASE || 'http://localhost:3100';
const OUT = process.env.FF_OUT || 'design-baseline/current';
const EXE = process.env.FF_CHROME || path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + p.url() + ': ' + String(e).slice(0, 200)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + p.url() + ': ' + m.text().slice(0, 200)); });

const log = [];
const go = async (u, w = 2500) => { await p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 60000 }); await sleep(w); };

async function shotPage(file, note) {
  const f = path.join(OUT, file);
  await p.screenshot({ path: f, fullPage: true });
  const { size } = fs.statSync(f);
  log.push(`${file.padEnd(34)} ${String(Math.round(size / 1024)).padStart(4)}KB  ${note}`);
}

async function shotEl(file, locator, note) {
  const f = path.join(OUT, file);
  await locator.scrollIntoViewIfNeeded();
  await sleep(500);
  await locator.screenshot({ path: f });
  const { size } = fs.statSync(f);
  log.push(`${file.padEnd(34)} ${String(Math.round(size / 1024)).padStart(4)}KB  ${note}`);
}

// ── /  Cockpit: run the attack + benchmark so every section has real data ──
await go('/', 3500);
await p.getByRole('button', { name: /Run benchmark/ }).first().click();
await sleep(5000);

// 01 Mission Briefing — hero + the controls that arm a run
await shotEl('01-mission-briefing.png',
  p.locator('main > div > div').first(), 'hero / "/" ');
await p.screenshot({ path: path.join(OUT, '01-mission-briefing-viewport.png'),
  clip: { x: 240, y: 0, width: 1200, height: 720 } });
log.push('01-mission-briefing-viewport.png    (above-the-fold context)');

// 11 Attack Replay — the sequence visualisation
await shotEl('11-attack-replay.png',
  p.locator('section:has(h2:text("Attack sequence"))'), 'sequence chart / "/" ');

// 05 Adapt — planner scoring every vector against the account
await shotEl('05-adapt.png',
  p.locator('section:has(h2:text-matches("Planner chose"))'), 'planner rationale / "/" ');

// 09 Live Benchmark — measured detector comparison
await shotEl('09-live-benchmark.png',
  p.locator('section:has(h2:text("Measured detector comparison"))'), 'benchmark / "/" ');

// ── /identify ──
await go('/identify', 1800);
await shotPage('02-identify.png', 'full page');

// ── /generate ──
await go('/generate', 5000);
await p.locator('button:has(span.bar-track)').nth(1).click();
await sleep(3200);
await shotPage('03-generate.png', 'full page, sweep + one sequence');

// ── /sandbox ──
await go('/sandbox', 3500);
await shotEl('04-ai-defense-lab.png',
  p.locator('section:has(h2:text("Score a payment you build by hand"))'), 'stage 1 / sandbox');
await shotEl('07-reality-check.png',
  p.locator('section:has(h2:text("What those rates mean at a real base rate"))'), 'stage 3 / sandbox');

// ── /defender ──
await go('/defender', 1500);
await p.getByRole('button', { name: /Run three rounds/ }).first().click();
await sleep(7500);
await shotPage('06-defend.png', 'full page, after training');

// ── /report ──
await go('/report', 5500);
await shotPage('08-evidence.png', 'full page');

// ── /method ──
await go('/method', 1500);
await shotPage('10-methodology.png', 'full page');

await b.close();
console.log(log.join('\n'));
console.log('\nfiles in design-baseline/: ' + fs.readdirSync(OUT).length);
console.log('ERRORS: ' + (errs.length ? '\n  ' + [...new Set(errs)].join('\n  ') : 'none'));
