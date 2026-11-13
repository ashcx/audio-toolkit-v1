/**
 * Drives every interface state in real Chrome and checks what a person can read or hear in each one.
 *
 *  - Text. For each state the rendered text (innerText plus aria-label, title, aria-valuetext, placeholder,
 *    alt and option text) must contain no banned term (tests/support/banned-terms.mjs).
 *  - Layout. No horizontal overflow, and on phones nothing sits under the floating Export button.
 *  - Accessibility. axe-core runs on every state when its script is available. It is never a dependency of
 *    the repo. Install it anywhere and point AXE_PATH at axe.min.js, for example
 *      npm install --prefix "$TMPDIR/audio-toolkit-axe" axe-core
 *    The default path is $TMPDIR/audio-toolkit-axe/node_modules/axe-core/axe.min.js. A missing file skips axe.
 *
 * Environment. APP_URL uses a server that is already running, with no slow model download.
 * UI_CONFIGS limits the configurations (comma separated names). UI_STATES limits scenarios (regular expression).
 * Screenshots go to .artifacts/ui-states and are never committed.
 */
import { access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bannedIn } from '../tests/support/banned-terms.mjs';
import {FIXTURES, ensureDirectory, launchChrome, loadCopy, makeAudio, probeAudio, reporter, startApp, writeJson, withoutTimes} from './lib/harness.mjs';

const OUT = '.artifacts/ui-states';
const INPUTS = `${OUT}/inputs`;
const AXE_PATH = process.env.AXE_PATH ?? join(tmpdir(), 'audio-toolkit-axe', 'node_modules', 'axe-core', 'axe.min.js');
const copy = await loadCopy();
const { check, note, lines, failures } = reporter();

const CONFIGS = [
  { name: 'desktop-light', width: 1440, height: 1000, scheme: 'light', full: true },
  { name: 'desktop-dark', width: 1440, height: 1000, scheme: 'dark' },
  { name: 'phone390-light', width: 390, height: 844, scheme: 'light', phone: true },
  { name: 'phone390-dark', width: 390, height: 844, scheme: 'dark', phone: true },
  { name: 'phone320-light', width: 320, height: 700, scheme: 'light', phone: true },
];
const configFilter = process.env.UI_CONFIGS?.split(',');
const stateFilter = process.env.UI_STATES ? new RegExp(process.env.UI_STATES) : null;

let axeAvailable = false;
try { await access(AXE_PATH); axeAvailable = true; } catch {}
if (axeAvailable) note(`axe-core found at ${AXE_PATH}`);
else note(`axe skipped, no file at ${AXE_PATH}. Install axe-core outside the repo and set AXE_PATH to its axe.min.js to include it.`);

await ensureDirectory(INPUTS);
const long = `${INPUTS}/long-30s.wav`;
await makeAudio(long, { seconds: 30, rate: 44100, noise: true });
const loud = `${INPUTS}/loud-2s.wav`;
await makeAudio(loud, { seconds: 2, rate: 48000, volume: 6 });

const app = await startApp();
const axeResults = [];
const NAME = 'tone.wav';
const fixture = name => `${FIXTURES}/${name}`;

