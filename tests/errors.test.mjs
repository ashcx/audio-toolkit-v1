import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { copy } from '../src/copy.ts';
import {
  ERROR_CODES, UserFacingError, errorCode, failureOf, failure, messageFor, actionFor, validationMessage, isErrorCode,
} from '../src/errors.ts';
import { newRecipe, newStep, recipeSchema, resolveTrim, trimRangeSchema, stepSchema } from '../src/recipe.ts';
import { resultNote } from '../src/result-note.ts';

const GENERIC = 'Something went wrong with this file. Try again.';
const BANNED = [/\bGPU\b/i, /\bCPU\b/i, /\bcodecs?\b/i, /\bstream\b/i, /\bcleanup\b/i, /\btemporary\b/i, /\bidentity\b/i,
  /\bbackpressure\b/i, /\bisolation\b/i, /re-encoding/i, /Failed to fetch/i, /Error:/, /\bwindow\b/i, /\bmodel\b/i];
const ALLOWED = [/voice\/music model/g, /The model download was damaged/g, /a normal window/g];
const LEVEL_TERMS = /\b(dB|dBFS|dBTP|LUFS|RMS)\b/;
const LEVEL_CODES = new Set(['gain-range', 'loudness-range', 'loudness-step', 'peak-range', 'true-peak-range', 'true-peak-step', 'ceiling-range', 'ceiling-step', 'compression-range']);
const shown = (error, fallback) => messageFor(errorCode(error, fallback));
const quiet = async work => {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args);
  try { return { value: await work(), logged }; } finally { console.error = original; }
};

test('every error code has a plain non-empty message and a known action', () => {
  for (const code of ERROR_CODES) {
    const message = messageFor(code);
    assert(message.trim().length > 0, `${code} has a message`);
    assert.match(message, /[.]$/, `${code} ends as a sentence`);
    assert.notEqual(message, code);
    assert([null, 'retry', 'try-again', 'remove', 'download'].includes(actionFor(code)), `${code} action`);
    assert(isErrorCode(code));
  }
  assert.equal(actionFor('model-download-failed'), 'retry');
  assert.equal(actionFor('file-no-audio'), 'remove');
  assert.equal(actionFor('folder-blocked'), 'download');
  assert.equal(actionFor('trim-order'), null);
});

test('no catalogue message contains a banned term, and level terms stay on level controls', () => {
  for (const code of ERROR_CODES) {
    const text = ALLOWED.reduce((rest, pattern) => rest.replace(pattern, ''), messageFor(code));
    for (const pattern of BANNED) assert.doesNotMatch(text, pattern, `${code}: ${messageFor(code)}`);
    if (!LEVEL_CODES.has(code)) assert.doesNotMatch(text, LEVEL_TERMS, `${code} must not use level terms`);
    assert.doesNotMatch(text, /[—–]/);
  }
});

test('the catalogue carries the approved wording for the conditions the audit found', () => {
  const expected = {
    'file-unreadable': "This file can't be read. Try another file.",
    'file-no-audio': 'This file has no audio.',
    'file-unsupported-audio': "This file's audio format isn't supported.",
    'model-download-failed': "Couldn't download the voice/music model. Check your connection and try again.",
    'storage-full': 'Not enough space to finish. Free some space and try again.',
    'processing-failed': GENERIC,
    'folder-blocked': "Couldn't save to that folder. Download the files instead.",
    'storage-stuck': "Couldn't free some storage.",
    'split-stalled': 'Voice / music splitting stopped responding. Try again, or try a shorter clip.',
  };
  for (const [code, message] of Object.entries(expected)) assert.equal(messageFor(code), message);
});

test('raw errors map to the generic message and never echo their text', async () => {
  const raw = [new Error('Failed to fetch'), new TypeError('NetworkError when attempting to fetch resource.'),
    new Error('Each step needs a unique identity.'), new DOMException('denied', 'NotAllowedError'), 'a string', null, undefined, { message: 'Error: boom' }];
  for (const error of raw) {
    assert.equal(shown(error), GENERIC);
    assert.equal(errorCode(error), 'processing-failed');
    const { value, logged } = await quiet(() => failureOf(error));
    assert.deepEqual(value, { code: 'processing-failed', message: GENERIC });
    assert.equal(logged.length, 1, 'technical detail goes to the console');
    assert.equal(logged[0][0], error);
  }
  assert.equal(shown(new Error('Failed to fetch'), 'preview-failed'), "Couldn't make a preview. Try again.");
});

test('a storage quota error reads as running out of space', () => {
  assert.equal(errorCode(new DOMException('full', 'QuotaExceededError')), 'storage-full');
  assert.equal(shown(new DOMException('full', 'QuotaExceededError')), 'Not enough space to finish. Free some space and try again.');
});

