import test from 'node:test';
import assert from 'node:assert/strict';
import { copy, minus } from '../src/copy.ts';
import { STEP_NAMES, FORMAT_NAMES, isStepKind, isExportFormat } from '../src/recipe.ts';
import { ENCODING_MODES } from '../src/encoding-modes.ts';
import { LOUDNESS_MARKS } from '../src/loudness-rail.ts';
import { ERROR_CODES } from '../src/errors.ts';

const BANNED = [/\bGPU\b/i, /\bCPU\b/i, /\bcodecs?\b/i, /\bstream\b/i, /\bcleanup\b/i, /\btemporary\b/i, /\bidentity\b/i,
  /\bbackpressure\b/i, /\bisolation\b/i, /re-encoding/i, /Failed to fetch/i, /Error:/, /\bmodel\b/i, /\bwindow\b/i];
// The deck allows these exact phrases: the download label and its errors name "the voice/music model",
// "Keep original (no re-encoding)" is the decided export name, and "a normal window" is a browser window.
const ALLOWED = [/voice\/music model/g, /Downloading model/g, /The model download was damaged/g, /no re-encoding/g, /a normal window/g];
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') for (const entry of Object.values(value)) strings(entry, out);
  return out;
}
function visible(text) { return ALLOWED.reduce((rest, pattern) => rest.replace(pattern, ''), text); }

test('step and format names match the approved deck and drive the recipe tables', () => {
  assert.deepEqual({ ...STEP_NAMES }, {
    trim: 'Trim all', gain: 'Gain', normalize: 'Normalize', compress: 'Compressor', channels: 'Channels',
    resample: 'Sample rate', isolation: 'Voice / music splitter', speech: 'Remove background noise',
  });
  assert.deepEqual({ ...FORMAT_NAMES }, {
    mp3: 'MP3', m4a: 'M4A', wav: 'WAV', flac: 'FLAC', opus: 'Opus (.ogg)', original: 'Keep original (no re-encoding)',
  });
  assert.equal(copy.steps.heading, 'Steps');
  assert.deepEqual(Object.keys(STEP_NAMES), ['trim', 'gain', 'normalize', 'compress', 'channels', 'resample', 'isolation', 'speech']);
  assert.deepEqual(Object.keys(FORMAT_NAMES), ['mp3', 'm4a', 'wav', 'flac', 'opus', 'original']);
  assert(isStepKind('compress') && !isStepKind('recipe'));
  assert(isExportFormat('original') && !isExportFormat('ogg'));
});

test('encoding mode labels come from the copy and carry no description text', () => {
  for (const options of Object.values(ENCODING_MODES))
    for (const option of options) { assert.deepEqual(Object.keys(option).sort(), ['label', 'value']); }
  assert.deepEqual(ENCODING_MODES.opus.map(option => option.label), ['Constant (CBR)', 'Variable (VBR)']);
});

test('loudness marks use the short deck labels', () => {
  assert.deepEqual(LOUDNESS_MARKS.map(mark => `${copy.normalize.markValue(mark.value)} ${mark.label}`),
    ['\u221223 Broadcast', '\u221216 Podcast', '\u221214 Streaming', '\u22129.5 Loud', '\u22128 Maximum']);
});

test('no copy string or formatter output contains a banned term', () => {
  const samples = [
    ...strings(copy),
    copy.steps.moved('Gain', 2, 3), copy.steps.settings('Gain'), copy.trim.summary({ start: 10, end: 90 }), copy.trim.summary({ start: null, end: null }),
    copy.gain.summary(3), copy.gain.summary(-3), copy.normalize.summary({ mode: 'loudness', targetLufs: -14, ceilingDbtp: -0.3 }),
    copy.normalize.summary({ mode: 'peak', targetDbtp: -1 }), copy.compressor.summary({ preset: 'speech', amount: 50 }),
    copy.delivery.folderResult({ saved: 3, failed: 1, folder: 'Music/Out', cancelled: false }),
    copy.delivery.folderSkipped('a.mp3'), copy.delivery.folderUnfinished('a.mp3'), copy.copyNeedsEncoding(STEP_NAMES.isolation),
    copy.result.peakLimited({ achievedLufs: -15.1 }), copy.result.peakLimited({ achievedLufs: null }),
    ...['Preparing', 'Reading', 'Extracting', 'Decoding', 'Processing', 'Normalizing', 'Separating', 'Processing / encoding', 'Encoding', 'Saving', 'Analyzing for isolation', 'Loading isolation tools', 'Loading model']
      .map(phase => copy.progress.phase(phase)),
    copy.progress.label({ kind: 'model-download', loaded: 12_582_912, total: 85_034_606 }),
    copy.progress.label({ kind: 'isolation-progress', completed: 2, total: 5 }),
    copy.progress.preview({ kind: 'isolation-progress', completed: 2, total: 5 }),
  ];
  for (const text of samples) {
    assert.notEqual(text.trim(), '', 'copy strings are never empty');
    for (const pattern of BANNED) assert.doesNotMatch(visible(text), pattern, `"${text}" must not match ${pattern}`);
  }
});

