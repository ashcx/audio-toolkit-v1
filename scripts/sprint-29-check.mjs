import { mkdir, writeFile } from 'node:fs/promises';
import { loadCopy, launchChrome, reporter, startApp, withoutTimes } from './lib/harness.mjs';

const copy = await loadCopy();
const root = process.env.SPRINT29_EVIDENCE_DIR ?? 'docs/sprint-evidence/sprint-29';
await mkdir(`${root}/captures`, { recursive: true });
const { check, note, lines, failures } = reporter();

/** Stereo speech-like bursts so peaks have clear gaps and a known loud burst at a known time. */
function wav(seconds, rate = 44100) {
  const frames = rate * seconds, bytes = Buffer.alloc(44 + frames * 4);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 4, 28); bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / rate, burst = Math.max(0, Math.sin((2 * Math.PI * t) / 3)) ** 1.5;
    const value = Math.round(0.7 * burst * Math.sin(2 * Math.PI * (180 + 60 * Math.sin(3 * t)) * t) * 32767);
    bytes.writeInt16LE(value, 44 + frame * 4); bytes.writeInt16LE(Math.round(value * 0.8), 46 + frame * 4);
  }
  return bytes;
}
const files = [
  { name: 'interview-take-3.wav', mimeType: 'audio/wav', buffer: wav(20) },
  { name: 'room-tone-b.wav', mimeType: 'audio/wav', buffer: wav(14) },
];

const app = await startApp();
const browser = await launchChrome(['--autoplay-policy=no-user-gesture-required']);
const errors = [];
const open = async (scheme, width, height = 900) => {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(app.url);
  await page.getByRole('heading', { name: 'Audio Toolkit' }).waitFor();
  await page.locator('input[type=file]').setInputFiles(files);
  await page.waitForFunction(() => [...document.querySelectorAll('li[data-inspection]')].length === 2 && [...document.querySelectorAll('li[data-inspection]')].every(li => li.dataset.inspection === 'ready'), null, { timeout: 30000 });
  return { context, page };
};
const row = (page, name) => page.locator('li', { hasText: name });
/** Peaks are drawn when many canvas columns carry ink well above the plain seek rail. */
const drawn = (page, rowName, index = 0) => page.waitForFunction(({ rowName, index }) => {
  const li = [...document.querySelectorAll('li')].find(item => item.textContent.includes(rowName));
  const canvas = li?.querySelectorAll('.wave-track canvas')[index];
  if (!canvas || !canvas.width) return false;
  const g = canvas.getContext('2d'), { width, height } = canvas, data = g.getImageData(0, 0, width, height).data;
  let tall = 0;
  for (let x = 0; x < width; x += 2) {
    let low = height, high = -1;
    for (let y = 0; y < height; y++) if (data[(y * width + x) * 4 + 3] > 0) { low = Math.min(low, y); high = Math.max(high, y); }
    if (high - low > 12 * (devicePixelRatio || 1)) tall++;
  }
  return tall > 20;
}, { rowName, index }, { timeout: 30000 });
const box = async locator => (await locator.boundingBox());
const shot = (page, name) => page.screenshot({ path: `${root}/captures/${name}.png`, fullPage: true });
const trackPoint = async (page, rowName, fraction, y = 0.5) => {
  const track = await box(row(page, rowName).locator('.wave-track').first());
  return { x: track.x + track.width * fraction, y: track.y + track.height * y };
};

