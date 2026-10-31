import { recipeAction } from './browser-controls.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:5181/audio-toolkit-v1/';
const root = 'docs/sprint-evidence/sprint-24';
await mkdir(`${root}/captures`, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const observations = { appUrl, browser: 'chrome', captures: [], exports: [] };
const setRange = async (page, name, value) => {
  const slider = page.getByRole('slider', { name, exact: true });
  await slider.evaluate((element, next) => {
    element.value = String(next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
};
const capture = async (page, name, fullPage = false) => {
  const path = `${root}/captures/${name}.png`;
  await page.screenshot({ path, fullPage, animations: 'disabled', timeout: 60000 });
  observations.captures.push(path);
};
const addStep = async (page, kind) => {
  await page.getByLabel('Add step', { exact: true }).selectOption(kind);
};

const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.on('pageerror', error => errors.push(error.message));
await page.goto(appUrl);
await page.getByRole('heading', { name: 'Audio Toolkit' }).waitFor();
await page.getByLabel('Choose audio or video files').setInputFiles('tests/fixtures/tone.wav');
await page.locator('[data-inspection=ready]').waitFor();

await addStep(page, 'normalize');
assert.equal(await page.getByRole('radio', { name: 'Loudness', exact: true }).isChecked(), true);
const rail = page.getByRole('slider', { name: 'Loudness target', exact: true });
await rail.waitFor();
assert.equal(await rail.getAttribute('aria-valuenow'), '-14');
assert.equal(await page.getByRole('slider', { name: 'True-peak ceiling (dBTP) slider', exact: true }).inputValue(), '-0.3');
const markText = await page.locator('.lufs-marks').innerText();
for (const text of ['-23 LUFS', 'EBU R 128 delivery', '-16 LUFS', 'Podcast reference', '-14 LUFS', 'Streaming playback', '-9.5 LUFS', 'Loud playback', '-8 LUFS', 'Tool maximum'])
  assert(markText.includes(text), `missing mark text ${text}`);
assert((await page.locator('.lufs-mark-label.delivery').count()) === 1);
await page.getByText('Only -23 LUFS is a formal delivery target here. Other marks are references, not platform guarantees.', { exact: true }).waitFor();

await rail.focus();
await page.keyboard.press('ArrowRight');
assert.equal(await rail.getAttribute('aria-valuenow'), '-13.5');
await page.keyboard.press('ArrowLeft');
assert.equal(await rail.getAttribute('aria-valuenow'), '-14');
await page.keyboard.press('Home');
assert.equal(await rail.getAttribute('aria-valuenow'), '-30');
await page.keyboard.press('End');
assert.equal(await rail.getAttribute('aria-valuenow'), '-8');
for (let index = 0; index < 12; index++) await page.keyboard.press('ArrowLeft');
assert.equal(await rail.getAttribute('aria-valuenow'), '-14');
await capture(page, '01-loudness-rail');

await page.getByRole('radio', { name: 'Peak', exact: true }).check();
assert.equal(await page.getByRole('slider', { name: 'Loudness target', exact: true }).count(), 0);
await page.getByRole('slider', { name: 'Peak target (dBTP) slider', exact: true }).waitFor();
await page.getByText('Peak mode matches the estimated true peak with a meter guard below the target. The loudness target is not used.', { exact: true }).waitFor();
await capture(page, '02-peak-mode');

await page.getByRole('radio', { name: 'Loudness', exact: true }).check();
await rail.focus();
for (let index = 0; index < 12; index++) await page.keyboard.press('ArrowRight');
assert.equal(await rail.getAttribute('aria-valuenow'), '-8');
await page.keyboard.press('Home');
for (let index = 0; index < 32; index++) await page.keyboard.press('ArrowRight');
assert.equal(await rail.getAttribute('aria-valuenow'), '-14');

await addStep(page, 'compress');
assert.equal(await page.getByRole('article', { name: 'Reduce loud/quiet differences', exact: true }).count(), 1);
assert.equal(await page.getByRole('checkbox', { name: 'Enable compressor', exact: true }).isChecked(), false);
const amount = page.getByRole('slider', { name: 'Compression amount', exact: true });
assert.equal(await amount.inputValue(), '50');
await page.getByRole('checkbox', { name: 'Enable compressor', exact: true }).check();
await setRange(page, 'Compression amount', 100);
assert.equal(await amount.inputValue(), '100');
await page.getByRole('combobox', { name: 'Preset', exact: true }).selectOption('speech');
assert.equal(await page.getByText('Compressor before loudness normalization avoids downstream gain changes. Explicit step order is respected.', { exact: true }).count(), 1);
for (const name of ['Threshold', 'Ratio', 'Attack', 'Release', 'Makeup gain'])
  assert.equal(await page.getByRole('slider', { name: new RegExp(name, 'i') }).count(), 0, `unexpected ${name} control`);
await capture(page, '03-compressor-controls');

await (await recipeAction(page, 'Move Reduce loud/quiet differences up')).click();
await page.waitForFunction(() => [...document.querySelectorAll('.recipe-step')].map(element => element.getAttribute('aria-label')).join('|') === 'Reduce loud/quiet differences|Normalize');
observations.order = await page.locator('.recipe-step').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));

await page.getByRole('button', { name: 'Preview tone.wav', exact: true }).click();
const previewMessage = page.getByText(/Compressor reduced peaks by up to \d+\.\d dB in this excerpt\./);
await previewMessage.waitFor({ timeout: 60000 });
observations.preview = await previewMessage.innerText();
await capture(page, '04-preview-compressor');
await page.getByRole('button', { name: 'Close preview', exact: true }).click();

await page.getByRole('button', { name: 'Export', exact: true }).click();
const downloadLink = page.getByRole('link', { name: 'Download', exact: true });
await downloadLink.waitFor({ timeout: 60000 });
await page.getByText(/Loudness target reached\. Achieved -14\.\d LUFS\./).waitFor();
await page.getByText(/Compressor max gain reduction \d+\.\d dB\./).waitFor();
const pendingDownload = page.waitForEvent('download');
await downloadLink.click();
const download = await pendingDownload;
await download.saveAs(`.artifacts/${download.suggestedFilename()}`);
observations.exports.push({ format: 'mp3', name: download.suggestedFilename(), result: 'target reached with compressor gain reduction' });
await capture(page, '05-export-result');

const crest = (() => {
  const rate = 48000, seconds = 2, channels = 2, frames = rate * seconds;
  const bytes = Buffer.alloc(44 + frames * channels * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(channels, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * channels * 2, 28);
  bytes.writeUInt16LE(channels * 2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  for (let frame = 0; frame < frames; frame++) {
    const value = frame === 24000 || frame === 72000 ? 0.9 : 0.02 * Math.sin(2 * Math.PI * 1000 * frame / rate);
    for (let channel = 0; channel < channels; channel++)
      bytes.writeInt16LE(Math.round(value * 32767), 44 + (frame * channels + channel) * 2);
  }
  return bytes;
})();

const limited = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
limited.on('pageerror', error => errors.push(error.message));
await limited.goto(appUrl);
await limited.getByRole('heading', { name: 'Audio Toolkit' }).waitFor();
await limited.getByLabel('Choose audio or video files').setInputFiles({ name: 'crest.wav', mimeType: 'audio/wav', buffer: crest });
await limited.locator('[data-inspection=ready]').waitFor();
await addStep(limited, 'normalize');
await setRange(limited, 'True-peak ceiling (dBTP) slider', -1);
await limited.getByRole('combobox', { name: 'Format', exact: true }).selectOption('wav');
await limited.getByRole('button', { name: 'Export', exact: true }).click();
await limited.getByRole('link', { name: 'Download', exact: true }).waitFor({ timeout: 60000 });
const limitedMessage = limited.getByText(/Peak ceiling limited loudness\. Achieved -?\d+\.\d LUFS at -?\d+\.\d dBTP\./);
await limitedMessage.waitFor();
observations.limited = await limitedMessage.innerText();
await capture(limited, '06-ceiling-limited');

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on('pageerror', error => errors.push(error.message));
await mobile.goto(appUrl);
await mobile.getByLabel('Choose audio or video files').setInputFiles('tests/fixtures/tone.wav');
await mobile.locator('[data-inspection=ready]').waitFor();
await addStep(mobile, 'normalize');
await mobile.getByRole('slider', { name: 'Loudness target', exact: true }).waitFor();
assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile rail must not overflow');
await capture(mobile, '07-mobile-loudness');

assert.deepEqual(errors, []);
observations.pageErrors = errors;
await writeFile(`${root}/browser-check.json`, JSON.stringify(observations, null, 2) + '\n');
console.log('PASS: Chrome drove both normalize modes, rail marks/keyboard steps, compressor controls and ordered MP3 export; ceiling-limited result displayed with no page errors.');
await browser.close();
