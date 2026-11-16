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
const issueFlag = args.indexOf('--issue');
const onlyIssue = issueFlag >= 0 ? args[issueFlag + 1] : null;
const issueRuns = number => onlyIssue === null || onlyIssue === String(number);
const flagValue = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : null; };

const VIEWPORTS = [
  { name: '320', width: 320, height: 700 },
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];
const LONG_NAME = 'field-recording-with-a-very-long-descriptive-name-take-7.wav';

function wav(seconds, rate = 44100) {
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
const fixture = (name, seconds) => ({ name, mimeType: 'audio/wav', buffer: wav(seconds) });
const FIXTURE_PATHS = ['tests/fixtures/tone.wav', 'tests/fixtures/tone.mp3', 'tests/fixtures/tone.flac'];

async function openApp(browser, app, viewport, { scheme = 'light', touch = false, reducedMotion = 'no-preference', init = null } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }, colorScheme: scheme, reducedMotion,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  for (const item of [].concat(init ?? [])) await context.addInitScript(item.script ?? item, item.arg);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(app.url);
  await page.getByRole('heading', { name: copy.app.title }).waitFor();
  return { context, page, errors };
}

const addFiles = async (page, files, count) => {
  await page.locator('input[type=file]').setInputFiles(files);
  await page.waitForFunction(n => {
    const rows = [...document.querySelectorAll('li[data-inspection]')];
    return rows.length >= n && rows.every(li => li.dataset.inspection === 'ready');
  }, count ?? files.length, { timeout: 30000 });
};

const exportAll = async (page, count) => {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.waitForFunction(n => document.querySelectorAll('li[data-job-state=done]').length === n, count, { timeout: 90000 });
  await page.waitForTimeout(300);
};

