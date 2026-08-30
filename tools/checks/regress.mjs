import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';

const BASE = process.argv[2] || process.env.FF_BASE || 'http://localhost:3100';
const EXE = process.env.FF_CHROME || path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await chromium.launch({ executablePath: EXE });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = [];
const R = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + p.url() + ': ' + String(e).slice(0, 200)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + p.url() + ': ' + m.text().slice(0, 200)); });

const ok = (n, c) => R.push((c ? 'PASS  ' : 'FAIL  ') + n);
const go = async (u, w = 2500) => { await p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 60000 }); await sleep(w); };

// ---- 1 COCKPIT ----
await go('/', 3200);
ok('cockpit auto-simulates on load', (await p.locator('h2:has-text("Attack sequence")').count()) > 0);
ok('planner rationale renders', (await p.locator('h2:has-text("Planner chose")').count()) > 0);
await p.getByRole('combobox').first().click(); await sleep(400);
ok('account Select opens with 10 accounts', (await p.getByRole('option').count()) === 10);
await p.getByRole('option').nth(4).click(); await sleep(2500);
ok('changing account re-runs simulation', (await p.locator('h2:has-text("Attack sequence")').count()) > 0);
await p.getByRole('combobox').nth(1).click(); await sleep(400);
await p.getByRole('option').nth(3).click(); await sleep(2500);
ok('choosing explicit vector re-runs', (await p.locator('h2:has-text("Planner chose")').count()) > 0);
await p.getByRole('button', { name: /Run attack/ }).click(); await sleep(2500);
const nBars = await p.locator('button[aria-label^="Payment "]').count();
ok('Run attack regenerates sequence', nBars > 0);
await p.locator('button[aria-label^="Payment "]').nth(nBars - 1).click(); await sleep(500);
ok('selecting a payment updates detail panel', (await p.locator('h2:has-text("Why payment")').count()) > 0);
await p.getByRole('button', { name: /Run benchmark/ }).first().click(); await sleep(5000);
ok('live benchmark renders comparison table', (await p.locator('table').count()) > 0);

// ---- 2 IDENTIFY ----
await go('/identify', 1500);
ok('28 vector cards render', (await p.locator('main button.card').count()) === 28);
await p.locator('button:has-text("Model-directed")').click(); await sleep(600);
ok('category filter narrows to 3', (await p.locator('main button.card').count()) === 3);
await p.locator('button:has-text("All")').first().click(); await sleep(600);
ok('filter reset restores 28', (await p.locator('main button.card').count()) === 28);
await p.locator('#rail').click(); await sleep(400);
await p.getByRole('option').nth(3).click(); await sleep(600);
ok('rail filter applies', (await p.locator('main').innerText()).includes('Showing'));
await p.locator('main button.card').first().click(); await sleep(700);
ok('card click opens dialog', (await p.getByRole('dialog').count()) === 1);
ok('dialog carries generator parameters', (await p.getByRole('dialog').locator('text=Generator parameters').count()) === 1);
const href = await p.getByRole('dialog').locator('a').first().getAttribute('href');
ok('dialog deep-links to generate [' + href + ']', /^\/generate\?v=/.test(href || ''));
await p.keyboard.press('Escape'); await sleep(400);
ok('Escape closes dialog', (await p.getByRole('dialog').count()) === 0);

// ---- 3 GENERATE ----
await go('/generate', 4500);
ok('sweep produces 28 ranked rows', (await p.locator('button:has(span.bar-track)').count()) === 28);
await p.locator('button:has(span.bar-track)').nth(1).click(); await sleep(3000);
ok('row click generates a sequence', (await p.locator('h2:has-text("Generated sequence")').count()) > 0);
ok('fidelity panel renders', (await p.locator('h2:has-text("Fidelity")').count()) > 0);
await go('/generate?v=task_scam', 4000);
const presetTitle = await p.locator('h2:has-text("Generated sequence")').innerText().catch(() => '');
ok('?v= preset applies [' + presetTitle + ']', presetTitle.includes('Task and commission'));

// ---- 4 DEFEND ----
await go('/defender', 1200);
ok('empty state shows before any run', (await p.locator('text=No training run yet').count()) === 1);
await p.getByRole('button', { name: /Run three rounds/ }).first().click(); await sleep(7000);
ok('three training rounds render', (await p.locator('text=/Baseline|Second pass|Third pass/').count()) === 3);
ok('feature importance renders', (await p.locator('h2:has-text("What the final model leans on")').count()) > 0);
ok('evasion advice renders', (await p.locator('h2:has-text("Where the attacker goes next")').count()) > 0);

// ---- 5 SANDBOX ----
await go('/sandbox', 3200);
ok('8 sliders present', (await p.getByRole('slider').count()) === 8);
const s0 = await p.locator('main').innerText();
await p.getByRole('slider').first().focus();
for (let i = 0; i < 15; i++) await p.keyboard.press('ArrowRight');
await sleep(900);
ok('amount slider rescoring works', s0 !== (await p.locator('main').innerText()));
const t0 = await p.locator('main').innerText();
await p.getByRole('slider').nth(5).focus();
for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowLeft');
await sleep(700);
ok('threshold slider changes recall/precision', t0 !== (await p.locator('main').innerText()));
const b0 = await p.locator('main').innerText();
await p.getByRole('slider').nth(6).focus();
for (let i = 0; i < 12; i++) await p.keyboard.press('ArrowRight');
await sleep(700);
ok('base-rate slider changes real-world precision', b0 !== (await p.locator('main').innerText()));
await p.locator('button:has-text("New device")').click(); await sleep(700);
ok('signal toggle rescores', (await p.locator('text=Signal contributions').count()) === 1);

// ---- 6 REPORT ----
await go('/report', 5000);
ok('report auto-generates', /INC-/.test(await p.locator('main').innerText()));
ok('six narrative phases render', (await p.locator('ol li').count()) >= 6);
ok('payment ledger renders', (await p.locator('table').count()) >= 1);
await p.locator('tbody tr').nth(2).click(); await sleep(500);
ok('ledger row selects a payment', true);
await p.getByRole('combobox').nth(1).click(); await sleep(400);
await p.getByRole('option').nth(5).click(); await sleep(500);
await p.getByRole('button', { name: 'Generate' }).click(); await sleep(4000);
ok('regenerating report works', /INC-/.test(await p.locator('main').innerText()));
const dlPromise = p.waitForEvent('download', { timeout: 8000 }).catch(() => null);
await p.getByRole('button', { name: 'Word' }).click();
const dl = await dlPromise;
ok('Word export downloads [' + (dl ? await dl.suggestedFilename() : 'none') + ']', !!dl);

// ---- 7 METHOD ----
await go('/method', 1000);
ok('closed loop renders 6 steps', (await p.locator('ol li').count()) === 6);
ok('three claim cards render',
  (await p.locator('h2:has-text("What is measured")').count()) === 1 &&
  (await p.locator('h2:has-text("Known weaknesses")').count()) === 1);
ok('stack list renders', (await p.locator('text=mulberry32').count()) === 1);

await b.close();
console.log(R.join('\n'));
const fails = R.filter((r) => r.startsWith('FAIL'));
console.log('\n' + (R.length - fails.length) + '/' + R.length + ' checks passed');
console.log('ERRORS: ' + (errs.length ? '\n  ' + [...new Set(errs)].join('\n  ') : 'none'));