test('written strings avoid long dashes and colons, except the two labelled hints the deck fixes', () => {
  const labelled = new Set([copy.splitter.hint, copy.noise.hint]);
  for (const text of strings(copy)) {
    assert.doesNotMatch(text, /[\u2014\u2013]/, text);
    if (!labelled.has(text)) assert.doesNotMatch(text, /: /, text);
  }
});

test('progress labels follow the staged wording and show percent or MB, never internal units', () => {
  const label = operation => copy.progress.label(operation);
  assert.equal(label({ kind: 'phase', phase: 'Preparing' }), 'Preparing\u2026');
  for (const phase of ['Reading', 'Extracting', 'Decoding', 'Analyzing for isolation', 'Loading isolation tools', 'Loading model'])
    assert.equal(label({ kind: 'phase', phase }), 'Preparing\u2026', phase);
  for (const phase of ['Processing', 'Normalizing', 'Processing / encoding'])
    assert.equal(label({ kind: 'phase', phase }), 'Processing\u2026', phase);
  assert.equal(label({ kind: 'phase', phase: 'Separating' }), 'Separating\u2026');
  for (const phase of ['Encoding', 'Saving']) assert.equal(label({ kind: 'phase', phase }), 'Saving\u2026', phase);
  assert.equal(label({ kind: 'model-download', loaded: 12_400_000, total: 85_034_606 }), 'Downloading model, 12 of 85 MB');
  assert.equal(label({ kind: 'model-download', loaded: 85_034_606, total: 85_034_606 }), 'Downloading model, 85 of 85 MB');
  assert.equal(label({ kind: 'isolation-progress', completed: 2, total: 5 }), 'Separating voice and music, 40%');
  assert.equal(label({ kind: 'isolation-progress', completed: 0, total: 4 }), 'Separating voice and music, 0%');
  assert.equal(label({ kind: 'isolation-progress', completed: 4, total: 4 }), 'Separating voice and music, 100%');
  assert.equal(label({ kind: 'isolation-progress', completed: 0, total: 0 }), 'Separating voice and music, 0%');
  assert.equal(copy.progress.preview({ kind: 'isolation-progress', completed: 2, total: 5 }), 'Previewing\u2026 40%');
  assert.equal(copy.progress.preview({ kind: 'phase', phase: 'Decoding' }), 'Previewing\u2026');
});

test('summaries use plain wording and true minus signs', () => {
  assert.equal(copy.trim.summary({ start: null, end: null }), 'Whole file');
  assert.equal(copy.trim.summary({ start: 0, end: null }), 'Whole file');
  assert.equal(copy.trim.summary({ start: 10, end: 90 }), '00:10 to 01:30');
  assert.equal(copy.trim.summary({ start: 10, end: null }), '00:10 to End');
  assert.equal(copy.trim.summary({ start: Number.NaN, end: null }), 'Set range');
  assert.equal(copy.gain.summary(3), '+3 dB \u00b7 May distort');
  assert.equal(copy.gain.summary(-3), '\u22123 dB');
  assert.equal(copy.gain.summary(0), '0 dB');
  assert.equal(copy.normalize.summary({ mode: 'loudness', targetLufs: -14, ceilingDbtp: -0.3 }), 'Loudness \u00b7 \u221214 LUFS \u00b7 \u22120.3 dBTP');
  assert.equal(copy.compressor.summary({ preset: 'speech', amount: 50 }), 'Speech \u00b7 50%');
  assert.equal(copy.levels.value(-4.52), '\u22124.5');
  assert.equal(copy.levels.value(null), '\u2212\u221e');
  assert.equal(minus(-9.5), '\u22129.5');
});

test('export status, folder results and Keep original notes match the deck', () => {
  assert.equal(copy.export.exporting(1, 2), 'Exporting 1 of 2');
  assert.equal(copy.delivery.savingProgress(2, 4), 'Saving 2 of 4');
  assert.equal(copy.delivery.folderResult({ saved: 3, failed: 0, folder: 'A/B', cancelled: false }), 'Saved 3 files to A/B.');
  assert.equal(copy.delivery.folderResult({ saved: 1, failed: 1, folder: 'A/B', cancelled: false }), "Saved 1 file to A/B. 1 couldn't be saved.");
  assert.equal(copy.delivery.folderResult({ saved: 0, failed: 0, folder: 'A/B', cancelled: true }), 'Cancelled.');
  assert.equal(copy.copyNeedsEncoding(STEP_NAMES.gain), 'Gain needs a format other than Keep original. Choose another format.');
});

test('every error code appears in the catalogue and the catalogue has no extra codes', () => {
  assert.deepEqual(Object.keys(copy.errors).sort(), [...ERROR_CODES].sort());
});