{
  const { context, page } = await open('dark', 1280);
  const a = 'interview-take-3.wav', b = 'room-tone-b.wav';
  await drawn(page, a); await drawn(page, b);
  check('29-02 both source rows draw real peaks', true);
  check('29-03 compact rows have no handles, so a stray tap cannot trim', (await page.locator('.wave-handle').count()) === 0);
  const compact = await box(row(page, a).locator('.wave-track'));
  check('compact waveform is 44px tall', Math.round(compact.height) === 44, compact.height);
  await shot(page, '01-compact-dark');

  await row(page, a).getByRole('button', { name: copy.wave.trimLabel(a) }).click();
  await page.waitForTimeout(500);
  const editing = await box(row(page, a).locator('.wave-track'));
  check('Trim grows only that row to 130px', Math.round(editing.height) === 130 && Math.round((await box(row(page, b).locator('.wave-track'))).height) === 44, editing.height);
  check('edit mode shows start and end handles', (await page.locator('.wave-handle').count()) === 2);
  check('Trim button turns into Done', await row(page, a).getByRole('button', { name: copy.wave.doneLabel(a) }).count() === 1);

  const dragHandle = async (which, toFraction) => {
    const handle = await box(row(page, a).locator(`.wave-handle[data-handle=${which}]`));
    const target = await trackPoint(page, a, toFraction);
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x, handle.y + handle.height / 2, { steps: 12 });
    await page.mouse.up();
  };
  await dragHandle('start', 0.25); await dragHandle('end', 0.75);
  await page.waitForTimeout(300);
  const fields = await row(page, a).locator('.wave-fields input').evaluateAll(list => list.map(input => input.value));
  check('dragging both handles sets Start near 5 s and End near 15 s', /^0?0:0[45]/.test(fields[0]) && /^0?0:1[45]/.test(fields[1]), JSON.stringify(fields));
  check('the dragged file shows Custom range and Reset', await row(page, a).getByText(copy.wave.custom).count() === 1 && await row(page, a).getByRole('button', { name: copy.wave.resetLabel(a) }).count() === 1);
  check('the other file is untouched', await row(page, b).getByText(copy.wave.custom).count() === 0);
  const summary = await row(page, a).locator('.file-name small').first().innerText();
  check('the file summary follows the range', /00:05 to 00:15/.test(summary), summary);

  const lineColour = await page.evaluate(() => {
    const probe = document.createElement('i'); probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--trim-line'); document.body.append(probe);
    const colour = getComputedStyle(probe).color; probe.remove(); return colour;
  });
  const lines = await row(page, a).locator('.wave-track canvas').first().evaluate(canvas => {
    const g = canvas.getContext('2d'), { width, height } = canvas, data = g.getImageData(0, 0, width, height).data, found = [];
    const light = (x, y) => { const at = (y * width + x) * 4; return data[at] + data[at + 1] + data[at + 2] > 600 && data[at + 3] > 200; };
    for (let x = 0; x < width; x++) if (light(x, Math.round(height * 0.2)) && light(x, Math.round(height * 0.8))) found.push(x);
    const clusters = found.filter((x, i) => i === 0 || x - found[i - 1] > 2);
    return { columns: found.length, clusters, width };
  });
  check('29 a start line and an end line are drawn full height in the contrast colour', lines.clusters.length === 2, JSON.stringify({ lineColour, ...lines }));
  await shot(page, '02-edit-custom-range-dark');

  note('scrub while playing');
  const player = row(page, a).locator('.wave-player').first();
  await player.locator('.wave-play').click();
  await page.waitForFunction(() => !document.querySelector('.wave-player audio').paused && document.querySelector('.wave-player audio').currentTime > 0.2);
  await page.evaluate(() => {
    const audio = document.querySelector('.wave-player audio'); audio.volume = 0.01;
    window.__scrub = { pause: 0, seeked: [] };
    audio.addEventListener('pause', () => { window.__scrub.pause++; });
    audio.addEventListener('seeked', () => window.__scrub.seeked.push(audio.currentTime));
  });
  const from = await trackPoint(page, a, 0.2, 0.9), to = await trackPoint(page, a, 0.85, 0.9);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  const samples = [];
  for (let step = 1; step <= 40; step++) {
    await page.mouse.move(from.x + (to.x - from.x) * step / 40, from.y);
    await page.waitForTimeout(16);
    if (step % 10 === 0) samples.push(await page.evaluate(() => ({ playhead: document.querySelector('.wave-playhead').style.transform, t: document.querySelector('.wave-player audio').currentTime })));
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  const result = await page.evaluate(() => ({ ...window.__scrub, paused: document.querySelector('.wave-player audio').paused, t: document.querySelector('.wave-player audio').currentTime, duration: document.querySelector('.wave-player audio').duration }));
  const target = 0.85 * result.duration;
  check('29-03 playback never pauses during or after a scrub', result.pause === 0 && !result.paused, JSON.stringify({ pause: result.pause, paused: result.paused }));
  check('29-03 the audio follows the pointer with several seeks and ends where it was released', result.seeked.length >= 3 && result.t >= target - 0.2 && result.t <= target + 1.2, JSON.stringify({ seeks: result.seeked.length, t: result.t, target }));
  check('29-03 seeks during the drag only move forward with the pointer (no snap back)', result.seeked.every((value, index) => index === 0 || value >= result.seeked[index - 1] - 0.25), JSON.stringify(result.seeked.map(v => +v.toFixed(2))));
  check('29-03 the playhead moved during the drag', new Set(samples.map(s => s.playhead)).size >= 3, JSON.stringify(samples));
  await player.locator('.wave-play').click();

  await row(page, a).getByRole('button', { name: copy.wave.resetLabel(a) }).click();
  await page.waitForTimeout(200);
  check('Reset to Trim all removes the custom range', await row(page, a).getByText(copy.wave.custom).count() === 0);
  await dragHandle('start', 0.3);
  await page.waitForTimeout(200);
  const before = await row(page, a).locator('.wave-fields input').first().inputValue();
  const handle = await box(row(page, a).locator('.wave-handle[data-handle=start]'));
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down(); await page.mouse.move(handle.x + 80, handle.y + handle.height / 2, { steps: 6 });
  await page.evaluate(() => document.querySelector('.wave-handle[data-handle=start]').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })));
  await page.mouse.up();
  await page.waitForTimeout(200);
  const after = await row(page, a).locator('.wave-fields input').first().inputValue();
  check('29-03 pointer cancel puts the handle back where the gesture began', after === before, `${before} -> ${after}`);

  const startHandle = row(page, a).locator('.wave-handle[data-handle=start]');
  const read = () => row(page, a).locator('.wave-fields input').first().inputValue();
  const was = await read();
  await startHandle.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  check('29-03 arrow keys nudge a focused handle', (await read()) !== was, `${was} -> ${await read()}`);
  await row(page, a).getByRole('button', { name: copy.wave.doneLabel(a) }).click();
  await page.waitForTimeout(400);
  check('Done folds the row back and keeps the range', Math.round((await box(row(page, a).locator('.wave-track'))).height) === 44 && await row(page, a).getByText(copy.wave.custom).count() === 1);
  await shot(page, '03-compact-custom-dark');
  await row(page, a).getByRole('button', { name: copy.wave.resetLabel(a) }).click();

  note('Trim all conflicts');
  await row(page, a).getByRole('button', { name: copy.wave.trimLabel(a) }).click();
  await page.waitForTimeout(800);
  await dragHandle('end', 0.5);
  await page.getByLabel('Add step').selectOption('trim');
  await page.waitForTimeout(200);
  await page.getByLabel(copy.trim.startField(copy.trim.prefix), { exact: true }).fill('2');
  await page.waitForTimeout(300);
  check('29-03 editing Trim all while a file is custom asks before replacing', await page.getByText(copy.wave.conflict(1), { exact: true }).count() === 1);
  await shot(page, '04-trim-all-conflict-dark');
  await page.getByRole('button', { name: copy.wave.keep }).click();
  await page.waitForTimeout(200);
  check('Keep custom ranges leaves the custom range in place', await row(page, a).getByText(copy.wave.custom).count() === 1);
  await page.getByLabel(copy.trim.endField(copy.trim.prefix), { exact: true }).fill('18');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: copy.wave.replace }).click();
  await page.waitForTimeout(300);
  check('Replace custom ranges clears it and the file follows Trim all', await row(page, a).getByText(copy.wave.custom).count() === 0 && await row(page, a).getByText(copy.wave.follows).count() === 1);

  await row(page, b).getByRole('button', { name: copy.wave.trimLabel(b) }).click();
  await page.waitForTimeout(400);
  const handleB = await box(row(page, b).locator('.wave-handle[data-handle=end]'));
  const targetB = await trackPoint(page, b, 0.6);
  await page.mouse.move(handleB.x + handleB.width / 2, handleB.y + handleB.height / 2);
  await page.mouse.down(); await page.mouse.move(targetB.x, handleB.y + handleB.height / 2, { steps: 12 }); await page.mouse.up();
  await row(page, b).getByRole('button', { name: copy.wave.doneLabel(b) }).click();
  await row(page, a).getByRole('button', { name: copy.wave.doneLabel(a) }).click().catch(() => {});
  await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('wav');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('li[data-job-state=done]').length === 2, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const results = await page.locator('.file-result .wave-time').allInnerTexts();
  check('29 export honours each file range (Trim all 2 to 18 s gives 16 s, the custom file is shorter)', /\/ 00:16$/.test(results[0]) && /\/ 00:0[5-9]$/.test(results[1]), JSON.stringify(results));
  const resultLabels = await page.locator('.file-result').evaluateAll(list => list.map(node => node.querySelector('.wave-label').textContent));
  check('the exported waveform is labelled as the result, not the original', resultLabels.every(label => label === copy.result.label), JSON.stringify(resultLabels));
  await drawn(page, a, 0).catch(() => {});
  check('plain result rows still say only their label and player', withoutTimes(await page.locator('.file-result').first().innerText()) === copy.result.label);
  await shot(page, '05-exported-dark');
  await context.close();
}