const picker = page => page.locator('input[type=file]');
const addStep = (page, kind) => page.getByLabel('Add step', { exact: true }).selectOption(kind);
const format = (page, value) => page.getByRole('combobox', { name: 'Format', exact: true }).selectOption(value);
const exportButton = page => page.getByRole('button', { name: 'Export', exact: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function load(page, files) {
  const list = Array.isArray(files) ? files : [files];
  await picker(page).setInputFiles(list);
  await page.waitForFunction(count => {
    const rows = [...document.querySelectorAll('li[data-inspection]')];
    return rows.length === count && rows.every(row => !['waiting', 'reading'].includes(row.dataset.inspection));
  }, list.length);
}
const waitDone = (page, count = 1, timeout = 120000) =>
  page.waitForFunction(n => document.querySelectorAll('[data-job-state=done]').length === n, count, { timeout });

const readText = () => {
  const attributes = ['aria-label', 'title', 'aria-valuetext', 'placeholder', 'aria-description', 'alt'];
  const parts = [document.body.innerText];
  for (const element of document.querySelectorAll('*'))
    for (const name of attributes) { const value = element.getAttribute(name); if (value) parts.push(value); }
  for (const option of document.querySelectorAll('option')) parts.push(option.textContent ?? '');
  return parts.join('\n');
};

/** Counts how often a sighted person sees a message. The spoken-only live regions are left out on purpose. */
const shownTimes = (page, message) => page.evaluate(needle => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    if (!node.parentElement.closest('.sr-only') && node.parentElement.checkVisibility()) text += `${node.textContent}\n`;
  return text.split(needle).length - 1;
}, message);

/**
 * WCAG 2.5.3 Label in Name. Every visible control that has visible label text must have an accessible name
 * that begins with that text, so that someone who says "Start" or reads "Amount" reaches the same control.
 * Names come from Chrome's accessibility tree. A control whose label is its own text (a button) or an
 * associated label element is compared. A control with no visible label of its own has nothing to match.
 */
async function labelInNameMismatches(page) {
  const probes = await page.evaluate(() => {
    const SKIP = 'select, input, textarea, output, audio, progress, [aria-hidden="true"], .sr-only';
    const visibleText = root => {
      const hidden = node => {
        for (let element = node.parentElement; element && element !== root; element = element.parentElement) if (element.matches(SKIP)) return true;
        return !node.parentElement.checkVisibility();
      };
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: node => hidden(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      let text = '';
      for (let node = walker.nextNode(); node; node = walker.nextNode()) text += ` ${node.textContent}`;
      return text.replace(/\s+/g, ' ').trim();
    };
    const found = [];
    const controls = document.querySelectorAll('button, summary, a[href], input:not([type=hidden]), select, textarea, [role=slider], [role=button]');
    for (const element of controls) {
      if (!element.checkVisibility() || element.closest('[aria-hidden="true"], .sr-only')) continue;
      if (element.hasAttribute('aria-labelledby')) continue;
      const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName) && !['button', 'submit', 'reset'].includes(element.type);
      const visible = isField
        ? [...(element.labels ?? [])].map(visibleText).join(' ').trim()
        : visibleText(element);
      if (!/[\p{L}\p{N}]/u.test(visible)) continue;
      const index = found.length;
      element.setAttribute('data-label-probe', String(index));
      found.push({ index, visible, description: `${element.tagName.toLowerCase()}${element.type ? `[${element.type}]` : ''}` });
    }
    return found;
  });
  if (!probes.length) return { count: 0, mismatches: [] };
  const session = await page.context().newCDPSession(page);
  await session.send('Accessibility.enable');
  const mismatches = [];
  try {
    const { root } = await session.send('DOM.getDocument', { depth: 0 });
    for (const probe of probes) {
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-label-probe="${probe.index}"]` });
      const { nodes } = await session.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      if (!nodes[0] || nodes[0].ignored) continue;
      const name = String(nodes[0]?.name?.value ?? '');
      const normal = value => value.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!normal(name).startsWith(normal(probe.visible))) mismatches.push(`${probe.description} "${name}" does not begin with "${probe.visible}"`);
    }
  } finally {
    await session.detach().catch(() => {});
    await page.evaluate(() => document.querySelectorAll('[data-label-probe]').forEach(element => element.removeAttribute('data-label-probe')));
  }
  return { count: probes.length, mismatches };
}

/** Settles the static-text scan, layout checks, screenshot and axe run for one state. */
async function capture(page, config, scenario, state, { shot = true } = {}) {
  const label = `${config.name}/${state}`;
  const text = await page.evaluate(readText);
  const found = bannedIn(text);
  check(`text ${label} has no banned term`, found.length === 0, `${found.join(' ')} in ${JSON.stringify(text.slice(0, 400))}`);
  check(`text ${label} shows no placeholder values`, !/\bundefined\b|\bNaN\b|\[object /.test(text));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`layout ${label} has no horizontal overflow`, overflow <= 0, `${overflow}px wider than the screen`);
  const small = await page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter(element => element.checkVisibility() && !element.closest('.sr-only') && [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()))
    .map(element => [element, parseFloat(getComputedStyle(element).fontSize)])
    .filter(([, size]) => size < 12)
    .map(([element, size]) => `${element.tagName.toLowerCase()} ${size}px ${element.textContent.trim().slice(0, 24)}`));
  check(`type ${label} shows no readable text under 12px`, small.length === 0, small.slice(0, 4).join(', '));
  const labels = await labelInNameMismatches(page);
  check(`labels ${label} start every accessible name with the visible label (${labels.count} controls)`, labels.mismatches.length === 0, labels.mismatches.slice(0, 4).join('; '));
  if (shot) await page.screenshot({ path: `${OUT}/${config.name}/${state}.png`, fullPage: true, animations: 'disabled' }).catch(() => {});
  if (axeAvailable) await runAxe(page, config, label);
  return text;
}

async function runAxe(page, config, label) {
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: AXE_PATH });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { resultTypes: ['violations'] });
    return result.violations.map(violation => ({
      id: violation.id, impact: violation.impact, help: violation.help, count: violation.nodes.length,
      targets: violation.nodes.slice(0, 4).map(node => node.target.join(' ')),
    }));
  });
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const violation of violations) counts[violation.impact] = (counts[violation.impact] ?? 0) + 1;
  axeResults.push({ label, counts, violations });
  check(`axe ${label} has no serious or critical violation (critical ${counts.critical}, serious ${counts.serious}, moderate ${counts.moderate}, minor ${counts.minor})`,
    counts.critical + counts.serious === 0,
    violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id} ${v.targets[0]}`).join('; '));
}

/** Scrolls a phone page to its end and lists what sits under the floating Export button. */
function measureFloating(page) {
  return page.evaluate(() => {
    const button = [...document.querySelectorAll('button.primary')].find(candidate => getComputedStyle(candidate).position === 'fixed');
    if (!button) return { floating: false };
    window.scrollTo(0, document.documentElement.scrollHeight);
    const box = button.getBoundingClientRect();
    const covered = [...document.querySelectorAll('button, a[href], select, input, summary, output, dd, dt, small, p, h2, label, span, audio')]
      .filter(element => element !== button && !button.contains(element) && element.checkVisibility())
      .filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > box.top && rect.top < box.bottom && rect.right > box.left && rect.left < box.right;
      }).map(element => `${element.tagName.toLowerCase()} ${(element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 30)}`);
    const atBottom = Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 2;
    return { floating: true, covered, atBottom, inViewport: box.bottom <= innerHeight && box.top >= 0 };
  });
}

