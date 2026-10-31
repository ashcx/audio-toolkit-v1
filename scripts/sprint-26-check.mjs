import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:5184/audio-toolkit-v1/';
const root = process.env.SPRINT26_EVIDENCE_DIR ?? 'docs/sprint-evidence/sprint-26';
const outputs = '.artifacts/sprint-26-outputs';
const ffprobe = process.env.FFPROBE ?? '/opt/homebrew/bin/ffprobe';
await mkdir(`${root}/captures`, { recursive: true });
mkdirSync(outputs, { recursive: true });
function wav(seconds, kind, rate = 48000) {
  const frames = rate * seconds, bytes = Buffer.alloc(44 + frames * 4);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 4, 28); bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
  for (let frame = 0; frame < frames; frame++) {
    let value = 0;
    if (kind === 'tone') value = 0.3 * Math.sin((2 * Math.PI * 440 * frame) / rate) + 0.1 * Math.sin((2 * Math.PI * 1200 * frame) / rate);
    if (kind === 'transient') {
      const local = frame % Math.round(rate * 0.4);
      if (local < rate * 0.08) value = 0.7 * Math.exp(-local / (rate * 0.02)) * Math.sin((2 * Math.PI * 180 * local) / rate);
    }
    const sample = Math.round(Math.max(-1, Math.min(1, value)) * 32767);
    bytes.writeInt16LE(sample, 44 + frame * 4); bytes.writeInt16LE(sample, 46 + frame * 4);
  }
  return bytes;
}
const fixtures = {
  tone: `${outputs}/tone-20s.wav`,
  silence: `${outputs}/silence-20s.wav`,
  transient: `${outputs}/transient-20s.wav`,
};
writeFileSync(fixtures.tone, wav(20, 'tone'));
writeFileSync(fixtures.silence, wav(20, 'silence'));
writeFileSync(fixtures.transient, wav(20, 'transient'));
const browser = await chromium.launch({ channel: 'chrome' });
const observations = { appUrl, browser: 'chrome', rows: [], captures: [] };
async function exportOne({ format, bitrate, mode, fixture = fixtures.tone, capture }) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(appUrl);
  await page.waitForTimeout(400);
  const sourceName = fixture === 'tests/fixtures/video.mkv' ? 'video.mkv' : fixture.split('/').at(-1);
  await page.getByLabel('Choose audio or video files').setInputFiles(fixture);
  await page.waitForFunction(() => document.querySelector('[data-inspection=ready]'), null, { timeout: 30000 });
  await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption(format);
  if (await page.getByRole('button', { name: /^Preview / }).count()) throw new Error(`${format}: Preview visible with an empty recipe`);
  let modeLabel = null, bitrateLabel = null;
  if (format === 'opus') {
    const modeSelect = page.getByRole('combobox', { name: 'Encoding mode', exact: true });
    if (!(await modeSelect.count())) throw new Error('opus: Encoding mode control missing');
    await modeSelect.selectOption(mode);
    bitrateLabel = mode === 'vbr' ? 'Target bitrate (kbps)' : 'Bitrate (kbps)';
    if (!(await page.getByRole('combobox', { name: bitrateLabel, exact: true }).count())) throw new Error(`opus ${mode}: ${bitrateLabel} missing`);
    await page.getByRole('combobox', { name: bitrateLabel, exact: true }).selectOption(String(bitrate));
    const note = await page.locator('.export-panel .panel-description').innerText();
    if (mode === 'vbr' && !/Variable bitrate/.test(note)) throw new Error(`opus vbr note: ${note}`);
    if (mode === 'cbr' && !/Constant bitrate/.test(note)) throw new Error(`opus cbr note: ${note}`);
    modeLabel = await modeSelect.inputValue();
  } else if (format === 'mp3' || format === 'm4a') {
    if (await page.getByRole('combobox', { name: 'Encoding mode', exact: true }).count()) throw new Error(`${format}: unsupported Encoding mode control`);
    const note = await page.locator('.export-panel .panel-description').innerText();
    if (!/Constant bitrate/.test(note)) throw new Error(`${format}: constant-mode note missing: ${note}`);
    await page.getByRole('combobox', { name: 'Bitrate (kbps)', exact: true }).selectOption(String(bitrate));
  } else if (format === 'wav' || format === 'flac') {
    if (await page.getByRole('combobox', { name: 'Encoding mode', exact: true }).count()) throw new Error(`${format}: mode control must be hidden`);
    if (await page.getByRole('combobox', { name: 'Bitrate (kbps)', exact: true }).count()) throw new Error(`${format}: bitrate control must be hidden`);
  } else if (format === 'original') {
    if (await page.getByRole('combobox', { name: 'Encoding mode', exact: true }).count()) throw new Error('original: mode control must be hidden');
    if (await page.getByRole('combobox', { name: 'Bitrate (kbps)', exact: true }).count()) throw new Error('original: bitrate control must be hidden');
  }
  if (format !== 'original') {
    await page.getByLabel('Add step', { exact: true }).selectOption('gain');
    await page.getByLabel('Gain (dB) slider').evaluate(element => {
      element.value = '-6';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  if (capture) {
    await page.locator('.export-panel').screenshot({ path: `${root}/captures/${capture}.png`, animations: 'disabled', timeout: 60000 });
    observations.captures.push(`${root}/captures/${capture}.png`);
  }
  const started = Date.now();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const link = page.getByRole('link', { name: /Download exported audio/ });
  await link.waitFor({ timeout: 90000 });
  const elapsedMs = Date.now() - started;
  const href = await link.getAttribute('href');
  const player = page.locator('.file-result audio');
  const playerSrc = await player.getAttribute('src');
  if (playerSrc !== href) throw new Error(`${format} ${mode ?? ''}: playback and download differ`);
  const resultText = await page.locator('.file-result').innerText();
  if (!/Exported audio/.test(resultText)) throw new Error(`${format}: Exported audio label missing`);
  if (format === 'original' && !/No re-encoding/.test(resultText)) throw new Error('original: stream-copy explanation missing');
  const base64 = await page.evaluate(async href => {
    const bytes = new Uint8Array(await (await fetch(href)).arrayBuffer());
    let text = '';
    for (let index = 0; index < bytes.length; index += 0x8000)
      text += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(text);
  }, href);
  const extension = { mp3: 'mp3', m4a: 'm4a', opus: 'ogg', wav: 'wav', flac: 'flac', original: 'wav' }[format];
  const path = `${outputs}/${fixture === 'tests/fixtures/video.mkv' ? 'copy' : sourceName.replace('.wav', '')}-${format}-${bitrate ?? 'lossless'}-${mode ?? 'copy'}.${extension}`;
  await writeFile(path, Buffer.from(base64, 'base64'));
  const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-of', 'json', path], { encoding: 'utf8' })).streams[0];
  const packetCsv = execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'packet=size', '-of', 'csv=p=0', path], { encoding: 'utf8' });
  const sizes = packetCsv.trim().split('\n').filter(Boolean).map(line => Number(line.split(',')[0])).filter(Number.isFinite).sort((a, b) => a - b);
  const n = sizes.length, mean = sizes.reduce((sum, value) => sum + value, 0) / n;
  const packets = n ? { count: n, unique: new Set(sizes).size, min: sizes[0], median: sizes[Math.floor((n - 1) * 0.5)], max: sizes[n - 1], mean: +mean.toFixed(1) } : null;
  const row = {
    fixture: sourceName, format, mode: modeLabel, bitrate: bitrate ?? null,
    codec: probe.codec_name, channels: probe.channels, sampleRate: Number(probe.sample_rate),
    duration: Number(probe.duration), sizeBytes: statSync(path).size, elapsedMs,
    packets, errors,
  };
  if (row.duration < 19.5 || row.duration > 20.5) throw new Error(`${format} ${mode ?? ''}: duration ${row.duration}`);
  if (row.channels !== 2) throw new Error(`${format} ${mode ?? ''}: channels ${row.channels}`);
  if (errors.length) throw new Error(`${format}: ${errors.join('; ')}`);
  observations.rows.push(row);
  await context.close();
  return row;
}
try {
  await exportOne({ format: 'opus', bitrate: 128, mode: 'cbr', capture: '01-opus-cbr' });
  await exportOne({ format: 'opus', bitrate: 128, mode: 'vbr', capture: '02-opus-vbr' });
  await exportOne({ format: 'mp3', bitrate: 128, capture: '03-mp3-cbr' });
  await exportOne({ format: 'm4a', bitrate: 128, capture: '04-aac-cbr' });
  await exportOne({ format: 'wav', capture: '05-wav-controls' });
  await exportOne({ format: 'flac', capture: '06-flac-controls' });
  await exportOne({ format: 'opus', bitrate: 128, mode: 'cbr', fixture: fixtures.silence, capture: null });
  await exportOne({ format: 'opus', bitrate: 128, mode: 'vbr', fixture: fixtures.silence, capture: null });
  await exportOne({ format: 'opus', bitrate: 128, mode: 'cbr', fixture: fixtures.transient, capture: null });
  await exportOne({ format: 'opus', bitrate: 128, mode: 'vbr', fixture: fixtures.transient, capture: null });
  await exportOne({ format: 'original', fixture: fixtures.tone, capture: '07-stream-copy' });
  const opusCbr = observations.rows.find(row => row.format === 'opus' && row.mode === 'cbr' && row.fixture === 'tone-20s.wav');
  const opusVbr = observations.rows.find(row => row.format === 'opus' && row.mode === 'vbr' && row.fixture === 'tone-20s.wav');
  const mp3 = observations.rows.find(row => row.format === 'mp3');
  if (!opusCbr || !opusVbr || !mp3) throw new Error('missing comparison rows');
  if (opusCbr.packets.unique !== 1) throw new Error(`Opus CBR packets vary: ${opusCbr.packets.unique}`);
  if (opusVbr.packets.unique < 10) throw new Error(`Opus VBR packets are not variable: ${opusVbr.packets.unique}`);
  if (mp3.packets.unique !== 1) throw new Error(`MP3 CBR packets vary: ${mp3.packets.unique}`);
  const lossless = observations.rows.filter(row => row.format === 'wav' || row.format === 'flac');
  if (lossless.length !== 2) throw new Error('lossless exports missing');
  await writeFile(`${root}/result.json`, JSON.stringify(observations, null, 2) + '\n');
  console.log(`PASS: ${observations.rows.length} real exports. Opus CBR unique=${opusCbr.packets.unique}, Opus VBR unique=${opusVbr.packets.unique}, MP3 unique=${mp3.packets.unique}.`);
} finally {
  await browser.close();
}