test('a user-facing error keeps its code, shows only catalogue text and keeps developer detail out of the message', async () => {
  const bare = new UserFacingError('file-no-audio');
  const detailed = new UserFacingError('model-download-failed', 'The model request failed. TypeError: Failed to fetch');
  assert.equal(errorCode(bare), 'file-no-audio');
  assert.equal(bare.detail, undefined);
  assert.equal(detailed.detail, 'The model request failed. TypeError: Failed to fetch');
  assert.equal(shown(detailed), "Couldn't download the voice/music model. Check your connection and try again.");
  assert.doesNotMatch(shown(detailed), /fetch|TypeError/);
  const quietBare = await quiet(() => failureOf(bare));
  assert.deepEqual(quietBare.value, failure('file-no-audio'));
  assert.equal(quietBare.logged.length, 0, 'an expected condition is not an error report');
  assert.equal((await quiet(() => failureOf(detailed))).logged.length, 1, 'detail reaches the console');
});

test('validation messages come from the catalogue, hide contradictions and show the first actionable issue', () => {
  const trim = trimRangeSchema.safeParse({ start: 90, end: 10 });
  assert.equal(validationMessage(trim.error.issues), 'Start must be before the end.');
  const negative = trimRangeSchema.safeParse({ start: -1, end: null });
  assert.equal(validationMessage(negative.error.issues), "Times can't be negative.");
  const gain = stepSchema.safeParse({ ...newStep('gain'), db: 20 });
  assert.equal(validationMessage(gain.error.issues), 'Gain must be between −12 and +12 dB.');
  const missing = stepSchema.safeParse({ ...newStep('gain'), db: Number.NaN });
  assert.equal(validationMessage(missing.error.issues), 'Enter a number.');
  const contradiction = stepSchema.safeParse({ ...newStep('normalize'), mode: 'loudness', targetDbfs: -3 });
  assert.equal(contradiction.success, false);
  assert.equal(validationMessage(contradiction.error.issues), undefined, 'a mix the interface cannot produce shows no text');
  const twice = recipeSchema.safeParse({ ...newRecipe(), steps: [{ ...newStep('trim') }, { ...newStep('trim') }] });
  assert.equal(twice.success, false);
  assert.equal(validationMessage(twice.error.issues), undefined);
  const duplicate = newStep('gain');
  const sameId = recipeSchema.safeParse({ ...newRecipe(), steps: [duplicate, { ...duplicate }] });
  assert.equal(validationMessage(sameId.error.issues), undefined, 'a repeated step id is internal');
  for (const result of [trim, negative, gain, missing, contradiction, twice, sameId])
    for (const issue of result.error.issues) assert.doesNotMatch(validationMessage([issue]) ?? '', /internal|identity|Invalid input/i);
});

test('trim failures carry the catalogue wording once', () => {
  assert.deepEqual(resolveTrim({ start: 90, end: 10 }, 120), { kind: 'failed', code: 'trim-order', message: 'Start must be before the end.' });
  assert.deepEqual(resolveTrim({ start: 130, end: null }, 120), { kind: 'failed', code: 'trim-past-end', message: 'Start is after the end of this file.' });
  assert.equal(resolveTrim({ start: Number.NaN, end: null }, 120).message, 'Enter a time like 1:30.');
  assert.equal(resolveTrim({ start: 10, end: 20 }, 120).kind, 'ready');
});

test('a finished export carries at most one note, and none when nothing needs attention', () => {
  const clean = { clippedSamples: 0, loudnessRequestedLufs: null, loudnessAchievedLufs: null, normalizationLimitedByCeiling: false, limitedNormalizations: 0 };
  assert.equal(resultNote(clean), null);
  assert.equal(resultNote({ ...clean, loudnessRequestedLufs: -14, loudnessAchievedLufs: -14 }), null, 'target reached is silent');
  assert.equal(resultNote({ ...clean, clippedSamples: 4 }), 'Some peaks are clipped. Lower the gain or the peak target.');
  assert.equal(resultNote({ ...clean, loudnessRequestedLufs: -14 }), 'This audio is too quiet to measure, so loudness was not changed.');
  assert.equal(resultNote({ ...clean, loudnessRequestedLufs: -14, loudnessAchievedLufs: -15.14, normalizationLimitedByCeiling: true, limitedNormalizations: 1 }),
    'The peak ceiling kept this quieter than the target (−15.1 LUFS).');
  assert.equal(resultNote({ ...clean, loudnessRequestedLufs: -14, loudnessAchievedLufs: -20, limitedNormalizations: 1 }), 'This audio was too quiet to reach the target.');
  assert.equal(resultNote({ ...clean, clippedSamples: 2, normalizationLimitedByCeiling: true, loudnessAchievedLufs: -15, loudnessRequestedLufs: -14 }),
    'Some peaks are clipped. Lower the gain or the peak target.', 'when several apply only the most serious shows');
});

test('no source file turns a caught error into visible text', async () => {
  const files = [];
  const walk = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
    }
  };
  await walk('src');
  const leaks = [];
  for (const path of files) {
    const text = await readFile(path, 'utf8');
    text.split('\n').forEach((line, index) => {
      if (/instanceof Error \? \w+\.message/.test(line) || /message: (error|failure|reason)\.message/.test(line)) leaks.push(`${path}:${index + 1}`);
    });
  }
  assert.deepEqual(leaks, [], 'forward error.message only through failureOf');
});