async function floatingExportClear(page, label) {
  const result = await measureFloating(page);
  if (!result.floating) return;
  check(`phone ${label} floating Export stays in the viewport and the page scrolls to its end`, result.inViewport && result.atBottom);
  check(`phone ${label} scrolled to the bottom nothing sits under the floating Export button`, result.covered.length === 0, result.covered.join(', '));
  await page.evaluate(() => window.scrollTo(0, 0));
}

const INIT_RECORDER = () => {
  window.__labels = new Set();
  const record = () => {
    for (const element of document.querySelectorAll('.file-result, .file-preview, .run-status')) {
      const text = element.innerText.replace(/\s+/g, ' ').trim();
      if (text) window.__labels.add(`${element.className.split(' ')[0]}|${text}`);
    }
  };
  let queued = false;
  new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(() => { queued = false; record(); }); } })
    .observe(document, { subtree: true, childList: true, characterData: true });
};

async function makeContext(browser, config) {
  const context = await browser.newContext({
    acceptDownloads: true, colorScheme: config.scheme, viewport: { width: config.width, height: config.height }, hasTouch: !!config.phone,
  });
  await context.addInitScript(INIT_RECORDER);
  return context;
}

const pageProblems = new Map();

async function runConfig(browser, config) {
  await ensureDirectory(`${OUT}/${config.name}`);
  console.log(`\n== ${config.name} (${config.width}x${config.height}, ${config.scheme})`);
  const newContext = () => makeContext(browser, config);
  const shared = await newContext();
  const problems = [];
  pageProblems.set(config.name, problems);

  /**
   * options.cold runs in a fresh browser context, so nothing is cached and the model downloads again.
   * options.expectsConsoleErrors is for failure scenarios, where the app reports the technical detail to the console.
   */
  async function scenario(name, run, options = {}) {
    if (stateFilter && !stateFilter.test(name)) return;
    const context = options.cold ? await newContext() : shared;
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const blocked = { value: false };
    const model = url => url.includes('htdemucs');
    page.on('pageerror', error => problems.push(`${name}: page error ${error.message}`));
    page.on('console', message => {
      if (message.type() !== 'error' || /onnxruntime/.test(message.text())) return;
      if (options.expectsConsoleErrors || (blocked.value && /Failed to load resource|ERR_FAILED|net::/.test(message.text()))) return;
      problems.push(`${name}: console ${message.text()}`);
    });
    page.on('response', response => { if (response.status() >= 400 && !(blocked.value && model(response.url()))) problems.push(`${name}: HTTP ${response.status()} ${response.url()}`); });
    page.on('requestfailed', request => {
      const axeProbe = axeAvailable && request.url().startsWith('blob:') && request.failure()?.errorText === 'net::ERR_ABORTED';
      if (!axeProbe && !(blocked.value && model(request.url()))) problems.push(`${name}: request failed ${request.url()} ${request.failure()?.errorText}`);
    });
    const api = {
      page, blocked,
      shoot: (state, options) => capture(page, config, name, state, options),
      labels: () => page.evaluate(() => [...window.__labels]),
      floating: label => config.phone ? floatingExportClear(page, `${config.name}/${label}`) : Promise.resolve(),
    };
    try {
      await page.goto(app.url);
      await run(api);
    } catch (error) {
      const recent = await page.evaluate(() => [...(window.__labels ?? [])].slice(0, 14)).catch(() => []);
      check(`${config.name} scenario ${name} completes`, false, `${String(error.message ?? error).split('\n')[0]} | last labels ${JSON.stringify(recent)}`);
      await page.screenshot({ path: `${OUT}/${config.name}/${name}-error.png`, fullPage: true }).catch(() => {});
    } finally {
      await page.close();
      if (options.cold) await context.close();
    }
  }

  await scenario('empty', async ({ page, shoot }) => {
    await page.getByRole('heading', { name: copy.steps.heading }).waitFor();
    const text = await shoot('empty');
    check(`${config.name}/empty explains that steps run top to bottom`, text.includes(copy.steps.empty));
    await addStep(page, 'gain');
    check(`${config.name}/empty gives way to a one-line hint once a step exists`, (await page.locator('.recipe-panel').innerText()).includes(copy.steps.hint) && !(await page.locator('.recipe-panel').innerText()).includes(copy.steps.empty));
  });

  await scenario('files', async ({ page, shoot, floating }) => {
    await load(page, [fixture('tone.wav'), fixture('tone.mp3')]);
    await shoot('files-loaded');
    await addStep(page, 'gain');
    await page.locator('.level-readout').waitFor();
    await shoot('files-loaded-gain-open');
    await floating('gain-open');
  });

  if (config.phone) {
    await scenario('control-floating-detector', async ({ page }) => {
      await load(page, [fixture('tone.wav'), fixture('tone.mp3')]);
      await addStep(page, 'gain');
      await page.locator('.level-readout').waitFor();
      await page.addStyleTag({ content: '.workspace, .app { padding-bottom: 0 !important; } .run-actions-group { justify-content: flex-end !important; } .recipe-column { padding-bottom: 0 !important; }' });
      const result = await measureFloating(page);
      check(`control ${config.name}: with the padding gone and the actions moved right the check finds controls under the Export button`, result.floating && result.covered.length > 0, JSON.stringify(result));
    });
  }

  await scenario('steps', async ({ page, shoot, floating }) => {
    await load(page, [fixture('tone.wav'), fixture('tone.mp3')]);
    for (const kind of ['trim', 'gain', 'normalize', 'compress', 'channels', 'resample', 'isolation', 'speech']) {
      await addStep(page, kind);
      await page.locator(`[data-step-id] .step-toggle[aria-expanded=true]`).waitFor();
      if (kind === 'gain' || kind === 'normalize') await page.locator('.level-readout').waitFor();
      if (kind === 'isolation') await page.locator('[data-isolation-device]:not([data-isolation-device=checking])').waitFor();
      await shoot(`step-open-${kind}`);
      if (kind === 'normalize') {
        await page.getByRole('radio', { name: copy.normalize.modes.loudness }).check();
        await page.locator('.lufs-rail').waitFor();
        await shoot('step-open-normalize-loudness');
      }
    }
    await floating('all-steps-open');
  });

  await scenario('formats', async ({ page, shoot }) => {
    await load(page, [fixture('tone.wav'), fixture('tone.mp3')]);
    for (const value of Object.keys(copy.export.formats)) {
      await format(page, value);
      await shoot(`format-${value}`);
      const modes = page.getByRole('combobox', { name: copy.export.modeLabel, exact: true });
      if (await modes.count()) {
        for (const option of await modes.locator('option').evaluateAll(nodes => nodes.map(node => node.value))) {
          await modes.selectOption(option);
          await shoot(`format-${value}-${option}`, { shot: false });
        }
      }
    }
    await addStep(page, 'gain');
    await page.getByRole('slider', { name: copy.slider(copy.gain.label) }).press('ArrowRight');
    await format(page, 'original');
    await page.getByText(copy.errors['copy-needs-encoding'].message).first().waitFor();
    const text = await shoot('format-original-with-step');
    const count = text.split(copy.errors['copy-needs-encoding'].message).length - 1;
    check(`${config.name}/format-original-with-step shows its message once per file`, count === 2, `${count} times`);
  });

  await scenario('settings', async ({ page, shoot }) => {
    await page.getByRole('button', { name: copy.settings.open, exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await shoot('settings');
    await page.getByRole('button', { name: copy.settings.close, exact: true }).click();
  });

  await scenario('success-plain-mp3', async ({ page, shoot, floating }) => {
    await load(page, [fixture('tone.wav'), fixture('tone.mp3')]);
    await format(page, 'mp3');
    await exportButton(page).click();
    await waitDone(page, 2);
    const text = await shoot('success-plain-mp3');
    const rows = await page.locator('.file-result').evaluateAll(nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim()));
    check(`${config.name}/success-plain-mp3 each result shows only its label and player`, rows.length === 2 && rows.every(row => withoutTimes(row) === copy.result.label), JSON.stringify(rows));
    check(`${config.name}/success-plain-mp3 shows no standing hint or counter`, !/\d+\s*\/\s*\d+\s*done|done/i.test(await page.locator('.export-panel').innerText())
      && !text.includes(copy.export.keepOpen) && !/Exported audio|Clear all removes/.test(text));
    check(`${config.name}/success-plain-mp3 status area is empty`, (await page.locator('.run-status').innerText()).trim() === '');
    await floating('success');
  });

  await scenario('success-several-steps', async ({ page, shoot }) => {
    await load(page, [fixture('tone.wav'), fixture('tone.mp3')]);
    await format(page, 'wav');
    for (const kind of ['gain', 'normalize', 'compress', 'channels']) await addStep(page, kind);
    await exportButton(page).click();
    await waitDone(page, 2);
    await shoot('success-several-steps');
    const notes = await page.locator('.file-result').evaluateAll(nodes => nodes.map(node => node.querySelectorAll('small').length - 1));
    check(`${config.name}/success-several-steps shows at most one note per file`, notes.length === 2 && notes.every(count => count <= 1), JSON.stringify(notes));
  });

  await scenario('success-with-note', async ({ page, shoot }) => {
    await load(page, loud);
    await format(page, 'wav');
    await addStep(page, 'gain');
    await page.getByRole('slider', { name: copy.slider(copy.gain.label) }).press('End');
    await exportButton(page).click();
    await waitDone(page, 1);
    const text = await shoot('success-with-note');
    check(`${config.name}/success-with-note shows exactly one clipping note`, await shownTimes(page, copy.result.clipped) === 1);
  });

  await scenario('delivery', async ({ page, shoot, floating }) => {
    await load(page, [fixture('tone.wav'), fixture('tone.mp3')]);
    await format(page, 'wav');
    await addStep(page, 'gain');
    await exportButton(page).click();
    await waitDone(page, 2);
    const menu = page.locator('.delivery-menu > summary');
    await menu.click();
    await page.locator('.delivery-options').waitFor();
    await shoot('save-menu');
    if (config.phone) {
      const overlap = await page.evaluate(() => {
        const options = document.querySelector('.delivery-options').getBoundingClientRect();
        return [...document.querySelectorAll('button, a[href], select, input, summary')]
          .filter(element => element.checkVisibility() && !element.closest('.delivery-options'))
          .filter(element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.bottom > options.top && r.top < options.bottom && r.right > options.left && r.left < options.right; })
          .map(element => element.getAttribute('aria-label') ?? element.textContent.trim());
      });
      check(`${config.name}/save-menu covers no other control`, overlap.length === 0, overlap.join(', '));
    }
    await page.keyboard.press('Escape');
    check(`${config.name}/save-menu closes with Escape and focus returns to its button`, await page.evaluate(() => !document.querySelector('.delivery-menu').open && document.activeElement?.tagName === 'SUMMARY'));
    await menu.click();
    await page.getByRole('button', { name: copy.delivery.discard, exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[data-job-state=done]'));
    await shoot('exports-discarded');
    check(`${config.name}/exports-discarded leaves Export available`, await exportButton(page).isEnabled());
    await floating('discarded');
  });

  await scenario('cancelled', async ({ page, shoot }) => {
    await page.route('**/htdemucs_fp16.onnx', async route => { await sleep(4000); await route.continue().catch(() => {}); });
    await load(page, fixture('tone.wav'));
    await format(page, 'wav');
    await addStep(page, 'isolation');
    await exportButton(page).click();
    await page.getByRole('button', { name: copy.files.cancelLabel(NAME), exact: true }).click();
    await page.locator('[data-job-state=cancelled]').waitFor();
    const text = await shoot('cancelled');
    check(`${config.name}/cancelled shows Cancelled and a Retry button`, text.includes(copy.files.cancelled) && await page.getByRole('button', { name: copy.files.retryLabel(NAME), exact: true }).count() === 1);
    check(`${config.name}/cancelled leaves no standing hint`, !text.includes(copy.export.keepOpen) && (await page.locator('.run-status').innerText()).trim() === '');
    await page.unroute('**/htdemucs_fp16.onnx');
  }, { expectsConsoleErrors: true });

  await scenario('failures-files', async ({ page, shoot }) => {
    for (const [file, code] of [['corrupt.wav', 'file-unreadable'], ['no-audio.mp4', 'file-no-audio'], ['unsupported.mkv', 'file-unsupported-audio']]) {
      await picker(page).setInputFiles(fixture(file));
      await page.locator('li[data-inspection=failed]').waitFor();
      const text = await shoot(`failure-${code}`);
      const message = copy.errors[code].message;
      check(`${config.name}/failure-${code} shows its catalogue message once`, await shownTimes(page, message) === 1, `${await shownTimes(page, message)} times`);
      check(`${config.name}/failure-${code} offers Remove`, await page.getByRole('button', { name: copy.files.removeLabel(file), exact: true }).count() === 1);
      await page.getByRole('button', { name: copy.files.removeLabel(file), exact: true }).click();
    }
  }, { expectsConsoleErrors: true });

  await scenario('failures-trim', async ({ page, shoot }) => {
    await load(page, fixture('tone.wav'));
    await addStep(page, 'trim');
    const start = page.getByLabel(copy.trim.startField(copy.trim.prefix), { exact: true });
    const end = page.getByLabel(copy.trim.endField(copy.trim.prefix), { exact: true });
    await start.fill('00:01.5');
    await end.fill('00:01');
    await page.getByText(copy.errors['trim-order'].message).first().waitFor();
    let text = await shoot('failure-trim-order');
    check(`${config.name}/failure-trim-order shows the message once`, text.split(copy.errors['trim-order'].message).length - 1 === 1, `${text.split(copy.errors['trim-order'].message).length - 1} times`);
    check(`${config.name}/failure-trim-order shows it at the step, not under the file`, await page.locator('.file-list .file-error').count() === 0);
    await start.fill('00:05');
    await end.fill('');
    await page.getByText(copy.errors['trim-past-end'].message).first().waitFor();
    text = await shoot('failure-trim-past-end');
    check(`${config.name}/failure-trim-past-end shows the message once`, text.split(copy.errors['trim-past-end'].message).length - 1 === 1, `${text.split(copy.errors['trim-past-end'].message).length - 1} times`);
    await start.fill('abc');
    await page.getByText(copy.errors['time-invalid'].message).first().waitFor();
    text = await shoot('failure-time-invalid');
    check(`${config.name}/failure-time-invalid shows the message once`, text.split(copy.errors['time-invalid'].message).length - 1 === 1, `${text.split(copy.errors['time-invalid'].message).length - 1} times`);
  }, { expectsConsoleErrors: true });

  await scenario('failures-planner', async ({ page, shoot }) => {
    await load(page, fixture('tone.wav'));
    await format(page, 'mp3');
    await addStep(page, 'resample');
    await page.locator('.step-settings select').selectOption('16000');
    await page.getByRole('combobox', { name: copy.export.bitrateLabel, exact: true }).selectOption('320');
    const message = copy.errors['mp3-bitrate'].message;
    await page.getByText(message).first().waitFor();
    const text = await shoot('failure-mp3-bitrate');
    check(`${config.name}/failure-mp3-bitrate shows the message once`, await shownTimes(page, message) === 1, `${await shownTimes(page, message)} times`);
    await format(page, 'm4a');
    await addStep(page, 'channels');
    await page.getByRole('radio', { name: copy.channels.options.mono }).check();
    await page.getByRole('combobox', { name: copy.export.bitrateLabel, exact: true }).selectOption('256');
    const aac = copy.errors['aac-bitrate'].message;
    await page.getByText(aac).first().waitFor();
    const aacText = await shoot('failure-aac-bitrate');
    check(`${config.name}/failure-aac-bitrate shows the message once`, aacText.split(aac).length - 1 === 1, `${aacText.split(aac).length - 1} times`);
  }, { expectsConsoleErrors: true });

  await scenario('failures-model-blocked', async ({ page, shoot, blocked }) => {
    blocked.value = true;
    await page.route('**/htdemucs_fp16.onnx', route => route.abort('failed'));
    await load(page, fixture('tone.wav'));
    await format(page, 'wav');
    await addStep(page, 'isolation');
    await exportButton(page).click();
    await page.locator('[data-job-state=failed]').waitFor();
    const message = copy.errors['model-download-failed'].message;
    const text = await shoot('failure-model-blocked');
    check(`${config.name}/failure-model-blocked shows the catalogue message once`, await shownTimes(page, message) === 1, `${await shownTimes(page, message)} times`);
    check(`${config.name}/failure-model-blocked offers Retry`, await page.locator('.file-result').getByRole('button', { name: copy.files.retryLabel(NAME), exact: true }).count() === 1);
    await page.unroute('**/htdemucs_fp16.onnx');
    blocked.value = false;
    await page.getByRole('button', { name: copy.files.retryLabel(NAME), exact: true }).click();
    await waitDone(page, 1);
    check(`${config.name}/failure-model-blocked recovers after Retry`, true);
    await shoot('recovered-after-retry');
  }, { expectsConsoleErrors: true });

  await scenario('failures-model-damaged', async ({ page, shoot }) => {
    await page.route('**/htdemucs_fp16.onnx', route => route.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(1 << 20) }));
    await load(page, fixture('tone.wav'));
    await format(page, 'wav');
    await addStep(page, 'isolation');
    await exportButton(page).click();
    await page.locator('[data-job-state=failed]').waitFor();
    const message = copy.errors['model-damaged'].message;
    const text = await shoot('failure-model-damaged');
    check(`${config.name}/failure-model-damaged shows the catalogue message once`, await shownTimes(page, message) === 1, `${await shownTimes(page, message)} times`);
    check(`${config.name}/failure-model-damaged offers Retry`, await page.getByRole('button', { name: copy.files.retryLabel(NAME), exact: true }).count() === 1);
  }, { expectsConsoleErrors: true });

  const faults = [
    { fault: 'encode', code: 'processing-failed', action: 'retry' },
    { fault: 'process', code: 'audio-damaged', action: 'remove' },
  ];
  for (const { fault, code, action } of faults) {
    await scenario(`failures-processing-${fault}`, async ({ page, shoot }) => {
      await page.addInitScript(kind => {
        window.__fault = true;
        const Original = window.Worker;
        window.Worker = new Proxy(Original, {
          construct(target, args) {
            const worker = Reflect.construct(target, args);
            if (!String(args[0]).includes('pcm-worker')) return worker;
            const post = worker.postMessage.bind(worker);
            worker.postMessage = (data, ...rest) => {
              if (data?.kind === 'start' && window.__fault) {
                window.__fault = false;
                data = structuredClone(data);
                if (kind === 'process') data.plan.steps = [{ id: 'injected', kind: 'gain', db: 1e9 }];
                if (kind === 'encode') data.plan.snapshot.recipe.export = { format: 'mp3', bitrateKbps: -1 };
              }
              return post(data, ...rest);
            };
            return worker;
          },
        });
      }, fault);
      await page.reload();
      await load(page, fixture('tone.wav'));
      await format(page, 'wav');
      await addStep(page, 'gain');
      await exportButton(page).click();
      await page.locator('[data-job-state=failed]').waitFor();
      const message = copy.errors[code].message;
      const text = await shoot(`failure-${code}`);
      check(`${config.name}/failure-${code} shows the catalogue message once`, await shownTimes(page, message) === 1, JSON.stringify(await page.locator('[data-job-state=failed]').innerText()));
      const button = action === 'remove' ? copy.files.removeLabel(NAME) : copy.files.retryLabel(NAME);
      check(`${config.name}/failure-${code} offers ${copy.actions[action]}`, await page.locator('.file-result').getByRole('button', { name: button, exact: true }).count() === 1);
      if (action === 'retry') {
        await page.getByRole('button', { name: button, exact: true }).click();
        await waitDone(page, 1);
        check(`${config.name}/failure-${code} recovers after Retry`, true);
      }
    }, { expectsConsoleErrors: true });
  }

  await scenario('failures-storage-full', async ({ page, shoot }) => {
    await page.addInitScript(() => {
      window.__full = true;
      const proto = window.FileSystemFileHandle.prototype, create = proto.createWritable;
      proto.createWritable = async function (...args) {
        const writer = await create.apply(this, args), write = writer.write.bind(writer);
        writer.write = async value => { if (window.__full) { window.__full = false; throw new DOMException('Full', 'QuotaExceededError'); } return write(value); };
        return writer;
      };
    });
    await page.reload();
    await load(page, fixture('tone.wav'));
    await format(page, 'wav');
    await addStep(page, 'gain');
    await exportButton(page).click();
    await page.locator('[data-job-state=failed]').waitFor();
    const message = copy.errors['storage-full'].message;
    const text = await shoot('failure-storage-full');
    check(`${config.name}/failure-storage-full shows the catalogue message once`, await shownTimes(page, message) === 1, JSON.stringify(await page.locator('[data-job-state=failed]').innerText()));
    await page.getByRole('button', { name: copy.files.retryLabel(NAME), exact: true }).click();
    await waitDone(page, 1);
    check(`${config.name}/failure-storage-full recovers after Retry`, true);
  }, { expectsConsoleErrors: true });

  await scenario('preview', async ({ page, shoot }) => {
    await load(page, [long, fixture('tone.wav')]);
    await addStep(page, 'gain');
    const longName = 'long-30s.wav';
    const cut = page.getByRole('button', { name: copy.preview.buttonLabel(longName, 15), exact: true });
    const short = page.getByRole('button', { name: copy.preview.buttonLabel(NAME, null), exact: true });
    check(`${config.name}/preview names 15 s on a 30 s file`, (await cut.innerText()) === copy.preview.button(15), await cut.innerText());
    check(`${config.name}/preview says plain Preview on a 2 s file`, (await short.innerText()) === copy.preview.button(null), await short.innerText());
    await shoot('preview-idle');
    await cut.click();
    await page.locator('[data-preview-state=ready]').waitFor();
    const text = await shoot('preview-ready');
    check(`${config.name}/preview-ready heads the excerpt with its real length`, text.includes(copy.preview.heading(15)));
    check(`${config.name}/preview-ready shows Before and After players`,
      await page.locator('.file-preview .wave-label', { hasText: copy.preview.before }).count() === 1
      && await page.locator('.file-preview .wave-label', { hasText: copy.preview.after }).count() === 1);
    await page.getByRole('button', { name: copy.preview.close, exact: true }).click();
    await short.click();
    await page.locator('[data-preview-state=ready]').waitFor();
    const shortText = await shoot('preview-ready-short', { shot: false });
    check(`${config.name}/preview-ready-short heads a short file without a length`, shortText.includes(copy.preview.heading(null)) && !shortText.includes('15 seconds'));
  });

  await scenario('preview-running', async ({ page, shoot }) => {
    await page.route('**/htdemucs_fp16.onnx', async route => { await sleep(3000); await route.continue().catch(() => {}); });
    await load(page, fixture('tone.wav'));
    await addStep(page, 'isolation');
    await page.getByRole('button', { name: copy.preview.buttonLabel(NAME, null), exact: true }).click();
    await page.locator('[data-preview-state=running]').waitFor();
    const text = await shoot('preview-running');
    check(`${config.name}/preview-running shows plain progress and a Cancel`, /Previewing…/.test(text) && text.includes(copy.preview.cancel));
    await page.locator('[data-preview-state=ready]').waitFor({ timeout: 120000 });
    await shoot('preview-ready-split', { shot: false });
    await page.unroute('**/htdemucs_fp16.onnx');
  });

  await scenario('splitter-run', async ({ page, shoot, labels, floating }) => {
    if (config.full) app.throttle?.({ chunkBytes: 2 * 1024 * 1024, delayMs: 90 });
    await load(page, long);
    await format(page, 'wav');
    await addStep(page, 'isolation');
    await page.locator('[data-isolation-device]:not([data-isolation-device=checking])').waitFor();
    await exportButton(page).click();
    const download = /Downloading model, \d+ of 85 MB/;
    if (config.full && app.throttle) {
      await page.waitForFunction(() => /Downloading model, \d+ of 85 MB/.test(document.querySelector('.file-result')?.innerText ?? ''), null, { timeout: 60000 });
      const text = await shoot('splitter-downloading');
      check(`${config.name}/splitter-downloading shows "Downloading model, N of 85 MB" on screen`, download.test(text));
      await floating('splitter-downloading');
    }
    await page.waitForFunction(() => /Separating voice and music, \d+%/.test(document.querySelector('.file-result')?.innerText ?? ''), null, { timeout: 180000 }).catch(() => {});
    if (/Separating voice and music/.test(await page.locator('.file-result').first().innerText().catch(() => ''))) await shoot('splitter-separating');
    await waitDone(page, 1, 300000);
    app.throttle?.(null);
    await shoot('splitter-done');
    const seen = (await labels()).filter(entry => entry.startsWith('file-result|')).map(entry => entry.slice('file-result|'.length).replace(/ Cancel$/, ''));
    const stage = /^(Waiting|Preparing…|Processing…|Separating…|Saving…|Cancelling…|Downloading model, \d+ of 85 MB|Separating voice and music, \d+%|Result( .*)?)$/;
    const odd = seen.filter(label => !stage.test(label));
    check(`${config.name}/splitter-run only ever showed staged progress labels`, odd.length === 0, JSON.stringify(odd));
    check(`${config.name}/splitter-run never showed a window counter, GPU or CPU`, !seen.some(label => /\d+\s*\/\s*\d+|GPU|CPU/.test(label)));
    const percents = [...new Set(seen.flatMap(label => label.match(/^Separating voice and music, (\d+)%$/)?.[1] ?? []))].map(Number);
    check(`${config.name}/splitter-run showed Separating voice and music with a percent`, percents.length >= 1, JSON.stringify(seen));
    if (config.full && app.throttle) {
      const megabytes = [...new Set(seen.flatMap(label => label.match(/^Downloading model, (\d+) of 85 MB$/)?.[1] ?? []))].map(Number);
      check(`${config.name}/splitter-run showed the download advancing in MB`, megabytes.length >= 3 && megabytes.every((value, index) => index === 0 || value > megabytes[index - 1]), JSON.stringify(megabytes));
    }
    check(`${config.name}/splitter-run ended with the plain result card`, seen.at(-1) === copy.result.label || /^Result/.test(seen.at(-1) ?? ''));
    check(`${config.name}/splitter-run status area is empty afterwards`, (await page.locator('.run-status').innerText()).trim() === '');
    check(`${config.name}/splitter-run result shows at most one note`, (await page.locator('.file-result small').count()) - 1 <= 1);
  }, { cold: true });

  if (config.full) {
    await scenario('opus-rates', async ({ page, shoot }) => {
      for (const rate of [44100, 22050, 96000]) {
        const path = `${INPUTS}/source-${rate}.wav`;
        await makeAudio(path, { seconds: 2, rate });
        await page.goto(app.url);
        await load(page, path);
        await format(page, 'opus');
        check(`opus ${rate} Hz needs no Sample rate step`, await page.locator('[data-step-id]').count() === 0 && await exportButton(page).isEnabled());
        await exportButton(page).click();
        await waitDone(page, 1, 60000);
        const row = withoutTimes(await page.locator('.file-result').innerText());
        check(`opus ${rate} Hz export succeeds with no message`, row === copy.result.label, row);
        if (rate === 44100) await shoot('opus-44100-done');
        const pending = page.waitForEvent('download');
        await page.locator('[data-job-state=done] a[download]').click();
        const download = await pending;
        const output = `${INPUTS}/result-${rate}.ogg`;
        await download.saveAs(output);
        const { stream, duration } = probeAudio(output);
        check(`opus ${rate} Hz source decodes at 48000 Hz`, stream.codec_name === 'opus' && Number(stream.sample_rate) === 48000, `${stream.codec_name} ${stream.sample_rate}`);
        check(`opus ${rate} Hz keeps its length`, Math.abs(duration - 2) <= 0.05, `${duration}`);
      }
    });
  }

  await shared.close();
}