{
  const { context, page } = await open('light', 1280);
  const cdp = await context.newCDPSession(page);
  const a = 'interview-take-3.wav';
  await drawn(page, a);
  const trimButton = () => row(page, a).getByRole('button', { name: copy.wave.trimLabel(a) });
  const doneButton = () => row(page, a).getByRole('button', { name: copy.wave.doneLabel(a) });
  const field = index => row(page, a).locator('.wave-fields input').nth(index).inputValue();
  const centre = async which => { const handle = await box(row(page, a).locator(`.wave-handle[data-handle=${which}]`)); return { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }; };
  const dragHandle = async (which, toFraction) => {
    const from = await centre(which), target = await trackPoint(page, a, toFraction);
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(target.x, from.y, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(300);
  };
  await trimButton().click(); await page.waitForTimeout(500);

  note('a drag cut short by Done while another pointer holds the handle');
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 7 }] });
  const start = await centre('start');
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x + 40, start.y, { steps: 4 });
  await doneButton().evaluate(button => button.click());
  await trimButton().evaluate(button => button.click());
  await page.waitForTimeout(500);
  const held = await field(0);
  const fresh = await centre('start'), target = await trackPoint(page, a, 0.4);
  await touch('touchStart', fresh.x, fresh.y);
  for (let step = 1; step <= 8; step++) await touch('touchMove', fresh.x + (target.x - fresh.x) * step / 8, fresh.y);
  await touch('touchEnd');
  await page.mouse.up();
  await page.waitForTimeout(300);
  check('29-03 a handle drag cut short by Done does not leave the player rejecting later presses', (await field(0)) !== held, `${held} -> ${await field(0)}`);

  note('a handle grabbed off its centre');
  const valueOf = async which => Number(await row(page, a).locator(`.wave-handle[data-handle=${which}]`).getAttribute('aria-valuenow'));
  const grabbed = await centre('start'), startValue = await valueOf('start');
  await page.mouse.move(grabbed.x + 16, grabbed.y); await page.mouse.down();
  await page.mouse.move(grabbed.x + 18, grabbed.y, { steps: 2 }); await page.mouse.up();
  await page.waitForTimeout(300);
  const trackWidth = (await box(row(page, a).locator('.wave-track'))).width;
  check('29-03 grabbing a handle off its centre does not make it jump to the pointer', Math.abs((await valueOf('start')) - startValue) < 3 / trackWidth * 20 + 0.05, `${startValue} -> ${await valueOf('start')} on ${trackWidth}px`);

  note('a Start dragged past the right edge');
  await dragHandle('start', 1.05);
  check('29-03 dragging Start past the right edge stops just short of End', (await valueOf('start')) >= 19.9, await valueOf('start'));
  await dragHandle('start', 0.5);
  check('29-03 a Start dragged to the far right can be dragged back with a pointer', Math.abs((await valueOf('start')) - 10) < 1, await valueOf('start'));

  note('compact touch scrolling');
  const touchAction = () => row(page, a).locator('.wave-track').evaluate(node => getComputedStyle(node).touchAction);
  check('29-03 the editing track and handles take every touch gesture', (await touchAction()) === 'none' && (await row(page, a).locator('.wave-handle').first().evaluate(node => getComputedStyle(node).touchAction)) === 'none');
  await doneButton().click(); await page.waitForTimeout(400);
  check('29-03 the compact track leaves vertical swipes to the page scroll', (await touchAction()) === 'pan-y', await touchAction());
  const seekFrom = await trackPoint(page, a, 0.3), seekTo = await trackPoint(page, a, 0.7);
  await page.mouse.move(seekFrom.x, seekFrom.y); await page.mouse.down();
  await page.evaluate(() => document.querySelector('.wave-track').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })));
  await page.mouse.up();
  await page.mouse.click(seekTo.x, seekTo.y);
  await page.waitForTimeout(400);
  const sought = await row(page, a).locator('audio').evaluate(audio => ({ t: audio.currentTime, duration: audio.duration }));
  check('29-03 a pointercancel during a seek leaves the next click seeking', Math.abs(sought.t - 0.7 * sought.duration) < 1.5, JSON.stringify(sought));

  await context.close();
}

