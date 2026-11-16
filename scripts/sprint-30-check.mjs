import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { engines, launchOptions } from './lib/engines.mjs';
import { loadCopy, reporter, startApp } from './lib/harness.mjs';

const copy = await loadCopy();
const root = process.env.SPRINT30_EVIDENCE_DIR ?? 'docs/sprint-evidence/sprint-30';
await mkdir(`${root}/captures`, { recursive: true });
const args = process.argv.slice(2);
const baselineJson = await readFile(`${root}/baseline-measurements.json`, 'utf8');
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

const shot = (page, name) => page.screenshot({ path: `${root}/captures/${name}.png`, fullPage: true });
const dragFile = (page, selector, type) => page.evaluateHandle(() => {
  const data = new DataTransfer();
  data.items.add(new File([new Uint8Array(8)], 'dropped.wav', { type: 'audio/wav' }));
  return data;
}).then(async data => { await page.locator(selector).dispatchEvent(type, { dataTransfer: data }); await data.dispose(); });


const open = async row => {
  const toggle = row.locator('.file-toggle');
  if (await toggle.count() && await toggle.getAttribute('aria-expanded') === 'false') { await toggle.click(); await row.page().waitForTimeout(350); }
};
const rowAt = (page, index) => page.locator('li[data-file-id]').nth(index);
const audioState = (row) => row.locator('audio').evaluate(audio => ({ src: audio.src, time: audio.currentTime, paused: audio.paused, ready: audio.readyState }));
const switchView = (row, optionLabel) => row.evaluate((li, wanted) => new Promise(resolve => {
  const audio = li.querySelector('audio'), before = { src: audio.src, time: audio.currentTime, paused: audio.paused };
  const radio = [...li.querySelectorAll('.view-switch input')].find(input => input.parentElement.textContent === wanted);
  const report = () => resolve({ before, after: { src: audio.src, time: audio.currentTime, paused: audio.paused }, audios: li.querySelectorAll('audio').length });
  radio.click();
  if (before.paused) setTimeout(report, 700);
  else audio.addEventListener('playing', () => setTimeout(report, 0), { once: true });
}), optionLabel);
const baselineRow = name => JSON.parse(baselineJson).viewports[name]?.finishedRow;
const near = (a, b, tolerance = 0.25) => Math.abs(a - b) <= tolerance;
const setTrimAll = async (page, start, end) => {
  await page.getByLabel(copy.trim.startField(copy.trim.prefix), { exact: true }).fill(String(start));
  await page.getByLabel(copy.trim.endField(copy.trim.prefix), { exact: true }).fill(String(end));
  await page.waitForTimeout(300);
};
const seekAndPlay = async (row, seconds) => {
  await row.locator('audio').evaluate((audio, time) => { audio.currentTime = time; }, seconds);
  await row.locator('audio').evaluate(audio => new Promise(resolve => { if (audio.seeking) audio.addEventListener('seeked', resolve, { once: true }); else resolve(); }));
};