let browser = await launchChrome();
try {
  for (const config of CONFIGS) {
    if (configFilter && !configFilter.includes(config.name)) continue;
    await runConfig(browser, config);
  }
} finally {
  await browser.close();
}

if (!stateFilter || /cpu/.test(process.env.UI_STATES)) {
  browser = await launchChrome(['--disable-gpu', '--disable-software-rasterizer']);
  const config = CONFIGS[0];
  try {
    await ensureDirectory(`${OUT}/cpu-fallback`);
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: config.width, height: config.height } });
    await context.addInitScript(() => {
      window.__labels = new Set();
      new MutationObserver(() => {
        for (const element of document.querySelectorAll('.file-result')) window.__labels.add(element.innerText.replace(/\s+/g, ' ').trim());
      }).observe(document, { subtree: true, childList: true, characterData: true });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(300000);
    await page.goto(app.url);
    check('cpu-fallback launch has no WebGPU adapter', await page.evaluate(async () => !(await navigator.gpu?.requestAdapter().catch(() => null))));
    await load(page, fixture('tone.wav'));
    await format(page, 'wav');
    await addStep(page, 'isolation');
    await page.locator('[data-isolation-device=cpu]').waitFor();
    const text = await capture(page, { ...config, name: 'cpu-fallback' }, 'cpu', 'splitter-open-no-acceleration');
    check('cpu-fallback shows the slow-device warning in plain words', text.includes(copy.splitter.slowDevice));
    await exportButton(page).click();
    await waitDone(page, 1, 300000);
    const seen = await page.evaluate(() => [...window.__labels]);
    check('cpu-fallback run showed no device words', !seen.some(label => /GPU|CPU|\d+\s*\/\s*\d+/.test(label)), JSON.stringify(seen));
    await capture(page, { ...config, name: 'cpu-fallback' }, 'cpu', 'splitter-done-no-acceleration');
  } catch (error) {
    check('cpu-fallback scenario completes', false, String(error.message ?? error).split('\n')[0]);
  } finally {
    await browser.close();
  }
}

await app.close();

for (const [name, problems] of pageProblems) {
  check(`console ${name} had no page error, failed request or console error`, problems.length === 0, problems.slice(0, 5).join(' | '));
}
await writeJson(`${OUT}/results.json`, { lines, axe: axeResults });
console.log(`\n${lines.filter(line => line.ok && !line.note).length} assertions passed, ${failures.length} failed. Results in ${OUT}/results.json`);
if (failures.length) console.log(`Failed:\n${failures.map(name => `  ${name}`).join('\n')}`);
process.exitCode = failures.length ? 1 : 0;