{
  const { context, page } = await open('light', 1280);
  const a = 'interview-take-3.wav', b = 'room-tone-b.wav';
  await drawn(page, a); await drawn(page, b);
  await page.getByLabel('Add step').selectOption('gain');
  await page.waitForTimeout(200);
  await row(page, a).getByRole('button', { name: /^Preview/ }).click();
  await page.waitForSelector('.file-preview[data-preview-state=ready]', { timeout: 60000 });
  await page.evaluate(() => {
    const remove = FileSystemDirectoryHandle.prototype.removeEntry;
    FileSystemDirectoryHandle.prototype.removeEntry = async function (...args) { await new Promise(resolve => setTimeout(resolve, 1500)); return remove.apply(this, args); };
  });
  await row(page, b).getByRole('button', { name: copy.wave.trimLabel(b) }).click();
  await page.waitForTimeout(500);
  note('a drag while another file preview releases');
  await row(page, b).locator('.wave-track').scrollIntoViewIfNeeded();
  const handle = await box(row(page, b).locator('.wave-handle[data-handle=end]'));
  const first = await trackPoint(page, b, 0.8), last = await trackPoint(page, b, 0.3);
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down();
  await page.mouse.move(first.x, handle.y + handle.height / 2, { steps: 3 });
  await page.waitForTimeout(100);
  const midLocked = await row(page, b).locator('.wave-handle[data-handle=end]').getAttribute('aria-disabled');
  await page.mouse.move(last.x, handle.y + handle.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(2500);
  const endValue = Number(await row(page, b).locator('.wave-handle[data-handle=end]').getAttribute('aria-valuenow'));
  check('29-03 the handle is never shown locked while a preview of another file releases', midLocked === 'false', midLocked);
  check('29-03 a drag that starts a preview release still ends where the pointer was released', Math.abs(endValue - 0.3 * 14) < 1, endValue);
  await context.close();
}

for (const [scheme, width, name] of [['light', 1280, '06-desktop-light'], ['light', 320, '07-320-light'], ['dark', 320, '08-320-dark']]) {
  const { context, page } = await open(scheme, width);
  const a = 'interview-take-3.wav';
  await drawn(page, a);
  await row(page, a).getByRole('button', { name: copy.wave.trimLabel(a) }).click();
  await page.waitForTimeout(500);
  const handle = await box(row(page, a).locator('.wave-handle[data-handle=start]'));
  const target = await trackPoint(page, a, 0.3);
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down(); await page.mouse.move(target.x, handle.y + handle.height / 2, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${name} has no horizontal page scroll`, overflow <= 0, overflow);
  const tight = await page.evaluate(() => {
    const list = document.querySelector('.file-list').getBoundingClientRect();
    return [...document.querySelectorAll('.wave-handle, .wave-fields input, .wave-play, .wave-trim')].filter(el => { const b = el.getBoundingClientRect(); return b.left < list.left - 1 || b.right > list.right + 1; }).length;
  });
  check(`${name} keeps handles, fields and buttons inside the file list`, tight === 0, tight);
  const targets = await page.evaluate(() => [...document.querySelectorAll('.wave-handle, .wave-play, .wave-trim, .wave-fields input')].map(el => { const b = el.getBoundingClientRect(); return Math.min(b.width, b.height); }));
  check(`${name} touch targets are at least 44px`, targets.every(size => size >= 43.5), JSON.stringify(targets));
  await shot(page, name);
  await context.close();
}

check('no page errors during the run', errors.length === 0, errors.join(' | '));
await browser.close(); await app.close();
await writeFile(`${root}/sprint-29-check.json`, JSON.stringify({ lines, failures }, null, 2));
if (failures.length) { console.error(`FAIL: ${failures.length} check(s) failed`); process.exit(1); }
console.log(`PASS: ${lines.filter(line => !line.note).length} checks in Chrome, evidence in ${root}`);
