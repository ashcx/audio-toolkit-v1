import { mkdir, writeFile } from 'node:fs/promises';
import { engines, launchOptions } from './lib/engines.mjs';
import { loadCopy, reporter, startApp } from './lib/harness.mjs';

const copy = await loadCopy();
const root = process.env.SPRINT30_EVIDENCE_DIR ?? 'docs/sprint-evidence/sprint-30';
await mkdir(`${root}/captures`, { recursive: true });
const args = process.argv.slice(2);
const baseline = args.includes('--baseline');
const taskFlag = args.indexOf('--task');
const only = taskFlag >= 0 ? args[taskFlag + 1] : null;

export const VIEWPORTS = [
  { name: '320', width: 320, height: 700 },
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];
const LONG_NAME = 'field-recording-with-a-very-long-descriptive-name-take-7.wav';

/** A stereo tone with a burst envelope so peaks have shape. Duration and sample rate are exact. */
export function wav(seconds, rate = 44100) {
  const frames = rate * seconds, bytes = Buffer.alloc(44 + frames * 4);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 4, 28); bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / rate, burst = 0.35 + 0.65 * Math.max(0, Math.sin((2 * Math.PI * t) / 3));
    const value = Math.round(0.6 * burst * Math.sin(2 * Math.PI * 330 * t) * 32767);
    bytes.writeInt16LE(value, 44 + frame * 4); bytes.writeInt16LE(value, 46 + frame * 4);
  }
  return bytes;
}
export const fixture = (name, seconds) => ({ name, mimeType: 'audio/wav', buffer: wav(seconds) });
export const FIXTURE_PATHS = ['tests/fixtures/tone.wav', 'tests/fixtures/tone.mp3', 'tests/fixtures/tone.flac'];

export async function openApp(browser, app, viewport, { scheme = 'light', touch = false, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }, colorScheme: scheme, reducedMotion,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(app.url);
  await page.getByRole('heading', { name: copy.app.title }).waitFor();
  return { context, page, errors };
}

export const addFiles = async (page, files, count) => {
  await page.locator('input[type=file]').setInputFiles(files);
  await page.waitForFunction(n => {
    const rows = [...document.querySelectorAll('li[data-inspection]')];
    return rows.length >= n && rows.every(li => li.dataset.inspection === 'ready');
  }, count ?? files.length, { timeout: 30000 });
};

export const exportAll = async (page, count) => {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.waitForFunction(n => document.querySelectorAll('li[data-job-state=done]').length === n, count, { timeout: 90000 });
  await page.waitForTimeout(300);
};

/** Layout numbers of the Files panel as the page renders them. */
export const metrics = page => page.evaluate(() => {
  const panel = document.querySelector('.files-panel').getBoundingClientRect();
  const box = element => { const r = element.getBoundingClientRect(); return { width: r.width, height: r.height, top: r.top - panel.top }; };
  const rows = [...document.querySelectorAll('.file-list li')].map(li => ({ id: li.dataset.fileId, state: li.dataset.jobState ?? 'none', ...box(li) }));
  const wave = document.querySelector('.wave-track');
  const drop = document.querySelector('.dropzone');
  const add = document.querySelector('.panel-heading label, .panel-heading .add-files');
  return {
    panelHeight: panel.height,
    firstRowOffset: rows.length ? rows[0].top : null,
    rows,
    waveWidth: wave ? wave.getBoundingClientRect().width : null,
    emptyBoxHeight: drop && !rows.length ? drop.getBoundingClientRect().height : null,
    addHeight: add ? add.getBoundingClientRect().height : null,
    overflow: document.documentElement.scrollWidth - innerWidth,
  };
});

async function runBaseline(app, browser) {
  const out = { base: process.env.SPRINT30_BASE ?? 'unmodified build', viewports: {} };
  for (const viewport of VIEWPORTS) {
    const entry = out.viewports[viewport.name] = {};
    for (const touch of [false, true]) {
      if (touch && viewport.width > 768) continue;
      const { context, page } = await openApp(browser, app, viewport, { touch });
      const empty = await metrics(page);
      entry[touch ? 'emptyCoarse' : 'emptyFine'] = empty.emptyBoxHeight;
      if (touch) { await context.close(); continue; }
      await addFiles(page, [fixture('tone-20.wav', 20)]);
      await page.waitForTimeout(400);
      const unprocessed = await metrics(page);
      entry.firstRowOffset = unprocessed.firstRowOffset;
      entry.unprocessedRow = unprocessed.rows[0].height;
      entry.waveWidthUnprocessed = unprocessed.waveWidth;
      await page.locator('input[type=file]').setInputFiles([fixture(LONG_NAME, 12)]);
      await page.waitForFunction(() => document.querySelectorAll('li[data-inspection=ready]').length === 2);
      await page.waitForTimeout(300);
      entry.longNameRow = (await metrics(page)).rows[1].height;
      await exportAll(page, 2);
      const finished = await metrics(page);
      entry.finishedRow = finished.rows[0].height;
      entry.finishedLongNameRow = finished.rows[1].height;
      entry.waveWidthFinished = finished.waveWidth;
      entry.overflow = finished.overflow;
      await page.screenshot({ path: `${root}/captures/baseline-${viewport.name}.png`, fullPage: true });
      await context.close();
    }
  }
  await writeFile(`${root}/baseline-measurements.json`, `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2));
}

const app = await startApp();
const { check, note, lines, failures } = reporter();
const wanted = engines();
let failed = false;
try {
  for (const [name, type] of wanted) {
    const browser = await type.launch({ ...launchOptions(name), args: ['--autoplay-policy=no-user-gesture-required'] });
    try {
      if (baseline) await runBaseline(app, browser);
      else note('no tasks registered yet');
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
if (failures.length) failed = true;
if (!baseline) console.log(failed ? `FAIL: ${failures.length}` : `PASS: ${lines.filter(line => !line.note).length} checks`);
process.exit(failed ? 1 : 0);