const tasks = {
  async T1({ browser, app, check, note }) {
    for (const viewport of VIEWPORTS) {
      const label = `T1 ${viewport.name}`;
      const touchViewport = viewport.width <= 768;
      for (const touch of touchViewport ? [false, true] : [false]) {
        const mode = touch ? 'coarse' : 'fine';
        const { context, page, errors } = await openApp(browser, app, viewport, { touch });
        const empty = await metrics(page);
        check(`${label} ${mode} empty: one file input`, await page.locator('input[type=file]').count() === 1);
        check(`${label} ${mode} empty: Add files button in the heading is 44px or taller`, empty.addHeight >= 44, empty.addHeight);
        const limit = touch ? 140 : 180;
        check(`${label} ${mode} empty: drop box at most ${limit}px (was ${viewport.width <= 800 ? 220 : 240})`, empty.emptyBoxHeight <= limit, empty.emptyBoxHeight);
        const hint = await page.locator('.dropzone small').isVisible();
        check(`${label} ${mode} empty: drop hint ${touch ? 'hidden' : 'shown'}`, hint === !touch);
        check(`${label} ${mode} empty: dragging over the panel shows the active border`, await (async () => {
          await dragFile(page, '.files-panel', 'dragenter');
          const on = await page.locator('.files-panel[data-dragging]').count() === 1
            && await page.locator('.files-panel').evaluate(el => getComputedStyle(el).borderTopColor) === await page.evaluate(() => { const probe = document.createElement('i'); probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent'); document.body.append(probe); const colour = getComputedStyle(probe).color; probe.remove(); return colour; });
          await dragFile(page, '.files-panel', 'dragleave');
          return on && await page.locator('.files-panel[data-dragging]').count() === 0;
        })());
        if (!touch) {
          if (viewport.name === '375') await shot(page, 't1-375-before');
          await page.locator('input[type=file]').setInputFiles(['tests/fixtures/tone.wav']);
        } else {
          const chooser = page.waitForEvent('filechooser');
          await page.locator('.dropzone').tap();
          await (await chooser).setFiles('tests/fixtures/tone.wav');
        }
        await page.waitForFunction(() => document.querySelector('li[data-inspection=ready]'));
        await page.waitForTimeout(250);
        const listed = await metrics(page);
        note(`${label} ${mode} measured: empty box ${empty.emptyBoxHeight}px, Add files ${listed.addHeight}px, first row offset ${listed.firstRowOffset}px`);
        check(`${label} ${mode} listed: no dashed drop box`, await page.locator('.dropzone').count() === 0);
        check(`${label} ${mode} listed: exactly one file input`, await page.locator('input[type=file]').count() === 1);
        check(`${label} ${mode} listed: Add files button is 44px or taller`, listed.addHeight >= 44, listed.addHeight);
        const heading = await page.evaluate(() => {
          const add = document.querySelector('.add-files').getBoundingClientRect(), count = document.querySelector('.count').getBoundingClientRect(), title = document.querySelector('#files-title').getBoundingClientRect();
          return { sameRow: Math.abs((add.top + add.height / 2) - (count.top + count.height / 2)) < 2 && Math.abs((add.top + add.height / 2) - (title.top + title.height / 2)) < 2, countLeftOfAdd: count.right <= add.left };
        });
        check(`${label} ${mode} listed: Add files sits in the heading row beside the count`, heading.sameRow && heading.countLeftOfAdd, JSON.stringify(heading));
        check(`${label} ${mode} listed: first file row starts within 80px of the panel top (was 135)`, listed.firstRowOffset <= 80, listed.firstRowOffset);
        check(`${label} ${mode} listed: no horizontal overflow`, listed.overflow <= 0, listed.overflow);
        if (viewport.name === '375' && touch) await shot(page, 't1-375');
        const chooser = page.waitForEvent('filechooser');
        await (touch ? page.locator('.add-files').tap() : page.locator('.add-files').click());
        await (await chooser).setFiles('tests/fixtures/tone.mp3');
        await page.waitForFunction(() => document.querySelectorAll('li[data-inspection=ready]').length === 2);
        check(`${label} ${mode} listed: ${touch ? 'tapping' : 'clicking'} Add files opens the chooser and adds the file`, await page.locator('li[data-file-id]').count() === 2);
        const before = await page.locator('li[data-file-id]').count();
        await dragFile(page, '.files-panel', 'dragenter');
        await dragFile(page, '.files-panel', 'drop');
        await page.waitForFunction(count => document.querySelectorAll('li[data-file-id]').length > count, before, { timeout: 10000 }).catch(() => {});
        check(`${label} ${mode} listed: dropping on the panel adds the file`, await page.locator('li[data-file-id]').count() === before + 1);
        check(`${label} ${mode} listed: drag state clears after the drop`, await page.locator('.files-panel[data-dragging]').count() === 0);
        if (!touch) {
          await page.keyboard.press('Tab');
          await page.evaluate(() => document.querySelector('input[type=file]').focus());
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          const ring = await page.evaluate(() => {
            const input = document.querySelector('input[type=file]');
            const style = getComputedStyle(input.closest('.add-files'));
            return { focused: document.activeElement === input, width: parseFloat(style.outlineWidth), kind: style.outlineStyle };
          });
          check(`${label} ${mode} keyboard focus on the button shows a visible ring`, ring.focused && ring.width >= 2 && ring.kind !== 'none', JSON.stringify(ring));
        }
        check(`${label} ${mode} no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
    }
    note('WebKit not run: not installed');
  },

  async T2({ browser, app, check, note }) {
    for (const viewport of VIEWPORTS) {
      const label = `T2 ${viewport.name}`;
      const wide = viewport.width > 800;
      {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, Array.from({ length: 8 }, (_, index) => fixture(`take-${index + 1}.wav`, 5)));
        await page.waitForTimeout(300);
        const list = await page.evaluate(() => {
          const list = document.querySelector('.file-list'), style = getComputedStyle(list), item = getComputedStyle(list.querySelector('li')), panel = getComputedStyle(document.querySelector('.files-panel'));
          return {
            overflowY: style.overflowY, gutter: style.scrollbarGutter, maxHeight: style.maxHeight, scrolls: list.scrollHeight > list.clientHeight + 1, listHeight: list.clientHeight,
            documentScrolls: document.documentElement.scrollHeight > innerHeight + 1,
            rowPadding: [item.paddingTop, item.paddingBottom], rowGap: [item.rowGap, item.columnGap], panelPadding: panel.paddingLeft,
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
        check(`${label} row padding is 8px with 4px gaps`, list.rowPadding.every(value => value === '8px') && list.rowGap.every(value => value === '4px'), JSON.stringify(list));
        check(`${label} panel padding is ${wide ? 16 : 12}px`, list.panelPadding === `${wide ? 16 : 12}px`, list.panelPadding);
        if (wide) {
          check(`${label} the list keeps its inner scroll at its max height`, list.overflowY === 'auto' && list.maxHeight === '580px' && list.scrolls && list.listHeight <= 580, JSON.stringify(list));
          check(`${label} the list reserves no scrollbar gutter`, list.gutter === 'auto', list.gutter);
        } else {
          check(`${label} 8 files: the page scrolls and .file-list is overflow-y visible`, list.overflowY === 'visible' && list.maxHeight === 'none' && !list.scrolls && list.documentScrolls, JSON.stringify(list));
        }
        check(`${label} 8 files: no horizontal overflow`, list.overflow <= 0, list.overflow);
        check(`${label} 8 files: no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
      {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, [fixture(LONG_NAME, 12)]);
        await exportAll(page, 1);
        await page.getByLabel('Add step').selectOption('gain');
        await page.waitForFunction(() => document.querySelector('li[data-job-state=done] .file-actions button:not(.icon-button)') || document.querySelector('li[data-job-state=done] .file-toggle'), null, { timeout: 10000 });
        await open(page.locator('li[data-job-state=done]'));
        await page.waitForSelector('li[data-job-state=done] .file-actions button:not(.icon-button)');
        await page.waitForTimeout(300);
        const row = await page.evaluate(() => {
          const li = document.querySelector('li[data-job-state=done]');
          const text = li.querySelector('.file-name-text');
          const controls = [...li.querySelectorAll('button, a')].filter(element => element.getClientRects().length).map(element => {
            const box = element.getBoundingClientRect();
            return { name: element.getAttribute('aria-label') ?? element.textContent.trim(), width: Math.round(box.width * 10) / 10, height: Math.round(box.height * 10) / 10 };
          });
          return {
            nameChars: text.textContent.length, textHeight: text.getBoundingClientRect().height, ellipsised: text.scrollWidth > text.clientWidth,
            preview: !!li.querySelector('.file-actions button:not(.icon-button)'), download: !!li.querySelector('.download-button'), remove: !!li.querySelector('[data-remove-file]'),
            small: controls.filter(control => control.width < 43.5 || control.height < 43.5),
            rowHeight: li.getBoundingClientRect().height, overflow: document.documentElement.scrollWidth - innerWidth,
            titled: li.querySelector('.file-name').title === text.textContent,
          };
        });
        check(`${label} long name: Preview, download and Remove are all present`, row.preview && row.download && row.remove, JSON.stringify(row));
        check(`${label} long name: ${row.nameChars} characters render on one line, at most 22px tall`, row.nameChars >= 60 && row.textHeight <= 22, row.textHeight);
        check(`${label} long name: the full name is in title`, row.titled);
        if (viewport.width <= 375) check(`${label} long name: the name is cut with an ellipsis`, row.ellipsised);
        check(`${label} long name: every button and link is at least 44x44`, row.small.length === 0, JSON.stringify(row.small));
        check(`${label} long name: no horizontal overflow`, row.overflow <= 0, row.overflow);
        note(`${label} measured: finished row with a 60-character name and Preview ${row.rowHeight}px`);
        if (viewport.name === '320') await shot(page, 't2-320');
        check(`${label} long name: no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
    }
    note('WebKit not run: not installed');
  },

  async T3({ browser, app, check, note }) {
    const band = (page, scope) => page.locator(scope).evaluate(player => {
      const box = selector => { const element = player.querySelector(selector); if (!element) return null; const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const play = box('.wave-play'), track = box('.wave-track'), trim = box('.wave-trim'), own = player.getBoundingClientRect();
      const parts = [play, track, trim].filter(Boolean);
      return {
        sameBand: parts.every(part => Math.abs(part.top - parts[0].top) < 1.5 && Math.abs(part.bottom - parts[0].bottom) < 1.5),
        order: play.right <= track.left + 0.5 && (!trim || track.right <= trim.left + 0.5),
        bandHeight: Math.max(...parts.map(part => part.height)), height: own.height, waveWidth: track.width,
        labels: player.querySelectorAll('.wave-label, .wave-time').length,
        playLabel: player.querySelector('.wave-play').getAttribute('aria-label'),
      };
    });
    for (const viewport of VIEWPORTS) {
      const label = `T3 ${viewport.name}`;
      const minimum = viewport.width >= 375 ? 190 : 140;
      const { context, page, errors } = await openApp(browser, app, viewport);
      await addFiles(page, [fixture('tone-20.wav', 20), fixture('tone-b.wav', 12)]);
      await page.waitForTimeout(400);
      const first = 'li[data-file-id]:nth-child(1) .file-player .wave-player';
      const ready = await band(page, first);
      check(`${label} ready file: play, waveform and Trim share one 44px band`, ready.sameBand && ready.order && ready.bandHeight <= 44.5, JSON.stringify(ready));
      check(`${label} ready file: player block at most 52px tall`, ready.height <= 52, ready.height);
      check(`${label} ready file: waveform at least ${minimum}px wide`, ready.waveWidth >= minimum, ready.waveWidth);
      check(`${label} ready file: no visible label or readout, the label is spoken`, ready.labels === 0 && ready.playLabel === copy.wave.play(copy.files.original, 'tone-20.wav'), JSON.stringify(ready));
      check(`${label} ready file: no horizontal overflow`, (await metrics(page)).overflow <= 0);
      note(`${label} measured: player ${ready.height}px tall, waveform ${ready.waveWidth}px wide beside Trim (baseline unprocessed waveform ${viewport.width === 320 ? 218 : viewport.width === 375 ? 273 : viewport.width === 768 ? 666 : viewport.width === 1024 ? 402 : 514}px)`);
      if (viewport.name === '375') await shot(page, 't3-375-ready');

      await page.locator('li[data-file-id]:nth-child(1)').getByRole('button', { name: copy.wave.trimLabel('tone-20.wav') }).click();
      await page.waitForTimeout(500);
      const editing = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('li[data-file-id]')], list = document.querySelector('.file-list').getBoundingClientRect();
        const track = row => Math.round(row.querySelector('.wave-track').getBoundingClientRect().height);
        const handles = [...rows[0].querySelectorAll('.wave-handle')].map(handle => { const r = handle.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
        const trackBox = rows[0].querySelector('.wave-track').getBoundingClientRect();
        const done = rows[0].querySelector('.wave-trim').getBoundingClientRect(), play = rows[0].querySelector('.wave-play').getBoundingClientRect();
        return {
          editTrack: track(rows[0]), otherTrack: track(rows[1]), handles: handles.length,
          clipped: handles.filter(handle => handle.left < list.left - 1 || handle.right > list.right + 1 || handle.left < 0 || handle.right > innerWidth || handle.top < trackBox.top - 8 || handle.bottom > trackBox.bottom + 8).length,
          stacked: play.bottom <= trackBox.top && done.bottom <= trackBox.top, overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      check(`${label} Trim grows only that row to the 130px editor`, editing.editTrack === 130 && editing.otherTrack === 44, JSON.stringify(editing));
      check(`${label} editing: two handles, none clipped, head row stacked above the track`, editing.handles === 2 && editing.clipped === 0 && editing.stacked, JSON.stringify(editing));
      check(`${label} editing: no horizontal overflow`, editing.overflow <= 0, editing.overflow);
      await page.locator('li[data-file-id]:nth-child(1)').getByRole('button', { name: copy.wave.doneLabel('tone-20.wav') }).click();
      await page.waitForTimeout(500);
      const folded = await band(page, first);
      check(`${label} Done folds the row back to the one-row band`, folded.sameBand && folded.bandHeight <= 44.5 && folded.height <= 52, JSON.stringify(folded));

      await exportAll(page, 2);
      await open(page.locator('li[data-file-id]:nth-child(1)'));
      const finished = await band(page, 'li[data-file-id]:nth-child(1) .file-player .wave-player');
      check(`${label} finished file: the result player is one 44px row, waveform at least ${minimum}px, no visible label`, finished.sameBand && finished.bandHeight <= 44.5 && finished.height <= 52 && finished.waveWidth >= minimum && finished.labels === 0 && finished.playLabel === copy.wave.play(copy.result.label, 'tone-20.wav'), JSON.stringify(finished));
      if (viewport.name === '375' || viewport.name === '320') await shot(page, `t3-${viewport.name}`);
      await page.getByLabel('Add step').selectOption('gain');
      await page.waitForFunction(() => document.querySelector('.file-actions button:not(.icon-button)'), null, { timeout: 10000 });
      check(`${label} an older result still says so in visible text and in the player label`, await page.locator('li[data-file-id]:nth-child(1) .file-result').innerText() === copy.result.olderLabel && (await band(page, 'li[data-file-id]:nth-child(1) .file-player .wave-player')).playLabel === copy.wave.play(copy.result.olderLabel, 'tone-20.wav'));
      await page.locator('li[data-file-id]:nth-child(1)').getByRole('button', { name: /^Preview/ }).click();
      await page.locator('[data-preview-state=ready]').waitFor({ timeout: 60000 });
      await page.waitForTimeout(400);
      const preview = await page.evaluate(() => {
        const players = [...document.querySelectorAll('.file-preview .wave-player')];
        return players.map(player => ({ layout: player.dataset.layout, label: player.querySelector('.wave-label')?.textContent, time: player.querySelector('.wave-time')?.textContent }));
      });
      check(`${label} preview players keep their label and a 00:00 / 00:10 style readout`, preview.length === 2 && preview[0].layout === 'labelled' && preview[0].label === copy.preview.before && preview[1].label === copy.preview.after && preview.every(player => /^\d\d:\d\d \/ \d\d:\d\d$/.test(player.time ?? '')), JSON.stringify(preview));
      check(`${label} no page errors`, errors.length === 0, errors.join('; '));
      await context.close();
    }
    note('WebKit not run: not installed');
  },

  async T4({ browser, app, check, note }) {
    const POSITION = /^\d\d:\d\d \/ \d\d:\d\d$/;
    for (const viewport of VIEWPORTS) {
      const label = `T4 ${viewport.name}`;
      {
        const { context, page, errors } = await openApp(browser, app, viewport);
        const long = { name: 'long-take.wav', mimeType: 'audio/wav', buffer: wav(195, 8000) };
        await addFiles(page, [long]);
        const row = page.locator('li[data-file-id]').first();
        const text = await row.innerText();
        check(`${label} 03:15 file: 03:15 appears once in the row text`, (text.match(/03:15/g) ?? []).length === 1, JSON.stringify(text));
        check(`${label} 03:15 file: the file line reads 00:00 / 03:15`, await row.locator('.file-position').innerText() === '00:00 / 03:15');
        check(`${label} 03:15 file: the live position is aria-hidden and the slider keeps its spoken position`, await row.locator('.file-position').getAttribute('aria-hidden') === 'true'
          && await row.locator('.wave-track').getAttribute('aria-valuetext') === copy.wave.position('00:00', '03:15'));
        await row.locator('.wave-play').click();
        await page.waitForFunction(() => !document.querySelector('.file-position').textContent.startsWith('00:00 /'), null, { timeout: 8000 });
        const playing = await row.locator('.file-position').innerText();
        await row.locator('.wave-play').click();
        check(`${label} 03:15 file: the position advances in the file line while it plays`, POSITION.test(playing) && !playing.startsWith('00:00 /') && playing.endsWith('/ 03:15'), playing);
        check(`${label} 03:15 file: the player row has no readout`, await row.locator('.wave-player .wave-time, .wave-player .wave-label').count() === 0);
        check(`${label} 03:15 file: no horizontal overflow, no page errors`, (await metrics(page)).overflow <= 0 && errors.length === 0, errors.join('; '));
        await context.close();
      }
      {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, [fixture('tone-20.wav', 20)]);
        await page.getByLabel('Add step').selectOption('trim');
        await page.getByLabel(copy.trim.startField(copy.trim.prefix), { exact: true }).fill('2');
        await page.getByLabel(copy.trim.endField(copy.trim.prefix), { exact: true }).fill('18');
        await page.waitForTimeout(400);
        const meta = await page.locator('li[data-file-id] .file-name small').first().innerText();
        check(`${label} Trim all: the kept duration and the range follow the position`, meta === '00:00 / 00:20 · 00:16 · 00:02 to 00:18', meta);
        if (viewport.name === '375') {
          await page.getByLabel('Add step').selectOption('gain');
          await page.getByRole('button', { name: /^Preview/ }).click();
          await page.locator('[data-preview-state=ready]').waitFor({ timeout: 60000 });
          await page.waitForTimeout(300);
          const previewing = await page.evaluate(() => ({
            position: document.querySelector('.file-position').textContent, hidden: document.querySelector('.file-position').getAttribute('aria-hidden'),
            readouts: [...document.querySelectorAll('.file-preview .wave-time')].map(node => node.textContent),
          }));
          check(`${label} open preview: the file line shows the total only and the preview players keep their own readout`, previewing.position === '00:20' && previewing.hidden === null && previewing.readouts.length === 2 && previewing.readouts.every(value => POSITION.test(value)), JSON.stringify(previewing));
        }
        check(`${label} Trim all: no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
      {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, [{ name: 'opaque.wav', mimeType: 'application/octet-stream', buffer: wav(12) }, fixture('tone-b.wav', 12)]);
        await page.waitForTimeout(300);
        const opaque = page.locator('li[data-file-id]').nth(0);
        check(`${label} unplayable source with no result: the file line shows the total only`, await opaque.locator('.file-position').innerText() === '00:12' && await opaque.locator('.wave-player').count() === 0 && await opaque.locator('.file-position').getAttribute('aria-hidden') === null);
        await exportAll(page, 2);
        const finished = await page.locator('li[data-file-id] .file-position').allInnerTexts();
        check(`${label} finished files: the position and total are read from .file-position`, finished.length === 2 && finished.every(value => POSITION.test(value)) && finished[1] === '00:00 / 00:12', JSON.stringify(finished));
        const second = page.locator('li[data-file-id]').nth(1);
        await second.locator('.file-player .wave-play').click();
        await page.waitForFunction(() => !document.querySelectorAll('li[data-file-id] .file-position')[1].textContent.startsWith('00:00 /'), null, { timeout: 8000 });
        const advanced = await second.locator('.file-position').innerText();
        await second.locator('.file-player .wave-play').click();
        check(`${label} finished file: playing the result advances the position in the file line`, POSITION.test(advanced) && !advanced.startsWith('00:00 /'), advanced);
        check(`${label} finished file: the result row has no readout`, await second.locator('.file-player .wave-time').count() === 0);
        if (viewport.name === '375') await shot(page, 't4-375');
        check(`${label} finished files: no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
      if (viewport.name === '375') {
        const { context, page } = await openApp(browser, app, viewport);
        await addFiles(page, ['tests/fixtures/tone.aac']);
        const unknown = page.locator('li[data-file-id]').first();
        check(`${label} unavailable duration stays a distinct message in the file line`, await unknown.locator('.file-position').innerText() === copy.trim.unknownDuration, await unknown.innerText());
        await context.close();
      }
    }
    note('WebKit not run: not installed');
  },
  async T5({ browser, app, check, note }) {
    for (const viewport of VIEWPORTS) {
      const label = `T5 ${viewport.name}`;
      const move = async (name, row, option) => {
        const moved = await switchView(row, option);
        note(`${name} measured: to ${option} ${moved.before.paused ? 'paused' : 'playing'} at ${moved.before.time.toFixed(2)} s, then ${moved.after.paused ? 'paused' : 'playing'} at ${moved.after.time.toFixed(2)} s`);
        return moved;
      };
      {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await page.addInitScript(() => { window.__peakWorkers = 0; const Native = window.Worker; window.Worker = class extends Native { constructor(url, options) { super(url, options); if (String(url).includes('peaks-worker')) window.__peakWorkers++; } }; });
        await page.reload();
        await page.getByRole('heading', { name: copy.app.title }).waitFor();
        await addFiles(page, [fixture('tone-20.wav', 20), { name: 'opaque.wav', mimeType: 'application/octet-stream', buffer: wav(12) }, fixture('tone-b.wav', 12)]);
        await exportAll(page, 3);
        await open(rowAt(page, 0));
        await open(rowAt(page, 1));
        const rows = await page.locator('li[data-file-id]').count();
        const audios = await page.locator('li[data-file-id]').evaluateAll(list => list.map(li => li.querySelectorAll('audio').length));
        check(`${label} finished files: exactly one audio per row`, rows === 3 && audios.every(count => count === 1), JSON.stringify(audios));
        const first = rowAt(page, 0), opaque = rowAt(page, 1);
        const href = await first.locator('a[download]').getAttribute('href');
        const shape = await first.evaluate(li => ({
          details: li.querySelectorAll('details').length, players: li.querySelectorAll('.wave-player').length,
          group: li.querySelector('.view-switch')?.getAttribute('role'),
          options: [...li.querySelectorAll('.view-switch label')].map(option => ({ text: option.textContent, checked: option.querySelector('input').checked, width: option.getBoundingClientRect().width, height: option.getBoundingClientRect().height })),
          resultBox: li.querySelectorAll('.file-result').length,
        }));
        check(`${label} finished file: one player and a two-option switch, Result chosen, no Original toggle`, shape.details === 0 && shape.players === 1 && shape.group === 'radiogroup' && shape.options.map(option => option.text).join('|') === 'Original|Result' && shape.options[1].checked && !shape.options[0].checked, JSON.stringify(shape));
        check(`${label} finished file: switch targets are at least 44x44`, shape.options.every(option => option.width >= 44 && option.height >= 44), JSON.stringify(shape.options));
        check(`${label} finished file: the Result view plays the download href and a plain result adds no extra line`, (await audioState(first)).src === href && shape.resultBox === 0);
        const row0 = await first.boundingBox();
        note(`${label} measured: finished row with player and switch ${Math.round(row0.height)}px (baseline ${JSON.stringify(baselineRow(viewport.name))})`);
        check(`${label} finished file: the row with player and switch is at most 176px`, row0.height <= 176, row0.height);
        check(`${label} unplayable source with a playable result: the Result alone, no switch`, await opaque.locator('.view-switch').count() === 0 && await opaque.locator('audio').count() === 1 && (await audioState(opaque)).src === await opaque.locator('a[download]').getAttribute('href') && await opaque.locator('.file-note').count() === 0);
        const playhead = await opaque.evaluate(li => {
          const track = li.querySelector('.wave-track').getBoundingClientRect(), play = li.querySelector('.wave-play').getBoundingClientRect(), trim = li.querySelector('.wave-trim').getBoundingClientRect();
          const head = li.querySelector('.wave-playhead'), line = getComputedStyle(head, '::before'), dot = getComputedStyle(head, '::after'), x = head.getBoundingClientRect().left;
          return { gapToPlay: x - 6 - play.right, gapToTrimAtEnd: trim.left - (track.right + 6), lineTop: parseFloat(line.top), lineBottom: parseFloat(line.bottom), dotTop: parseFloat(dot.top), dotBottom: track.height - parseFloat(dot.top) - 12 };
        });
        check(`${label} playhead at 00:00 keeps a gap to the play button and stays inside the track's height`, playhead.gapToPlay >= 4 && playhead.gapToTrimAtEnd >= 4 && playhead.lineTop >= 0 && playhead.lineBottom >= 0 && playhead.dotTop >= 0 && playhead.dotBottom >= 0, JSON.stringify(playhead));
        await first.scrollIntoViewIfNeeded();
        await page.waitForTimeout(800);
        const peaksResult = await page.evaluate(() => window.__peakWorkers);
        await first.getByLabel('Original', { exact: true }).check();
        await page.waitForTimeout(800);
        const original = await audioState(first);
        check(`${label} Original view: the audio plays the source object URL, not the download`, original.src.startsWith('blob:') && original.src !== href && await first.locator('audio').count() === 1, original.src);
        await first.getByLabel('Result', { exact: true }).check();
        await first.getByLabel('Original', { exact: true }).check();
        await first.getByLabel('Result', { exact: true }).check();
        await page.waitForTimeout(800);
        const peaksAfter = await page.evaluate(() => window.__peakWorkers);
        check(`${label} switching back and forth does not recompute peaks`, peaksAfter <= peaksResult + 1, `${peaksResult} then ${peaksAfter}`);

        await first.getByLabel('Original', { exact: true }).check();
        await page.waitForTimeout(500);
        await seekAndPlay(first, 10);
        await first.locator('.wave-play').click();
        await page.waitForFunction(() => { const a = document.querySelector('li[data-file-id] audio'); return !a.paused && a.currentTime > 10.1; });
        const playingSwitch = await move(label, first, 'Result');
        check(`${label} playing Original at 10 s: Result continues within 0.25 s of 10 s`, !playingSwitch.after.paused && playingSwitch.after.src === href && near(playingSwitch.after.time, playingSwitch.before.time) && playingSwitch.audios === 1, JSON.stringify(playingSwitch));
        const backPlaying = await move(label, first, 'Original');
        check(`${label} playing Result: Original continues within 0.25 s`, !backPlaying.after.paused && near(backPlaying.after.time, backPlaying.before.time) && backPlaying.audios === 1, JSON.stringify(backPlaying));
        await first.locator('.wave-play').click();
        await page.waitForFunction(() => document.querySelector('li[data-file-id] audio').paused);
        await seekAndPlay(first, 10);
        const pausedSwitch = await move(label, first, 'Result');
        check(`${label} paused at 10 s: Result stays paused at the mapped time`, pausedSwitch.after.paused && near(pausedSwitch.after.time, 10), JSON.stringify(pausedSwitch));
        const pausedBack = await move(label, first, 'Original');
        check(`${label} paused at 10 s: back to Original stays paused at 10 s`, pausedBack.after.paused && near(pausedBack.after.time, 10), JSON.stringify(pausedBack));
        await first.getByLabel('Original', { exact: true }).focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);
        check(`${label} the switch is a keyboard radio group: arrow key chooses Result`, await first.getByLabel('Result', { exact: true }).isChecked() && (await audioState(first)).src === href);

        await first.locator('.wave-play').click();
        await rowAt(page, 2).locator('.wave-play').click();
        await page.waitForTimeout(500);
        const playingNow = await page.locator('audio').evaluateAll(list => list.filter(audio => !audio.paused).length);
        check(`${label} playing another row pauses this one: exactly one audio is playing`, playingNow === 1, playingNow);
        await rowAt(page, 2).locator('.wave-play').click();
        if (viewport.name === '375') await shot(page, 't5-375');
        check(`${label} no horizontal overflow, no page errors`, (await metrics(page)).overflow <= 0 && errors.length === 0, errors.join('; '));
        await context.close();
      }
      {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, [fixture('tone-20.wav', 20)]);
        await page.getByLabel('Add step').selectOption('trim');
        await setTrimAll(page, 5, 15);
        await exportAll(page, 1);
        const row = rowAt(page, 0), href = await row.locator('a[download]').getAttribute('href');
        await open(row);
        await page.waitForFunction(() => Number.isFinite(document.querySelector('li[data-file-id] audio').duration));
        const length = await row.locator('audio').evaluate(audio => audio.duration);
        check(`${label} trimmed 5 to 15 s export is about 10 s long`, near(length, 10, 0.3), length);
        check(`${label} trimmed result: the file line total is the result length`, /^00:00 \/ 00:(09|10|11)$/.test(await row.locator('.file-position').innerText()), await row.locator('.file-position').innerText());
        await row.getByLabel('Original', { exact: true }).check();
        await page.waitForTimeout(500);
        await seekAndPlay(row, 12);
        await row.locator('.wave-play').click();
        await page.waitForFunction(() => { const a = document.querySelector('li[data-file-id] audio'); return !a.paused && a.currentTime > 12.1; });
        const toResult = await move(label, row, 'Result');
        check(`${label} trimmed, playing Original at 12 s: Result resumes at about 7 s`, !toResult.after.paused && toResult.after.src === href && near(toResult.after.time, toResult.before.time - 5), JSON.stringify(toResult));
        const toOriginal = await move(label, row, 'Original');
        check(`${label} trimmed, playing Result: Original resumes at the start plus 5 s`, !toOriginal.after.paused && near(toOriginal.after.time, toOriginal.before.time + 5), JSON.stringify(toOriginal));
        await row.locator('.wave-play').click();
        await page.waitForFunction(() => document.querySelector('li[data-file-id] audio').paused);
        await seekAndPlay(row, 12);
        const pausedResult = await move(label, row, 'Result');
        check(`${label} trimmed, paused at 12 s: Result stays paused at about 7 s`, pausedResult.after.paused && near(pausedResult.after.time, 7), JSON.stringify(pausedResult));
        const pausedOriginal = await move(label, row, 'Original');
        check(`${label} trimmed, paused at 7 s in Result: Original stays paused at about 12 s`, pausedOriginal.after.paused && near(pausedOriginal.after.time, 12), JSON.stringify(pausedOriginal));
        await row.getByLabel('Result', { exact: true }).check();
        await page.waitForTimeout(400);
        await setTrimAll(page, 9, 15);
        await seekAndPlay(row, 3);
        const older = await row.locator('.file-result').innerText();
        check(`${label} older settings: the visible Result (older settings) line stays`, older === copy.result.olderLabel, older);
        const olderBack = await move(label, row, 'Original');
        check(`${label} older settings: the job's start (5 s), not the current draft (9 s), maps the position`, near(olderBack.after.time, 8) && olderBack.after.paused, JSON.stringify(olderBack));
        await row.getByLabel('Result', { exact: true }).check();
        await page.waitForTimeout(400);
        await row.getByRole('button', { name: copy.wave.trimLabel('tone-20.wav') }).click();
        await page.waitForTimeout(400);
        const editing = await row.evaluate(li => ({ src: li.querySelector('audio').src, handles: li.querySelectorAll('.wave-handle').length, switch: li.querySelectorAll('.view-switch').length, audios: li.querySelectorAll('audio').length }));
        check(`${label} Trim in the Result view switches to Original and enters edit`, editing.src !== href && editing.src.startsWith('blob:') && editing.handles === 2 && editing.switch === 0 && editing.audios === 1, JSON.stringify(editing));
        await row.getByRole('button', { name: copy.wave.doneLabel('tone-20.wav') }).click();
        await page.waitForTimeout(400);
        check(`${label} Done keeps the Original view and brings the switch back`, await row.getByLabel('Original', { exact: true }).isChecked() && await row.locator('.view-switch').count() === 1);
        check(`${label} trimmed file: no horizontal overflow, no page errors`, (await metrics(page)).overflow <= 0 && errors.length === 0, errors.join('; '));
        await context.close();
      }
      if (viewport.name === '375' || viewport.name === '1024') {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await page.addInitScript(() => { const native = HTMLMediaElement.prototype.canPlayType; HTMLMediaElement.prototype.canPlayType = function (type) { return /mpeg|mp3/.test(type) ? '' : native.call(this, type); }; });
        await page.reload();
        await page.getByRole('heading', { name: copy.app.title }).waitFor();
        await addFiles(page, [fixture('tone-b.wav', 12)]);
        await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('mp3');
        await exportAll(page, 1);
        const row = rowAt(page, 0);
        const unplayable = await row.evaluate(li => ({ switch: li.querySelectorAll('.view-switch').length, audios: li.querySelectorAll('audio').length, text: li.querySelector('.file-result')?.textContent ?? '', src: li.querySelector('audio')?.src ?? '' }));
        check(`${label} unplayable result format: no switch, the Original plays alone and the download note shows`, unplayable.switch === 0 && unplayable.audios === 1 && unplayable.src.startsWith('blob:') && unplayable.text.includes(copy.files.resultUnplayable), JSON.stringify(unplayable));
        check(`${label} unplayable result: no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
    }
    note('WebKit not run: not installed');
  },
};

const app = await startApp();
const { check, note, lines, failures } = reporter();
const wanted = engines();
const selected = baseline ? [] : only ? [only] : Object.keys(tasks);
try {
  for (const [name, type] of wanted) {
    const browser = await type.launch({ ...launchOptions(name), args: ['--autoplay-policy=no-user-gesture-required'] });
    try {
      if (baseline) await runBaseline(app, browser);
      for (const id of selected) await tasks[id]({ browser, app, check, note });
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
if (only) await writeFile(`${root}/${only.toLowerCase()}.txt`, `${lines.map(line => `${line.note ? 'note' : line.ok ? 'ok  ' : 'FAIL'} ${line.name}${line.detail ? ` -- ${line.detail}` : ''}`).join('\n')}\n`);
if (!baseline) console.log(failures.length ? `FAIL: ${failures.length} of ${lines.filter(line => !line.note).length}` : `PASS: ${lines.filter(line => !line.note).length} checks`);
process.exit(failures.length ? 1 : 0);