const metrics = page => page.evaluate(() => {
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

const THREE = () => [fixture('tone-20.wav', 20), fixture(LONG_NAME, 12), fixture('tone-15.wav', 15)];

const smallTargets = page => page.evaluate(() => {
  const selector = 'button, a[href], select, summary, input:not([type=file]), [role=slider], label';
  return [...document.querySelector('.files-panel').querySelectorAll(selector)]
    .filter(element => (element.tagName !== 'LABEL' || element.querySelector('input')) && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
    .map(element => { const box = element.getBoundingClientRect(); return { target: `${element.tagName.toLowerCase()}.${element.className.toString().split(' ')[0]} ${(element.getAttribute('aria-label') ?? element.textContent).trim().slice(0, 24)}`, width: Math.round(box.width * 10) / 10, height: Math.round(box.height * 10) / 10 }; })
    .filter(target => target.width < 43.5 || target.height < 43.5);
});

const listFacts = page => page.evaluate(() => {
  const panel = document.querySelector('.files-panel').getBoundingClientRect();
  const rows = [...document.querySelectorAll('.file-list li')].map(li => {
    const box = li.getBoundingClientRect(), result = li.querySelector('.file-result');
    return { height: box.height, resultHeight: result ? result.getBoundingClientRect().height : 0, top: box.top - panel.top, bottom: box.bottom, state: li.dataset.jobState ?? 'none' };
  });
  const list = document.querySelector('.file-list').getBoundingClientRect();
  const wave = document.querySelector('.wave-track');
  return { rows, listHeight: list.height, firstRowOffset: rows[0]?.top ?? null, waveWidth: wave ? wave.getBoundingClientRect().width : null, overflow: document.documentElement.scrollWidth - innerWidth };
});

async function threeFinished(page, probe = async () => ({})) {
  const result = { empty: (await metrics(page)).emptyBoxHeight };
  await addFiles(page, THREE());
  await page.waitForTimeout(400);
  result.unprocessed = { ...await listFacts(page), ...await probe('unprocessed') };
  await page.getByLabel('Add step').selectOption('trim');
  await setTrimAll(page, 2, 10);
  result.unprocessedWithPreview = await listFacts(page);
  await exportAll(page, 3);
  result.finished = { ...await listFacts(page), ...await probe('finished') };
  return result;
}

const T8_VIEWPORTS = VIEWPORTS.filter(viewport => ['320', '375', '1440'].includes(viewport.name));
const T8_SCHEMES = ['light', 'dark'];
const LIVE_POSITION = /^\d\d:\d\d \/ \d\d:\d\d$/;

const slowSource = delay => {
  const real = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true,
    get() { return this.__pendingSrc ?? real.get.call(this); },
    set(value) {
      this.__pendingSrc = value;
      this.removeAttribute('src');
      this.load();
      clearTimeout(this.__loadTimer);
      this.__loadTimer = setTimeout(() => { this.__pendingSrc = undefined; real.set.call(this, value); }, delay);
    },
  });
};
const delayedSource = delay => ({ script: slowSource, arg: delay });
const until = async (page, predicate, argument, timeout = 5000) => page.waitForFunction(predicate, argument, { timeout }).then(() => true, () => false);

const unknownDurationLive = async ({ browser, app, check, viewport, scheme }) => {
  const label = `T8 ${viewport.name} ${scheme} unknown duration`;
  const read = row => row.evaluate(li => {
    const audio = li.querySelector('audio'), text = li.querySelector('.file-position').textContent;
    return { text, valuetext: li.querySelector('.wave-track').getAttribute('aria-valuetext'), time: audio.currentTime, paused: audio.paused, duration: audio.duration };
  });
  const agrees = state => LIVE_POSITION.test(state.text) && state.text === state.valuetext.replace(' of ', ' / ');
  for (const mimeType of ['audio/aac', '']) {
    const kind = mimeType || 'empty mime';
    const { context, page, errors } = await openApp(browser, app, viewport, { scheme });
    await addFiles(page, [{ name: 'tone.aac', mimeType, buffer: await readFile('tests/fixtures/tone.aac') }]);
    const row = rowAt(page, 0);
    const first = await read(row);
    const lengthKnown = !first.valuetext.endsWith(copy.trim.unknownDuration);
    check(`${label} (${kind}): before it plays the line is ${copy.trim.unknownDuration} until the length is known, then the live total`, lengthKnown ? agrees(first) : first.text === copy.trim.unknownDuration, JSON.stringify(first));
    await row.locator('.wave-play').click();
    check(`${label} (${kind}): once the player measures the length the line shows the live position and total`, await until(page, () => /^\d\d:\d\d \/ \d\d:\d\d$/.test(document.querySelector('.file-position').textContent)), await row.locator('.file-position').innerText());
    await row.locator('audio').evaluate(audio => new Promise(resolve => { const poll = () => audio.currentTime > 0.5 || audio.paused ? requestAnimationFrame(() => requestAnimationFrame(resolve)) : requestAnimationFrame(poll); poll(); }));
    const playing = await read(row);
    check(`${label} (${kind}): while playing the line equals the slider position and total`, !playing.paused && agrees(playing) && !playing.text.startsWith('00:00'), JSON.stringify(playing));
    await row.locator('.wave-play').click();
    await page.waitForTimeout(200);
    const paused = await read(row);
    await page.waitForTimeout(300);
    const still = await read(row);
    check(`${label} (${kind}): after pause the line holds the paused position`, paused.paused && agrees(paused) && still.text === paused.text && still.time === paused.time, JSON.stringify({ paused, still }));
    await row.locator('audio').evaluate(audio => new Promise(resolve => { audio.addEventListener('seeked', resolve, { once: true }); audio.currentTime = 1.2; }));
    await page.waitForTimeout(150);
    const sought = await read(row);
    check(`${label} (${kind}): after a seek the line shows the new position`, agrees(sought) && sought.text.startsWith('00:01 /'), JSON.stringify(sought));
    await row.locator('.wave-play').click();
    await row.locator('audio').evaluate(audio => audio.ended || new Promise(resolve => { audio.addEventListener('ended', resolve, { once: true }); setTimeout(resolve, 4000); }));
    await page.waitForTimeout(250);
    const ended = await read(row);
    check(`${label} (${kind}): after the end the line shows the end position`, ended.paused && agrees(ended) && ended.text.startsWith('00:02 /'), JSON.stringify(ended));
    check(`${label} (${kind}): no page errors`, errors.length === 0, errors.join('; '));
    await context.close();
  }
  {
    const { context, page } = await openApp(browser, app, viewport, { scheme, init: delayedSource(1500) });
    await addFiles(page, [{ name: 'tone.aac', mimeType: 'audio/aac', buffer: await readFile('tests/fixtures/tone.aac') }]);
    const row = rowAt(page, 0);
    await page.waitForTimeout(400);
    const idle = await read(row);
    check(`${label} (metadata not loaded yet): the line is exactly ${copy.trim.unknownDuration}`, idle.text === copy.trim.unknownDuration && idle.valuetext.endsWith(copy.trim.unknownDuration) && Number.isNaN(idle.duration), JSON.stringify(idle));
    check(`${label} (metadata not loaded yet): loadedmetadata turns the line into the live position and total`, await until(page, () => /^00:00 \/ 00:02$/.test(document.querySelector('.file-position').textContent), null, 8000), await row.locator('.file-position').innerText());
    await context.close();
  }
  {
    const { context, page } = await openApp(browser, app, viewport, { scheme });
    await addFiles(page, [{ name: 'tone.wav', mimeType: 'application/octet-stream', buffer: await readFile('tests/fixtures/tone.wav') }]);
    const row = rowAt(page, 0);
    await page.waitForTimeout(300);
    check(`${label} (unplayable source): the line stays the static total with no player`, await row.locator('.file-position').innerText() === '00:02' && await row.locator('.wave-play').count() === 0, await row.innerText());
    await context.close();
  }
  {
    const probe = () => {
      const original = Blob.prototype.arrayBuffer;
      Blob.prototype.arrayBuffer = function (...inputs) { return new Promise(resolve => setTimeout(resolve, 500)).then(() => original.apply(this, inputs)); };
      window.__rowStates = [];
      new MutationObserver(() => {
        for (const li of document.querySelectorAll('li[data-inspection]')) window.__rowStates.push({ state: li.dataset.inspection, position: li.querySelector('.file-position') !== null });
      }).observe(document, { subtree: true, childList: true, attributes: true });
    };
    const { context, page } = await openApp(browser, app, viewport, { scheme, init: probe });
    await page.locator('input[type=file]').setInputFiles([{ name: 'tone.aac', mimeType: 'audio/aac', buffer: await readFile('tests/fixtures/tone.aac') }]);
    await until(page, () => document.querySelector('li[data-inspection]')?.dataset.inspection === 'ready', null, 15000);
    const states = await page.evaluate(() => window.__rowStates);
    const unready = states.filter(entry => entry.state !== 'ready');
    check(`${label} (still being read): the file was seen unread and showed no position line`, unready.length > 0 && unready.every(entry => !entry.position), JSON.stringify([...new Set(states.map(entry => `${entry.state}:${entry.position}`))]));
    await context.close();
  }
};

const RAPID_GAPS = [0, 1, 4];
const RAPID_SWITCHES = [2, 3, 4, 11];
const RAPID_REPEATS = 5;
const RAPID_START = 12;

const rapidSwitchConfig = async ({ browser, app, viewport, scheme, trim, playing }) => {
  const { context, page, errors } = await openApp(browser, app, viewport, { scheme, init: delayedSource(300) });
  await addFiles(page, [fixture('tone-20.wav', 20)]);
  if (trim) { await page.getByLabel('Add step').selectOption('trim'); await setTrimAll(page, 5, 15); }
  await exportAll(page, 1);
  const row = rowAt(page, 0);
  await open(row);
  const trimStart = trim ? 5 : 0;
  const loaded = (view) => until(page, expected => {
    const li = document.querySelector('li[data-file-id]'), audio = li.querySelector('audio');
    const wanted = expected === 'result' ? li.querySelector('a.download-button').href : null;
    return li.querySelector('.file-player').dataset.view === expected && audio.readyState >= 1 && (wanted ? audio.src === wanted : audio.src.startsWith('blob:') && audio.src !== li.querySelector('a.download-button').href);
  }, view, 8000);
  await loaded('result');
  const windowOpen = await (async () => {
    await row.locator('.view-switch').getByLabel(copy.files.original, { exact: true }).check();
    await page.waitForTimeout(100);
    const state = await row.locator('audio').evaluate(audio => ({ ready: audio.readyState, attribute: audio.getAttribute('src') }));
    await loaded('original');
    return state.ready === 0 && state.attribute === null;
  })();
  const outcomes = [];
  for (const switches of RAPID_SWITCHES) {
    for (const gap of RAPID_GAPS) {
      const reps = [];
      for (let rep = 0; rep < RAPID_REPEATS; rep++) {
        if (await row.locator('.file-player').getAttribute('data-view') !== 'original') {
          await row.locator('.view-switch').getByLabel(copy.files.original, { exact: true }).check();
        }
        await loaded('original');
        await row.locator('audio').evaluate(audio => { audio.pause(); });
        await seekAndPlay(row, RAPID_START);
        if (playing) {
          await row.locator('.wave-play').click();
          await until(page, () => !document.querySelector('audio').paused && document.querySelector('audio').currentTime > 12, null, 4000);
        }
        await row.evaluate(async (li, [count, delay, resultLabel, originalLabel]) => {
          const choose = text => [...li.querySelectorAll('.view-switch input')].find(input => input.parentElement.textContent === text).click();
          for (let index = 0; index < count; index++) {
            choose(index % 2 === 0 ? resultLabel : originalLabel);
            if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
          }
        }, [switches, gap, copy.result.label, copy.files.original]);
        const expectedView = switches % 2 === 1 ? 'result' : 'original';
        const settled = await loaded(expectedView);
        await page.waitForTimeout(playing ? 60 : 250);
        const end = await row.locator('audio').evaluate(audio => ({ time: audio.currentTime, paused: audio.paused, view: audio.closest('.file-player').dataset.view }));
        const wanted = expectedView === 'result' ? RAPID_START - trimStart : RAPID_START;
        const timeOk = end.time >= wanted - 0.25 && end.time <= wanted + (playing ? 1.2 : 0.25);
        reps.push({ ok: settled && end.view === expectedView && end.paused === !playing && timeOk, end, wanted });
      }
      outcomes.push({ switches, gap, reps });
    }
  }
  await context.close();
  return { outcomes, windowOpen, errors };
};

const rapidSwitchCarry = async ({ browser, app, check, viewport, scheme }) => {
  const label = `T8 ${viewport.name} ${scheme} rapid switches`;
  const configs = [{ trim: false, playing: false }, { trim: false, playing: true }, { trim: true, playing: false }, { trim: true, playing: true }];
  const runs = await Promise.all(configs.map(config => rapidSwitchConfig({ browser, app, viewport, scheme, ...config })));
  runs.forEach((run, index) => {
    const { trim, playing } = configs[index];
    const name = `${label} (${trim ? 'trim 5 to 15' : 'no trim'}, ${playing ? 'playing' : 'paused'})`;
    check(`${name}: the source load is delayed 300ms, so the pending window is open`, run.windowOpen);
    for (const { switches, gap, reps } of run.outcomes) {
      const failed = reps.filter(rep => !rep.ok);
      check(`${name}: ${switches} switches at ${gap}ms keep the position, view and play state in ${RAPID_REPEATS} of ${RAPID_REPEATS} repetitions`, failed.length === 0, JSON.stringify(failed.slice(0, 2)));
    }
    check(`${name}: no page errors`, run.errors.length === 0, run.errors.join('; '));
  });
};

const NO_PLACEHOLDER = '--:--';
const noWaveform = () => { window.IntersectionObserver = class { observe() {} disconnect() {} }; };

const noPlaceholderSwitches = async ({ browser, app, check, viewport, scheme }) => {
  for (const trim of [false, true]) {
    for (const widened of [false, true]) {
      const label = `T8 ${viewport.name} ${scheme} no --:-- (${trim ? 'trim 5 to 15' : 'no trim'}${widened ? ', source load delayed 300ms, no waveform' : ''})`;
      const { context, page, errors } = await openApp(browser, app, viewport, { scheme, init: widened ? [delayedSource(300), noWaveform] : null });
      await addFiles(page, [fixture('tone-20.wav', 20)]);
      if (trim) { await page.getByLabel('Add step').selectOption('trim'); await setTrimAll(page, 5, 15); }
      await exportAll(page, 1);
      const row = rowAt(page, 0);
      const total = trim ? '00:10' : '00:20';
      await page.evaluate(() => {
        window.__samples = [];
        const li = document.querySelector('li[data-file-id]');
        const frame = () => { window.__samples.push({ mark: window.__mark ?? '', text: li.querySelector('.file-position')?.textContent ?? '' }); window.__sampler = requestAnimationFrame(frame); };
        window.__sampler = requestAnimationFrame(frame);
      });
      const wait = widened ? 800 : 400;
      const act = async (mark, target) => {
        await row.evaluate((li, [name, how]) => {
          window.__mark = name;
          const control = how === 'toggle' ? li.querySelector('.file-toggle') : [...li.querySelectorAll('.view-switch input')].find(input => input.parentElement.textContent === how);
          control.click();
        }, [mark, target]);
        await page.waitForTimeout(wait);
      };
      await act('expand', 'toggle');
      await act('result to original', copy.files.original);
      await act('collapse from original', 'toggle');
      await act('expand again', 'toggle');
      await act('result to original again', copy.files.original);
      await act('original to result', copy.result.label);
      await act('collapse from result', 'toggle');
      const samples = await page.evaluate(() => { cancelAnimationFrame(window.__sampler); return window.__samples; });
      check(`${label}: sampled every animation frame through 7 view changes (${samples.length} samples)`, samples.length > 7 * 5, samples.length);
      const placeholder = samples.filter(sample => sample.text.includes(NO_PLACEHOLDER));
      check(`${label}: no sample of .file-position contains ${NO_PLACEHOLDER}`, placeholder.length === 0, JSON.stringify([...new Set(placeholder.map(sample => `${sample.mark}: ${sample.text}`))]));
      for (const mark of ['collapse from original', 'original to result']) {
        const after = samples.filter(sample => sample.mark === mark);
        check(`${label}: from the first frame of "${mark}" the line already shows the result total ${total}`, after.length > 0 && after.every(sample => sample.text.endsWith(`/ ${total}`)), JSON.stringify([...new Set(after.map(sample => sample.text))]));
      }
      check(`${label}: no page errors`, errors.length === 0, errors.join('; '));
      await context.close();
    }
  }
};

const progressColours = page => page.evaluate(() => {
  const line = document.querySelector('li[data-collapsed] .wave-progress'), fill = line.querySelector('i');
  const canvas = getComputedStyle(document.body).backgroundColor;
  const lineStyle = getComputedStyle(line), fillStyle = getComputedStyle(fill), rowStyle = getComputedStyle(line.closest('li'));
  const box = line.getBoundingClientRect();
  return { track: lineStyle.backgroundColor, trackBorder: lineStyle.borderTopColor, trackBorderWidth: lineStyle.borderTopWidth, fill: fillStyle.backgroundColor, row: rowStyle.backgroundColor, body: canvas, height: box.height, fillWidth: fill.getBoundingClientRect().width, lineWidth: box.width, transform: fill.style.transform };
});

const forcedColourProgress = async ({ browser, app, check, viewport, scheme }) => {
  const label = `T8 ${viewport.name} ${scheme} collapsed progress line`;
  const { context, page, errors } = await openApp(browser, app, viewport, { scheme });
  await addFiles(page, [fixture('tone-20.wav', 20)]);
  await exportAll(page, 1);
  const row = rowAt(page, 0);
  const normal = await progressColours(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.waitForTimeout(150);
  const idle = await progressColours(page);
  check(`${label} (forced colors): the track and the fill compute to different colors`, idle.track !== idle.fill, JSON.stringify(idle));
  check(`${label} (forced colors): the fill differs from Canvas`, idle.fill !== idle.body && idle.fill !== idle.row, JSON.stringify(idle));
  await row.locator('.wave-play').click();
  await until(page, () => document.querySelector('audio').currentTime > 1.5, null, 6000);
  const playing = await progressColours(page);
  await row.locator('.wave-play').click();
  check(`${label} (forced colors): the progress fill width follows playback`, playing.fillWidth > idle.fillWidth + 3 && Math.abs(playing.fillWidth / playing.lineWidth - Number(playing.transform.match(/scaleX\(([\d.]+)\)/)?.[1] ?? NaN)) < 0.02, JSON.stringify({ idle: idle.fillWidth, playing: playing.fillWidth, line: playing.lineWidth, transform: playing.transform }));
  await shot(page, `t8-forced-colors-${viewport.name}-${scheme}`);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.waitForTimeout(150);
  const after = await progressColours(page);
  const unchanged = { light: { track: 'rgb(229, 231, 235)', fill: 'rgb(52, 120, 94)' }, dark: { track: 'rgb(48, 52, 60)', fill: 'rgb(133, 191, 165)' } }[scheme];
  check(`${label} (normal mode): the track and fill colors are the ones from before the forced-colors rule, also after leaving forced colors`, normal.track === unchanged.track && normal.fill === unchanged.fill && after.track === unchanged.track && after.fill === unchanged.fill, JSON.stringify({ normal, after, unchanged }));
  check(`${label} (normal mode): the line is still 2px`, after.height === 2 && normal.height === 2);
  check(`${label}: no page errors`, errors.length === 0, errors.join('; '));
  await context.close();
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
      if (viewport.name === '375' || viewport.name === '1440') {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, [fixture('tone-20.wav', 20)]);
        await page.getByLabel('Add step').selectOption('trim');
        await setTrimAll(page, 2, 10);
        await exportAll(page, 1);
        const row = rowAt(page, 0), meta = row.locator('.file-name small').first();
        await open(row);
        const repeated = text => { const times = text.match(/\d\d:\d\d/g) ?? []; return times.length - new Set(times).size; };
        const oneLine = () => meta.evaluate(node => node.getBoundingClientRect().height <= parseFloat(getComputedStyle(node).lineHeight) * 1.5);
        await page.waitForFunction(() => document.querySelector('.file-position').textContent === '00:00 / 00:08');
        const result = await meta.innerText();
        check(`${label} trimmed finished row, Result view: the kept duration is not repeated, the line reads position, then range`, result === '00:00 / 00:08 · 00:02 to 00:10' && repeated(result) === 0, result);
        if (viewport.name === '375') check(`${label} trimmed finished row, Result view: the meta line fits on one line`, await oneLine());
        await row.getByLabel('Original', { exact: true }).check();
        await page.waitForFunction(() => document.querySelector('.file-position').textContent === '00:00 / 00:20');
        const original = await meta.innerText();
        check(`${label} trimmed finished row, Original view: position and whole-file total, then kept duration and range`, original === '00:00 / 00:20 · 00:08 · 00:02 to 00:10' && repeated(original) === 0, original);
        await row.getByLabel('Result', { exact: true }).check();
        await page.waitForFunction(() => document.querySelector('.file-position').textContent === '00:00 / 00:08');
        check(`${label} trimmed finished row: back in the Result view the kept duration is omitted again`, await meta.innerText() === '00:00 / 00:08 · 00:02 to 00:10');
        check(`${label} trimmed finished row: no page errors`, errors.length === 0, errors.join('; '));
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

  async T6({ browser, app, check, note }) {
    const POSITION = /^\d\d:\d\d \/ \d\d:\d\d$/;
    const peakCounter = () => { window.__peakWorkers = 0; const Native = window.Worker; window.Worker = class extends Native { constructor(url, options) { super(url, options); if (String(url).includes('peaks-worker')) window.__peakWorkers++; } }; };
    const rowFacts = page => page.locator('li[data-file-id]').evaluateAll(list => list.map(li => {
      const box = selector => { const element = li.querySelector(selector); if (!element || !element.getClientRects().length) return null; const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const own = li.getBoundingClientRect(), centre = element => element ? (element.top + element.bottom) / 2 - own.top : null;
      const parts = { play: box('.wave-play'), name: box('.file-name-text'), position: box('.file-position'), download: box('.download-button'), remove: box('[data-remove-file]') };
      return {
        height: own.height, expanded: li.querySelector('.file-toggle')?.getAttribute('aria-expanded') ?? null, collapsed: li.hasAttribute('data-collapsed'),
        parts: Object.fromEntries(Object.entries(parts).map(([name, part]) => [name, part ? Math.round(part.width) : null])),
        oneLine: Object.values(parts).every(Boolean) && Object.values(parts).every(part => Math.abs(centre(part) - own.height / 2) <= 24) && parts.play.right <= parts.name.left + 0.5 && parts.name.right <= parts.download.left + 0.5 && parts.download.right <= parts.remove.left + 0.5,
        position: li.querySelector('.file-position')?.textContent ?? null,
        track: li.querySelectorAll('.wave-track, canvas').length, switches: li.querySelectorAll('.view-switch').length, trims: li.querySelectorAll('.wave-trim').length,
        progress: box('.wave-progress')?.height ?? null, audios: li.querySelectorAll('audio').length,
        toggle: box('.file-toggle') ? { width: box('.file-toggle').width, height: box('.file-toggle').height } : null,
      };
    }));
    for (const viewport of VIEWPORTS) {
      const label = `T6 ${viewport.name}`;
      {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await page.addInitScript(peakCounter);
        await page.reload();
        await page.getByRole('heading', { name: copy.app.title }).waitFor();
        await addFiles(page, [fixture('tone-20.wav', 20), fixture(LONG_NAME, 12), fixture('tone-b.wav', 12)]);
        await page.getByLabel('Add step').selectOption('trim');
        await setTrimAll(page, 2, 10);
        await exportAll(page, 3);
        const peaksAtDone = await page.evaluate(() => window.__peakWorkers);
        await page.waitForTimeout(900);
        const collapsed = await rowFacts(page);
        note(`${label} measured: collapsed rows ${collapsed.map(row => `${Math.round(row.height)}px`).join(', ')} (baseline finished row ${baselineRow(viewport.name)}px)`);
        check(`${label} 3 finished files, one with Trim all and a 60-character name: each row is at most 64px`, collapsed.length === 3 && collapsed.every(row => row.height <= 64), JSON.stringify(collapsed.map(row => row.height)));
        check(`${label} collapsed rows show play, name, position, download and remove on one line`, collapsed.every(row => row.oneLine && POSITION.test(row.position ?? '') && row.collapsed && row.expanded === 'false'), JSON.stringify(collapsed.map(row => ({ oneLine: row.oneLine, parts: row.parts, position: row.position }))));
        check(`${label} collapsed rows keep the audio and a 2px progress line, with no waveform, switch or Trim`, collapsed.every(row => row.audios === 1 && row.progress === 2 && row.track === 0 && row.switches === 0 && row.trims === 0), JSON.stringify(collapsed.map(row => ({ audios: row.audios, progress: row.progress, track: row.track }))));
        check(`${label} collapsed rows start no peak analysis after the export`, await page.evaluate(() => window.__peakWorkers) === peaksAtDone, `${peaksAtDone} then ${await page.evaluate(() => window.__peakWorkers)}`);
        check(`${label} the name area is at least 44px in both directions`, collapsed.every(row => row.toggle && row.toggle.width >= 44 && row.toggle.height >= 44), JSON.stringify(collapsed.map(row => row.toggle)));
        if (viewport.name === '375' || viewport.name === '320') await shot(page, `t6-${viewport.name}-collapsed`);

        const second = rowAt(page, 1), toggle = second.locator('.file-toggle');
        await toggle.click();
        await page.waitForTimeout(450);
        const expanded = await rowFacts(page);
        note(`${label} measured: expanded row ${Math.round(expanded[1].height)}px`);
        check(`${label} tapping one name grows only that row to the waveform, switch and Trim, aria-expanded true`, expanded[1].expanded === 'true' && expanded[1].track >= 2 && expanded[1].switches === 1 && expanded[1].trims === 1 && expanded[0].height <= 64 && expanded[2].height <= 64 && expanded[0].expanded === 'false', JSON.stringify(expanded.map(row => [row.height, row.expanded, row.track, row.switches])));
        check(`${label} an expanded finished row is at most 176px`, expanded[1].height <= 176, expanded[1].height);
        if (viewport.name === '375') await shot(page, 't6-375-expanded');
        await toggle.click();
        await page.waitForTimeout(450);
        check(`${label} tapping again collapses it`, await toggle.getAttribute('aria-expanded') === 'false' && (await rowFacts(page))[1].height <= 64);

        await page.locator('.add-files input').focus();
        let reached = false;
        for (let press = 0; press < 14 && !reached; press++) {
          await page.keyboard.press('Tab');
          reached = await page.evaluate(() => document.activeElement?.classList.contains('file-toggle') && document.activeElement.closest('li') === document.querySelector('li[data-file-id]'));
        }
        check(`${label} keyboard: the first name button is reachable by Tab`, reached);
        await page.keyboard.press('Enter');
        const afterEnter = await page.evaluate(() => ({ expanded: document.activeElement.getAttribute('aria-expanded'), focused: document.activeElement.classList.contains('file-toggle') }));
        await page.keyboard.press('Space');
        const afterSpace = await page.evaluate(() => ({ expanded: document.activeElement.getAttribute('aria-expanded'), focused: document.activeElement.classList.contains('file-toggle') }));
        check(`${label} keyboard: Enter expands and Space collapses, focus stays on the name button`, afterEnter.expanded === 'true' && afterEnter.focused && afterSpace.expanded === 'false' && afterSpace.focused, JSON.stringify({ afterEnter, afterSpace }));

        const third = rowAt(page, 2), first = rowAt(page, 0);
        await third.locator('.wave-play').click();
        await page.waitForFunction(() => !document.querySelectorAll('li[data-file-id] .file-position')[2].textContent.startsWith('00:00 /'), null, { timeout: 8000 });
        const playing = await third.evaluate(li => ({ position: li.querySelector('.file-position').textContent, progress: li.querySelector('.wave-progress i').style.transform, src: li.querySelector('audio').src, href: li.querySelector('a[download]').href }));
        check(`${label} collapsed play: the Result plays, the position and the progress line advance`, POSITION.test(playing.position) && !playing.position.startsWith('00:00 /') && /scaleX\((0\.\d+|1)\)/.test(playing.progress) && playing.progress !== 'scaleX(0)' && playing.src === playing.href, JSON.stringify(playing));
        await third.evaluate(li => { window.__audio = li.querySelector('audio'); window.__before = window.__audio.currentTime; });
        await third.locator('.file-toggle').click();
        await page.waitForTimeout(450);
        const whileExpanded = await third.evaluate(li => ({ same: li.querySelector('audio') === window.__audio, paused: window.__audio.paused, advanced: window.__audio.currentTime >= window.__before, expanded: li.querySelector('.file-toggle').getAttribute('aria-expanded') }));
        await third.locator('.file-toggle').click();
        await page.waitForTimeout(450);
        const whileCollapsed = await third.evaluate(li => ({ same: li.querySelector('audio') === window.__audio, paused: window.__audio.paused, advanced: window.__audio.currentTime >= window.__before, expanded: li.querySelector('.file-toggle').getAttribute('aria-expanded'), ended: window.__audio.ended }));
        check(`${label} expanding and collapsing a playing row keeps the same audio element playing without a restart`, whileExpanded.same && !whileExpanded.paused && whileExpanded.advanced && whileExpanded.expanded === 'true' && whileCollapsed.same && (!whileCollapsed.paused || whileCollapsed.ended) && whileCollapsed.advanced && whileCollapsed.expanded === 'false', JSON.stringify({ whileExpanded, whileCollapsed }));
        await first.locator('.wave-play').click();
        await page.waitForTimeout(600);
        const playingNow = await page.locator('audio').evaluateAll(list => list.filter(audio => !audio.paused).length);
        check(`${label} collapsed play pauses the other rows`, playingNow === 1, playingNow);
        await first.locator('.wave-play').click();

        await first.locator('.file-toggle').click();
        await page.waitForTimeout(400);
        await first.getByRole('button', { name: copy.wave.trimLabel('tone-20.wav') }).click();
        await page.waitForTimeout(400);
        const trimming = await first.evaluate(li => ({ handles: li.querySelectorAll('.wave-handle').length, toggle: li.querySelectorAll('.file-toggle').length, collapsed: li.hasAttribute('data-collapsed') }));
        check(`${label} starting Trim expands the row`, trimming.handles === 2 && !trimming.collapsed, JSON.stringify(trimming));
        await first.getByRole('button', { name: copy.wave.doneLabel('tone-20.wav') }).click();
        await page.waitForTimeout(400);
        check(`${label} Done leaves the row expanded`, await first.locator('.file-toggle').getAttribute('aria-expanded') === 'true');
        check(`${label} no horizontal overflow, no page errors`, (await metrics(page)).overflow <= 0 && errors.length === 0, errors.join('; '));
        await context.close();
      }
      if (viewport.name === '375' || viewport.name === '1440') {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, [fixture('long-a.wav', 90), fixture('long-b.wav', 90), fixture('long-c.wav', 90)]);
        await page.getByRole('button', { name: 'Export', exact: true }).click();
        await page.waitForSelector('li[data-job-state=waiting], li[data-job-state=running]', { timeout: 20000 });
        const live = await page.locator('li[data-file-id]').evaluateAll(list => list.map(li => ({ state: li.dataset.jobState, toggle: li.querySelectorAll('.file-toggle').length, collapsed: li.hasAttribute('data-collapsed'), status: li.querySelector('.file-result')?.textContent ?? '' })));
        check(`${label} waiting and running rows stay expanded with their status`, live.every(row => row.state === 'done' || (row.toggle === 0 && !row.collapsed && row.status !== '')), JSON.stringify(live));
        const lastName = 'long-c.wav';
        const cancel = page.getByRole('button', { name: copy.files.cancelLabel(lastName) });
        if (await cancel.count()) await cancel.click();
        await page.waitForSelector('li[data-job-state=cancelled]', { timeout: 20000 });
        const cancelled = await page.locator('li[data-job-state=cancelled]').evaluate(li => ({ toggle: li.querySelectorAll('.file-toggle').length, collapsed: li.hasAttribute('data-collapsed'), text: li.querySelector('.file-result').textContent, retry: !!li.querySelector('.file-result button') }));
        check(`${label} a cancelled row stays expanded with its status and Retry`, cancelled.toggle === 0 && !cancelled.collapsed && cancelled.text.includes(copy.files.cancelled) && cancelled.retry, JSON.stringify(cancelled));
        await page.waitForFunction(() => document.querySelectorAll('li[data-job-state=done]').length === 2, null, { timeout: 90000 });
        await page.waitForTimeout(500);
        const settled = await rowFacts(page);
        check(`${label} the two finished rows collapse once done`, settled.filter(row => row.collapsed).length === 2 && settled.filter(row => row.collapsed).every(row => row.height <= 64), JSON.stringify(settled.map(row => [row.collapsed, row.height])));
        check(`${label} running and cancelled rows: no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
      if (viewport.name === '375') {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, [fixture('tone-20.wav', 20)]);
        await page.getByLabel('Add step').selectOption('trim');
        await setTrimAll(page, 2, 10);
        await exportAll(page, 1);
        await page.getByLabel('Add step').selectOption('gain');
        const row = rowAt(page, 0);
        const before = await rowFacts(page);
        check(`${label} an older-settings result collapses with Preview folded away and its older line kept`, before[0].collapsed && await row.locator('.file-actions button:not(.icon-button)').count() === 0 && await row.locator('.file-result').innerText() === copy.result.olderLabel, JSON.stringify(before[0]));
        await open(row);
        await row.getByRole('button', { name: /^Preview/ }).click();
        await page.locator('[data-preview-state=ready]').waitFor({ timeout: 60000 });
        await page.waitForTimeout(400);
        const previewing = await row.evaluate(li => ({ toggle: li.querySelectorAll('.file-toggle').length, collapsed: li.hasAttribute('data-collapsed'), players: li.querySelectorAll('.file-preview .wave-player').length, audios: li.querySelectorAll('audio').length }));
        check(`${label} an open preview keeps the row expanded`, previewing.players === 2 && !previewing.collapsed && previewing.toggle === 0, JSON.stringify(previewing));
        check(`${label} older-settings preview: no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
      if (viewport.name === '375' || viewport.name === '320') {
        const { context, page, errors } = await openApp(browser, app, viewport);
        await addFiles(page, FIXTURE_PATHS);
        await exportAll(page, 3);
        const rows = await rowFacts(page);
        note(`${label} measured: the three tests/fixtures audio files export to collapsed rows of ${rows.map(row => `${Math.round(row.height)}px`).join(', ')}`);
        check(`${label} the three fixture files export to collapsed rows of at most 64px`, rows.length === 3 && rows.every(row => row.height <= 64 && row.collapsed && row.oneLine), JSON.stringify(rows.map(row => row.height)));
        await rowAt(page, 1).locator('.file-toggle').click();
        await page.waitForTimeout(450);
        const mixed = await rowFacts(page);
        note(`${label} measured: with the second fixture expanded the rows are ${mixed.map(row => `${Math.round(row.height)}px`).join(', ')}`);
        if (viewport.name === '375') await shot(page, 't6-375-fixtures-expanded');
        check(`${label} fixtures: no page errors`, errors.length === 0, errors.join('; '));
        await context.close();
      }
    }
    note('WebKit not run: not installed');
  },

  async T7({ browser, app, check, note, record }) {
    const passes = [
      { name: 'light', scheme: 'light' },
      { name: 'dark', scheme: 'dark' },
      { name: 'light, reduced motion', scheme: 'light', reducedMotion: 'reduce' },
      { name: 'light, touch', scheme: 'light', touch: true, maxWidth: 768 },
    ];
    for (const viewport of VIEWPORTS) {
      for (const pass of passes) {
        if (pass.maxWidth && viewport.width > pass.maxWidth) continue;
        const label = `T7 ${viewport.name} ${pass.name}`;
        const { context, page, errors } = await openApp(browser, app, viewport, pass);
        const settle = () => page.waitForTimeout(pass.reducedMotion ? 120 : 450);
        const result = await threeFinished(page, async stage => ({ small: await smallTargets(page), stage }));
        const { unprocessed, finished } = result;
        check(`${label} unprocessed: every row at most 120px without Preview`, unprocessed.rows.length === 3 && unprocessed.rows.every(row => row.height <= 120), JSON.stringify(unprocessed.rows.map(row => row.height)));
        note(`${label} measured: unprocessed rows ${unprocessed.rows.map(row => `${Math.round(row.height)}px`).join(', ')}, with a Trim all step and Preview ${result.unprocessedWithPreview.rows.map(row => `${Math.round(row.height)}px`).join(', ')}, first-row offset ${Math.round(unprocessed.firstRowOffset)}px, empty box ${result.empty}px`);
        check(`${label} unprocessed: first row starts within 80px of the panel top`, unprocessed.firstRowOffset <= 80, unprocessed.firstRowOffset);
        check(`${label} unprocessed: every interactive target is at least 44x44`, unprocessed.small.length === 0, JSON.stringify(unprocessed.small));
        check(`${label} unprocessed: no horizontal overflow`, unprocessed.overflow <= 0, unprocessed.overflow);
        check(`${label} finished: each collapsed row is at most 64px`, finished.rows.length === 3 && finished.rows.every(row => row.height <= 64), JSON.stringify(finished.rows.map(row => row.height)));
        check(`${label} finished: first row starts within 80px of the panel top`, finished.firstRowOffset <= 80, finished.firstRowOffset);
        check(`${label} finished: every interactive target is at least 44x44`, finished.small.length === 0, JSON.stringify(finished.small));
        check(`${label} finished: no horizontal overflow`, finished.overflow <= 0, finished.overflow);
        note(`${label} measured: collapsed rows ${finished.rows.map(row => `${Math.round(row.height)}px`).join(', ')}, list ${Math.round(finished.listHeight)}px`);

        const toggles = page.locator('li[data-file-id] .file-toggle');
        for (let index = 0; index < 3; index++) { await toggles.nth(index).click(); await settle(); }
        const expanded = { ...await listFacts(page), small: await smallTargets(page) };
        check(`${label} expanded: each finished row is at most 176px, not counting a result note`, expanded.rows.every(row => row.height - row.resultHeight <= 176), JSON.stringify(expanded.rows.map(row => [row.height, row.resultHeight])));
        check(`${label} expanded: every interactive target is at least 44x44`, expanded.small.length === 0, JSON.stringify(expanded.small));
        check(`${label} expanded: no horizontal overflow`, expanded.overflow <= 0, expanded.overflow);
        note(`${label} measured: expanded rows ${expanded.rows.map(row => `${Math.round(row.height)}px`).join(', ')}, list ${Math.round(expanded.listHeight)}px, waveform ${Math.round(expanded.waveWidth)}px`);

        const first = rowAt(page, 0);
        await first.getByRole('button', { name: copy.wave.trimLabel('tone-20.wav') }).click();
        await settle();
        const editing = { ...await listFacts(page), handles: await first.locator('.wave-handle').count(), small: await smallTargets(page) };
        check(`${label} trim editing: two handles, every target at least 44x44, no horizontal overflow`, editing.handles === 2 && editing.small.length === 0 && editing.overflow <= 0, JSON.stringify({ handles: editing.handles, small: editing.small, overflow: editing.overflow }));
        note(`${label} measured: row in trim editing ${Math.round(editing.rows[0].height)}px`);
        await first.getByRole('button', { name: copy.wave.doneLabel('tone-20.wav') }).click();
        await settle();

        if (pass.reducedMotion) {
          const motion = await page.evaluate(() => ({ animations: document.getAnimations().length, trackTransition: getComputedStyle(document.querySelector('.wave-track')).transitionDuration, buttonTransition: getComputedStyle(document.querySelector('button')).transitionDuration }));
          check(`${label} reduced motion: no running animation and no transition`, motion.animations === 0 && /^0s(, 0s)*$/.test(motion.trackTransition) && /^0s(, 0s)*$/.test(motion.buttonTransition), JSON.stringify(motion));
        }
        for (let index = 0; index < 3; index++) { await toggles.nth(index).click(); await settle(); }
        const folded = await listFacts(page);
        check(`${label} collapsing every row returns each to at most 64px`, folded.rows.every(row => row.height <= 64), JSON.stringify(folded.rows.map(row => row.height)));
        check(`${label} no page errors`, errors.length === 0, errors.join('; '));
        record(viewport.name, pass.name, { empty: result.empty, unprocessed: unprocessed.rows.map(row => row.height), unprocessedWithPreview: result.unprocessedWithPreview.rows.map(row => row.height), unprocessedFirstRowOffset: unprocessed.firstRowOffset, finished: finished.rows.map(row => row.height), finishedFirstRowOffset: finished.firstRowOffset, finishedListHeight: finished.listHeight, expanded: expanded.rows.map(row => row.height), expandedListHeight: expanded.listHeight, waveWidth: expanded.waveWidth });
        await context.close();
      }
    }
    note('WebKit not run: not installed');
  },
  async T8({ browser, app, check, note }) {
    for (const viewport of T8_VIEWPORTS.filter(item => !flagValue('--viewport') || item.name === flagValue('--viewport'))) {
      for (const scheme of T8_SCHEMES.filter(item => !flagValue('--scheme') || item === flagValue('--scheme'))) {
        const context = { browser, app, check, note, viewport, scheme };
        if (viewport.name !== '320') {
          if (issueRuns(1)) await unknownDurationLive(context);
          if (issueRuns(2)) await rapidSwitchCarry(context);
          if (issueRuns(3)) await noPlaceholderSwitches(context);
        }
        if (issueRuns(4)) await forcedColourProgress(context);
      }
    }
    note('WebKit not run: not installed');
  },
};

const measured = {};
const record = (viewport, pass, data) => { (measured[viewport] ??= {})[pass] = data; };

async function runThree(browser, app) {
  const out = { base: process.env.SPRINT30_BASE ?? 'unmodified build', viewports: {} };
  for (const viewport of VIEWPORTS) {
    const { context, page } = await openApp(browser, app, viewport, { scheme: 'light' });
    const { empty, unprocessed, unprocessedWithPreview, finished } = await threeFinished(page);
    out.viewports[viewport.name] = {
      empty, unprocessed: unprocessed.rows.map(row => row.height), unprocessedWithPreview: unprocessedWithPreview.rows.map(row => row.height), unprocessedFirstRowOffset: unprocessed.firstRowOffset,
      finished: finished.rows.map(row => row.height), finishedFirstRowOffset: finished.firstRowOffset, finishedListHeight: finished.listHeight, waveWidth: finished.waveWidth,
    };
    await context.close();
  }
  await writeFile(`${root}/three-${process.env.SPRINT30_BASE ? 'baseline' : 'now'}.json`, `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2));
}

async function runShots(browser, app, which) {
  const viewportOf = name => VIEWPORTS.find(viewport => viewport.name === name);
  const finished = async (name, scheme, file, { expand = false, expandedFile } = {}) => {
    const { context, page } = await openApp(browser, app, viewportOf(name), { scheme });
    await threeFinished(page);
    await page.waitForTimeout(400);
    if (file) await shot(page, file);
    if (expand) {
      await rowAt(page, 1).locator('.file-toggle').click();
      await page.waitForTimeout(500);
      if (expandedFile) await shot(page, expandedFile);
    }
    return { context, page };
  };
  if (which === 'before') {
    await (await finished('375', 'dark', 'before-375-dark')).context.close();
    return;
  }
  await (await finished('375', 'dark', 'final-375-dark', { expand: true, expandedFile: 'final-375-expanded-dark' })).context.close();
  await (await finished('375', 'light', 'final-375-light')).context.close();
  await (await finished('320', 'dark', 'final-320-dark')).context.close();
  for (const [name, scheme] of [['768', 'light'], ['1024', 'dark'], ['1440', 'light']]) {
    await (await finished(name, scheme, `final-${name}-${scheme}-collapsed`, { expand: true, expandedFile: `final-${name}-${scheme}` })).context.close();
  }
  {
    const { context, page } = await finished('375', 'light', null);
    await rowAt(page, 0).locator('.file-toggle').click();
    await page.waitForTimeout(450);
    await rowAt(page, 0).getByRole('button', { name: copy.wave.trimLabel('tone-20.wav') }).click();
    await page.waitForTimeout(450);
    await shot(page, 'edit-mode-375');
    await context.close();
  }
  {
    const { context, page } = await openApp(browser, app, viewportOf('375'), { scheme: 'light' });
    await shot(page, 'empty-375');
    await addFiles(page, THREE());
    await page.waitForTimeout(500);
    await shot(page, 'unprocessed-375-light');
    await context.close();
  }
}

async function writeTable() {
  const before = JSON.parse(await readFile(`${root}/three-baseline.json`, 'utf8')).viewports;
  const after = JSON.parse(await readFile(`${root}/measurements.json`, 'utf8')).viewports;
  const sum = list => list.reduce((total, value) => total + value, 0), tallest = list => Math.max(...list);
  const measures = [
    ['Finished row as first shown (tallest of 3)', was => tallest(was.finished), now => tallest(now.finished)],
    ['Collapsed finished row (tallest of 3)', () => null, now => tallest(now.finished)],
    ['Expanded finished row (tallest of 3)', was => tallest(was.finished), now => tallest(now.expanded)],
    ['Unprocessed row, no steps and no Preview (tallest of 3)', was => tallest(was.unprocessed), now => tallest(now.unprocessed)],
    ['Unprocessed row with a Trim all step and Preview (tallest of 3)', was => tallest(was.unprocessedWithPreview), now => tallest(now.unprocessedWithPreview)],
    ['First-row offset from the panel top', was => was.finishedFirstRowOffset, now => now.finishedFirstRowOffset],
    ['Empty-state box, fine pointer', was => was.empty, now => now.empty],
    ['Waveform width in an expanded finished row', was => was.waveWidth, now => now.waveWidth],
    ['Rows that fit in 812px of list (812 divided by the tallest finished row, rounded down)', was => Math.floor(812 / tallest(was.finished)), now => Math.floor(812 / tallest(now.finished))],
    ['Total height of 3 finished tracks', was => sum(was.finished), now => sum(now.finished)],
  ];
  const names = VIEWPORTS.map(viewport => viewport.name);
  const show = value => value === null ? 'none' : String(Math.round(value));
  const head = `| Measure in px, baseline to now | ${VIEWPORTS.map(viewport => `${viewport.width}x${viewport.height}`).join(' | ')} |\n| --- | ${names.map(() => '---').join(' | ')} |`;
  const rows = measures.map(([title, was, now]) => `| ${title} | ${names.map(name => `${show(was(before[name]))} to ${show(now(after[name].light))}`).join(' | ')} |`);
  await writeFile(`${root}/measurements.md`, `${[head, ...rows].join('\n')}\n`);
  console.log([head, ...rows].join('\n'));
}

const shotsFlag = args.indexOf('--shots');
const shotsWhich = shotsFlag >= 0 ? args[shotsFlag + 1] : null;
const three = args.includes('--three');
if (args.includes('--table')) { await writeTable(); process.exit(0); }
const app = await startApp();
const { check, note, lines, failures } = reporter();
const wanted = engines();
const selected = baseline || three || shotsWhich ? [] : only ? [only] : Object.keys(tasks);
try {
  for (const [name, type] of wanted) {
    const browser = await type.launch({ ...launchOptions(name), args: ['--autoplay-policy=no-user-gesture-required'] });
    try {
      if (baseline) await runBaseline(app, browser);
      if (three) await runThree(browser, app);
      if (shotsWhich) await runShots(browser, app, shotsWhich);
      for (const id of selected) await tasks[id]({ browser, app, check, note, record });
    } finally { await browser.close(); }
  }
} finally { await app.close(); }
if (selected.includes('T7')) await writeFile(`${root}/measurements.json`, `${JSON.stringify({ engines: wanted.map(([name]) => name), viewports: measured }, null, 2)}\n`);
if (only) await writeFile(`${root}/${only.toLowerCase()}.txt`, `${lines.map(line => `${line.note ? 'note' : line.ok ? 'ok  ' : 'FAIL'} ${line.name}${line.detail ? ` -- ${line.detail}` : ''}`).join('\n')}\n`);
if (!baseline && !three && !shotsWhich) console.log(failures.length ? `FAIL: ${failures.length} of ${lines.filter(line => !line.note).length}` : `PASS: ${lines.filter(line => !line.note).length} checks`);
process.exit(failures.length ? 1 : 0);
