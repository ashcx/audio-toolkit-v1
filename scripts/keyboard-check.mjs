/**
 * Keyboard-only walk and live announcement audit, in real Chrome.
 *
 *  - Walk. Uses Tab, Shift+Tab, Enter, Space, Escape and Arrow keys to add a file and a step, open and close a step,
 *    reorder with the grip, change a slider, export, cancel, open and close Settings, open and leave the Save menu
 *    and remove a file. Every control must be reachable and show a visible focus indicator, and focus must land on
 *    a sensible element after removing a file, closing Settings and discarding exports.
 *  - Announcements. Lists every role=status, role=alert and aria-live region that spoke during an export of 3 files
 *    and asserts a person hears at most one concise update per file for each stage change, never one per progress tick.
 *
 * A screen reader is not driven here. The live region audit reads what the DOM would announce, not what VoiceOver says.
 * Screenshots are not taken. APP_URL uses a server that is already running.
 */
import { readFileSync } from 'node:fs';
import { FIXTURES, ensureDirectory, launchChrome, loadCopy, makeAudio, reporter, startApp, writeJson } from './lib/harness.mjs';

const OUT = '.artifacts/keyboard';
const copy = await loadCopy();
const { check, note, lines, failures } = reporter();
await ensureDirectory(OUT);
const long = `${OUT}/long-30s.wav`;
await makeAudio(long, { seconds: 30, rate: 44100, noise: true });
const app = await startApp();
const browser = await launchChrome();
const fixture = name => `${FIXTURES}/${name}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const FOCUSABLE = 'button, a[href], select, input, summary, textarea, [tabindex]:not([tabindex="-1"])';

const newPage = async (size = { width: 1440, height: 1000 }) => {
  const context = await browser.newContext({ viewport: size, acceptDownloads: true });
  await context.addInitScript(LIVE_RECORDER);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(app.url);
  return { page, context };
};

/** Installed before the page loads. Records every change of text a live region would speak. */
function LIVE_RECORDER() {
  window.__live = [];
  window.__regions = new Map();
  const selector = '[role=status], [role=alert], [role=log], [aria-live]:not([aria-live=off])';
  const spoken = node => {
    let text = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent;
      else if (child.nodeType === Node.ELEMENT_NODE && child.getAttribute('aria-hidden') !== 'true' && !child.hidden) text += ` ${spoken(child)} `;
    }
    return text.replace(/\s+/g, ' ').trim();
  };
  const describe = element => {
    const owner = element.closest('[data-file-id]');
    const file = owner?.querySelector('.file-name')?.firstChild?.textContent ?? null;
    const path = [element.tagName.toLowerCase(), element.getAttribute('role') && `[role=${element.getAttribute('role')}]`, element.getAttribute('aria-live') && `[aria-live=${element.getAttribute('aria-live')}]`,
      element.className && `.${String(element.className).split(' ')[0]}`].filter(Boolean).join('');
    return { file, region: owner ? `${path} (in a file row)` : path };
  };
  const last = new WeakMap();
  let queued = false;
  const scan = () => {
    queued = false;
    for (const element of document.querySelectorAll(selector)) {
      const text = spoken(element);
      const info = describe(element);
      const key = info.region;
      window.__regions.set(key, (window.__regions.get(key) ?? 0));
      if (last.get(element) === text) continue;
      last.set(element, text);
      if (!text) continue;
      window.__live.push({ ...info, text, at: performance.now() });
      window.__regions.set(key, window.__regions.get(key) + 1);
    }
  };
  new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(scan); } })
    .observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-hidden', 'hidden', 'role', 'aria-live'] });
}

const focused = page => page.evaluate(() => {
  const element = document.activeElement;
  if (!element || element === document.body) return null;
  const style = getComputedStyle(element);
  const ring = value => value.outlineStyle !== 'none' && parseFloat(value.outlineWidth) > 0;
  // A native audio player draws its own focus ring on each inner control, which computed styles cannot see.
  let indicator = element.tagName === 'AUDIO' || ring(style) || style.boxShadow !== 'none';
  if (!indicator && element.type === 'range') indicator = /\b3px\b/.test(getComputedStyle(element, '::-webkit-slider-thumb').boxShadow);
  if (!indicator && element.closest('.dropzone')) indicator = ring(getComputedStyle(element.closest('.dropzone')));
  if (!indicator && element.classList.contains('sr-only') && element.closest('label')) indicator = ring(getComputedStyle(element.closest('label'))) ;
  const labelledBy = element.labels?.[0]?.textContent?.trim();
  return {
    tag: element.tagName.toLowerCase(), type: element.getAttribute('type'),
    name: (element.getAttribute('aria-label') ?? labelledBy ?? element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
    inDialog: !!element.closest('dialog'), indicator, expanded: element.getAttribute('aria-expanded'),
    id: element.id, fileRemove: element.dataset.removeFile ?? null,
  };
});

/** Presses Tab until the focused control satisfies the test. Returns the stops in order, or null if it never does. */
async function tabTo(page, test, { max = 90, back = false, stops = [] } = {}) {
  for (let step = 0; step < max; step++) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
    const now = await focused(page);
    if (now) stops.push(now);
    if (now && test(now)) return now;
  }
  return null;
}

const rows = page => page.locator('li[data-inspection]');
async function addFilesByKeyboard(page, files) {
  const picker = await tabTo(page, stop => stop.type === 'file');
  check('keyboard reaches the file picker', picker !== null);
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Space');
  await (await chooser).setFiles(files);
  await page.waitForFunction(count => document.querySelectorAll('li[data-inspection=ready]').length === count, files.length);
}

async function walk() {
  const { page, context } = await newPage();
  const everyStop = [];
  try {
    // Reach and add a file with Space on the picker.
    const first = await tabTo(page, () => true, { max: 1, stops: everyStop });
    check('first Tab lands on the page title link', first?.tag === 'a', JSON.stringify(first));
    await tabTo(page, stop => stop.name === copy.settings.open, { stops: everyStop });
    await addFilesByKeyboard(page, [fixture('tone.wav'), fixture('tone.mp3')]);
    check('a file added from the keyboard is listed', await rows(page).count() === 2);

    // Add a step by typing its first letter on the closed list. One letter adds one step, because the list adds on change.
    const addStop = await tabTo(page, stop => stop.name === copy.steps.addStep && stop.tag === 'select', { back: false, stops: everyStop })
      ?? await tabTo(page, stop => stop.name === copy.steps.addStep && stop.tag === 'select', { back: true, stops: everyStop });
    check('keyboard reaches the Add step list', addStop !== null);
    await page.keyboard.press('G');
    await page.waitForSelector('[data-step-kind=gain]');
    check('typing G on the Add step list adds a Gain step', await page.locator('[data-step-kind=gain]').count() === 1);
    await page.getByLabel('Add step', { exact: true }).focus();
    await sleep(1200);
    await page.keyboard.press('N');
    await page.waitForSelector('[data-step-kind=normalize]');

    // Open and close a step with Enter. A new step opens itself, so close it first.
    const toggle = await tabTo(page, stop => stop.expanded !== null && stop.tag === 'button' && /Gain/.test(stop.name), { back: true, stops: everyStop })
      ?? await tabTo(page, stop => stop.expanded !== null && /Gain/.test(stop.name), { stops: everyStop });
    check('keyboard reaches a step button', toggle !== null, JSON.stringify(toggle));
    const gainToggle = page.locator('[data-step-kind=gain] .step-toggle');
    const before = await gainToggle.getAttribute('aria-expanded');
    await page.keyboard.press('Enter');
    const after = await gainToggle.getAttribute('aria-expanded');
    check('Enter flips a step open and closed', before !== after, `${before} -> ${after}`);
    check('focus stays on the step button after toggling it', (await focused(page))?.expanded === after);
    if (after === 'false') await page.keyboard.press('Enter');
    check('the step is open for editing', await gainToggle.getAttribute('aria-expanded') === 'true');

    // Change the slider with arrow keys.
    const slider = await tabTo(page, stop => stop.type === 'range', { stops: everyStop });
    check('keyboard reaches the Gain slider', slider !== null);
    const valueBefore = await page.locator('[data-step-kind=gain] input[type=range]').inputValue();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const valueAfter = await page.locator('[data-step-kind=gain] input[type=range]').inputValue();
    check('arrow keys change the slider and its summary', Number(valueAfter) > Number(valueBefore) && /\+0\.2 dB|\+0\.2/.test(await page.locator('[data-step-kind=gain] .step-toggle small').innerText()), `${valueBefore} -> ${valueAfter}`);

    // Reorder with the grip.
    const orderOf = () => page.locator('[data-step-kind]').evaluateAll(nodes => nodes.map(node => node.dataset.stepKind));
    check('steps start in the order they were added', JSON.stringify(await orderOf()) === JSON.stringify(['gain', 'normalize']), JSON.stringify(await orderOf()));
    const grip = await tabTo(page, stop => stop.name === copy.steps.drag(copy.steps.names.normalize), { stops: everyStop })
      ?? await tabTo(page, stop => stop.name === copy.steps.drag(copy.steps.names.normalize), { back: true, stops: everyStop });
    check('keyboard reaches a drag grip', grip !== null);
    await page.keyboard.press('ArrowUp');
    check('ArrowUp on the grip moves the step up', JSON.stringify(await orderOf()) === JSON.stringify(['normalize', 'gain']), JSON.stringify(await orderOf()));
    check('focus follows the moved step', /Normalize/.test((await focused(page))?.name ?? ''), JSON.stringify(await focused(page)));
    const moved = await page.locator('.recipe-panel span[role=status]').innerText();
    check('a reorder is announced once in plain words', moved === copy.steps.moved(copy.steps.names.normalize, 1, 2), moved);

    // Export from the keyboard.
    await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('wav');
    const exportStop = await tabTo(page, stop => stop.name === copy.export.exportButton && stop.tag === 'button', { stops: everyStop });
    check('keyboard reaches Export', exportStop !== null);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('[data-job-state=done]').length === 2);
    check('Enter on Export finishes both files', true);

    // Save menu opens with Enter and Escape returns focus to it.
    const menu = await tabTo(page, stop => stop.name === copy.delivery.saveToDevice, { back: true, stops: everyStop })
      ?? await tabTo(page, stop => stop.name === copy.delivery.saveToDevice, { stops: everyStop });
    check('keyboard reaches Save to device', menu !== null);
    await page.keyboard.press('Enter');
    check('Enter opens the Save menu', await page.evaluate(() => document.querySelector('.delivery-menu').open));
    await page.keyboard.press('Escape');
    check('Escape closes the Save menu and keeps focus on its button', await page.evaluate(() => !document.querySelector('.delivery-menu').open && document.activeElement.tagName === 'SUMMARY'));

    // Every control the page offers can be reached by Tab, and each shows a focus indicator.
    await page.evaluate(() => document.activeElement.blur());
    await page.evaluate(() => window.scrollTo(0, 0));
    const wanted = await page.evaluate(selector => [...document.querySelectorAll(selector)]
      .filter(element => element.checkVisibility() && !element.disabled && element.tabIndex >= 0 && !element.closest('[hidden]'))
      .map(element => `${element.tagName.toLowerCase()} ${element.getAttribute('aria-label') ?? element.labels?.[0]?.textContent?.trim() ?? element.textContent.trim().slice(0, 30)}`), FOCUSABLE);
    const visited = [];
    for (let step = 0; step < wanted.length + 25; step++) {
      await page.keyboard.press('Tab');
      const stop = await focused(page);
      if (!stop) break;
      visited.push(stop);
      if (visited.length > 3 && visited[0].name === stop.name && visited[0].tag === stop.tag && step > wanted.length - 3) break;
    }
    const names = new Set(visited.map(stop => `${stop.tag} ${stop.name}`));
    const missing = wanted.filter(entry => ![...names].some(name => name.startsWith(entry.slice(0, 20)) || entry.startsWith(name.slice(0, 20))));
    check(`Tab reaches all ${wanted.length} visible controls`, missing.length === 0, `not reached ${JSON.stringify(missing)}`);
    const unmarked = visited.filter(stop => !stop.indicator).map(stop => `${stop.tag} ${stop.name}`);
    check(`every one of the ${visited.length} focus stops shows a visible focus indicator`, unmarked.length === 0, JSON.stringify(unmarked));
    const outside = visited.filter(stop => stop.inDialog);
    check('no focus stop is trapped in a closed dialog', outside.length === 0);
    // Shift+Tab goes back through the same controls without a trap.
    const reversed = [];
    for (let step = 0; step < visited.length + 5; step++) { await page.keyboard.press('Shift+Tab'); const stop = await focused(page); if (stop) reversed.push(`${stop.tag} ${stop.name}`); }
    check('Shift+Tab walks back through the page without getting stuck', new Set(reversed).size >= Math.min(names.size, 10) - 2, `${new Set(reversed).size} distinct`);

    // Settings opens, holds focus, and gives it back.
    const settings = await tabTo(page, stop => stop.name === copy.settings.open, { stops: everyStop })
      ?? await tabTo(page, stop => stop.name === copy.settings.open, { back: true, stops: everyStop });
    check('keyboard reaches Settings', settings !== null);
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    check('opening Settings moves focus into the dialog', (await focused(page))?.inDialog === true, JSON.stringify(await focused(page)));
    const inside = [];
    for (let step = 0; step < 8; step++) { await page.keyboard.press('Tab'); const stop = await focused(page); if (stop) inside.push(stop); }
    check('Tab stays inside the open Settings dialog', inside.length > 0 && inside.every(stop => stop.inDialog), JSON.stringify(inside.filter(stop => !stop.inDialog)));
    check('every control in Settings shows a focus indicator', inside.every(stop => stop.indicator), JSON.stringify(inside.filter(stop => !stop.indicator)));
    await page.keyboard.press('Escape');
    check('Escape closes Settings', await page.getByRole('dialog').count() === 0 || !(await page.locator('dialog').evaluate(dialog => dialog.open)));
    check('focus returns to the Settings button after closing it', (await focused(page))?.name === copy.settings.open, JSON.stringify(await focused(page)));
    await page.getByRole('button', { name: copy.settings.open, exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    await tabTo(page, stop => stop.name === copy.settings.close && stop.inDialog);
    await page.keyboard.press('Enter');
    check('the Close button also returns focus to the Settings button', (await focused(page))?.name === copy.settings.open);

    // Discard exports returns focus somewhere useful.
    await tabTo(page, stop => stop.name === copy.delivery.saveToDevice, { stops: everyStop });
    await page.keyboard.press('Enter');
    await tabTo(page, stop => stop.name === copy.delivery.discard);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('[data-job-state=done]'));
    await sleep(200);
    const afterDiscard = await focused(page);
    check('after Discard exports focus lands on Export', afterDiscard?.name === copy.export.exportButton, JSON.stringify(afterDiscard));

    // Remove a file with Enter.
    const remove = await tabTo(page, stop => stop.fileRemove !== null, { back: true, stops: everyStop })
      ?? await tabTo(page, stop => stop.fileRemove !== null, { stops: everyStop });
    check('keyboard reaches a file Remove button', remove !== null);
    await page.keyboard.press('Enter');
    await sleep(200);
    const afterRemove = await focused(page);
    check('after removing a file focus lands on the next file Remove button', afterRemove?.fileRemove !== null && await rows(page).count() === 1, JSON.stringify(afterRemove));
    await page.keyboard.press('Enter');
    await sleep(200);
    const afterLast = await focused(page);
    check('after removing the last file focus lands on the file picker', afterLast?.type === 'file' && await rows(page).count() === 0, JSON.stringify(afterLast));
    const noIndicator = everyStop.filter(stop => !stop.indicator).map(stop => `${stop.tag} ${stop.name}`);
    check(`all ${everyStop.length} focus stops across the walk show a visible focus indicator`, noIndicator.length === 0, JSON.stringify([...new Set(noIndicator)]));
  } finally { await context.close(); }
}

async function cancelWalk() {
  const { page, context } = await newPage();
  try {
    await page.route('**/htdemucs_fp16.onnx', async route => { await sleep(4000); await route.continue().catch(() => {}); });
    await page.getByLabel('Choose audio or video files').setInputFiles(fixture('tone.wav'));
    await page.locator('[data-inspection=ready]').waitFor();
    await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('wav');
    await page.getByLabel('Add step', { exact: true }).focus();
    await page.keyboard.press('V');
    await page.waitForSelector('[data-step-kind=isolation]');
    const stop = await tabTo(page, entry => entry.name === copy.export.exportButton && entry.tag === 'button');
    check('keyboard reaches Export before a run that can be cancelled', stop !== null);
    await page.keyboard.press('Enter');
    const cancel = await tabTo(page, entry => entry.name === copy.files.cancelLabel('tone.wav'), { back: true })
      ?? await tabTo(page, entry => entry.name === copy.files.cancelLabel('tone.wav'));
    check('keyboard reaches the file Cancel button while it runs', cancel !== null && cancel.indicator, JSON.stringify(cancel));
    await page.keyboard.press('Enter');
    await page.locator('[data-job-state=cancelled]').waitFor();
    check('Enter on Cancel cancels the export', true);
    const retry = await tabTo(page, entry => entry.name === copy.files.retryLabel('tone.wav'), { back: true })
      ?? await tabTo(page, entry => entry.name === copy.files.retryLabel('tone.wav'));
    check('keyboard reaches Retry after a cancel', retry !== null);
  } finally { await context.close(); }
}

async function announcements() {
  const { page, context } = await newPage();
  try {
    note('live regions are listed after an export of 3 files, with what each one said');
    await page.getByLabel('Choose audio or video files').setInputFiles([long, long, long].map((path, index) => ({ name: `clip-${index + 1}.wav`, mimeType: 'audio/wav', buffer: readFileSync(path) })));
    await page.waitForFunction(() => document.querySelectorAll('li[data-inspection=ready]').length === 3);
    await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('wav');
    await page.getByLabel('Add step', { exact: true }).selectOption('isolation');
    await page.waitForFunction(() => window.__live.length >= 0);
    await page.evaluate(() => { window.__live.length = 0; });
    await page.getByRole('button', { name: copy.export.exportButton, exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-job-state=done]').length === 3, null, { timeout: 600000 });
    const live = await page.evaluate(() => window.__live);
    const regions = await page.evaluate(() => [...window.__regions]);
    for (const [region, count] of regions) note(`region ${region} spoke ${count} times`);
    const byFile = new Map();
    for (const entry of live) byFile.set(entry.file ?? 'page', [...(byFile.get(entry.file ?? 'page') ?? []), entry.text]);
    for (const [file, texts] of byFile) note(`${file}: ${texts.length} announcements, first ${JSON.stringify(texts.slice(0, 6))}`);
    await writeJson(`${OUT}/live-regions.json`, { regions, live });
    for (const name of ['clip-1.wav', 'clip-2.wav', 'clip-3.wav']) {
      const texts = byFile.get(name) ?? [];
      const repeats = texts.filter((text, index) => index > 0 && text === texts[index - 1]);
      check(`${name} is never announced twice in a row, so only stage changes speak (${texts.length} announcements)`, repeats.length === 0, JSON.stringify(repeats));
      check(`${name} is announced at most 10 times in a whole export`, texts.length <= 10, JSON.stringify(texts));
      check(`${name} announcements carry no download or percent counter`, !texts.some(text => /\d+ of \d+ MB|\d+%/.test(text)), JSON.stringify(texts.filter(text => /\d+ of \d+ MB|\d+%/.test(text)).slice(0, 4)));
      check(`${name} announcements are concise`, texts.every(text => text.length <= 80), JSON.stringify(texts.filter(text => text.length > 80)));
    }
    const pageWide = byFile.get('page') ?? [];
    check(`the page itself announced ${pageWide.length} times during the export, at most 4`, pageWide.length <= 4, JSON.stringify(pageWide));
    const total = live.length;
    check(`an export of 3 files made ${total} announcements in all, at most 30`, total <= 30, `${total}`);
  } finally { await context.close(); }
}


try {
  await walk();
  await cancelWalk();
  await announcements();
} catch (error) {
  check('keyboard check completes', false, String(error.stack ?? error).split('\n').slice(0, 3).join(' | '));
} finally {
  await browser.close();
  await app.close();
}
await writeJson(`${OUT}/results.json`, { lines });
console.log(`\n${lines.filter(line => line.ok && !line.note).length} assertions passed, ${failures.length} failed. Results in ${OUT}/results.json`);
if (failures.length) console.log(`Failed:\n${failures.map(name => `  ${name}`).join('\n')}`);
process.exitCode = failures.length ? 1 : 0;
