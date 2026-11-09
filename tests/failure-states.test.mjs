import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Batch } from '../src/batch.ts';
import { Preview } from '../src/preview.ts';
import { Archive } from '../src/archive.ts';
import { FolderSave } from '../src/folder-save.ts';
import { CleanupFailure, cleanupAll } from '../src/cleanup.ts';
import { UserFacingError } from '../src/errors.ts';
import { inspectMedia, createFileId } from '../src/media.ts';
import { newRecipe, newExport, recipeSchema, snapshotForFile } from '../src/recipe.ts';
import { compilePlan } from '../src/planner.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
const GENERIC = 'Something went wrong with this file. Try again.';
async function silently(work) {
  const original = console.error;
  console.error = () => {};
  try { return await work(); } finally { console.error = original; }
}
function spec(name = 'tone.wav') {
  const metadata = { container: 'wav', codec: 'pcm-s16', duration: 2, startTime: 0, sampleRate: 48000, channels: 2, hasVideo: false };
  const entry = { id: createFileId(), file: new File(['data'], name), inspection: { kind: 'ready', metadata } };
  const snapshot = snapshotForFile(recipeSchema.parse({ ...newRecipe(), steps: [], export: newExport('wav') }), entry);
  return { entry, plan: compilePlan(snapshot.snapshot, metadata) };
}
const failedState = async error => {
  const item = spec();
  const batch = new Batch(async () => { throw error; }, 1);
  batch.start([item]);
  await tick();
  const state = batch.snapshot.jobs.get(item.entry.id).state;
  batch.dispose();
  return state;
};

test('a failed export shows catalogue text, never the raw browser or engine message', async () => {
  const leaked = await silently(() => failedState(new TypeError('Failed to fetch')));
  assert.equal(leaked.kind, 'failed');
  assert.equal(leaked.message, GENERIC);
  assert.equal(leaked.code, 'processing-failed');
  assert.doesNotMatch(JSON.stringify(leaked), /fetch/i);
  const engine = await silently(() => failedState(new Error('Each step needs a unique identity.')));
  assert.equal(engine.message, GENERIC);
  const known = await failedState(new UserFacingError('model-download-failed', 'TypeError: Failed to fetch'));
  assert.equal(known.code, 'model-download-failed');
  assert.equal(known.message, "Couldn't download the voice/music model. Check your connection and try again.");
  const space = await silently(() => failedState(new DOMException('full', 'QuotaExceededError')));
  assert.equal(space.message, 'Not enough space to finish. Free some space and try again.');
});

test('cleanup that keeps failing is reported as stuck only after a retry also fails', async () => {
  let fail = true;
  const first = spec();
  const gate = Promise.withResolvers();
  const batch = new Batch(async () => gate.promise, 1);
  batch.start([first]);
  await tick();
  batch.cancel(first.entry.id);
  batch.remove(first.entry.id);
  gate.reject(await cleanupAll([async () => { if (fail) throw new Error('Storage locked'); }]).catch(error => error));
  await tick();
  assert.equal(batch.snapshot.cleanupCount, 1);
  assert.equal(batch.snapshot.cleanupStuck, false, 'the first failure is retried silently');
  await batch.retryCleanup();
  assert.equal(batch.snapshot.cleanupCount, 1);
  assert.equal(batch.snapshot.cleanupStuck, true, 'a failed retry is worth telling the person about');
  fail = false;
  await batch.retryCleanup();
  assert.equal(batch.snapshot.cleanupCount, 0);
  assert.equal(batch.snapshot.cleanupStuck, false);
  batch.dispose();
});

test('a job that failed during cleanup reads as a plain processing failure under its file', async () => {
  const item = spec();
  const batch = new Batch(async () => { throw await cleanupAll([async () => { throw new Error('locked'); }]).catch(error => error); }, 1);
  batch.start([item]);
  await tick();
  const state = batch.snapshot.jobs.get(item.entry.id).state;
  assert.equal(state.kind, 'failed');
  assert.equal(state.message, GENERIC);
  assert.equal(batch.snapshot.cleanupCount, 1);
  batch.dispose();
});

const snapshotFor = () => {
  const entry = { id: createFileId(), file: new File(['audio'], 'source.wav'), inspection: { kind: 'ready', metadata: { container: 'wav', codec: 'pcm-s16', duration: 5, startTime: 0, sampleRate: 10000, channels: 1, hasVideo: false, presentation: null } } };
  return { entry, snapshot: snapshotForFile(recipeSchema.parse(newRecipe()), entry).snapshot };
};
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

test('a failed preview says so in catalogue words and a stuck preview cleanup counts its attempts', async () => {
  const { entry, snapshot } = snapshotFor();
  const raw = new Preview(async () => { throw new TypeError('Failed to fetch'); }, { create: () => 'blob:x', revoke: () => {} });
  await silently(async () => { raw.start(entry, snapshot); await settle(); });
  assert.equal(raw.state.kind, 'failed');
  assert.equal(raw.state.message, "Couldn't make a preview. Try again.");
  assert.doesNotMatch(JSON.stringify(raw.state), /fetch/i);
  const known = new Preview(async () => { throw new UserFacingError('model-download-failed'); }, { create: () => 'blob:x', revoke: () => {} });
  known.start(entry, snapshot); await settle();
  assert.equal(known.state.code, 'model-download-failed');

  let calls = 0, failRelease = true;
  const output = () => ({ file: new File(['wav'], 'x.wav'), name: 'x.wav', mime: 'audio/wav', release: async () => { if (failRelease) throw new Error('busy'); } });
  const stuck = new Preview(async () => { if (++calls === 2) throw new Error('boom'); return { output: output(), stats: {} }; }, { create: () => 'blob:y', revoke: () => {} });
  await silently(async () => { stuck.start(entry, snapshot); await settle(); });
  assert.equal(stuck.state.kind, 'cleanup');
  assert.equal(stuck.state.attempts, 1);
  assert.equal(stuck.state.message, "Couldn't free some storage.");
  stuck.clear(); await settle();
  assert.equal(stuck.state.attempts, 2);
  failRelease = false;
  stuck.clear(); await settle();
  assert.equal(stuck.state.kind, 'idle');
});

test('a ZIP that fails says what to do, names the unsafe-name case, and counts stuck cleanups', async () => {
  const file = new File(['x'], 'a.wav');
  const run = async build => {
    const archive = new Archive(build);
    await silently(async () => { archive.start([file]); await tick(); await tick(); });
    return archive.state;
  };
  const quota = await run(async () => { throw new DOMException('full', 'QuotaExceededError'); });
  assert.equal(quota.kind, 'failed');
  assert.equal(quota.code, 'storage-full');
  assert.equal(quota.message, "Not enough space to finish. Free some space and try again.");
  const privateMode = await run(async () => { throw new UserFacingError('storage-private-mode', 'no opfs'); });
  assert.equal(privateMode.code, 'storage-private-mode');
  const names = await run(async () => { throw new UserFacingError('names-unsafe', 'ZIP filenames must be safe and unique.'); });
  assert.equal(names.message, "Some file names can't be saved together. Download them one by one.");
  const raw = await run(async () => { throw new Error('boom'); });
  assert.equal(raw.code, 'zip-failed');

  let failRelease = true;
  const archive = new Archive(async () => ({ file: new File(['z'], 'z.zip'), name: 'z.zip', mime: 'application/zip', release: async () => { if (failRelease) throw new Error('busy'); } }));
  archive.start([file]); await tick(); await tick();
  assert.equal(archive.state.kind, 'ready');
  await archive.clear();
  assert.equal(archive.state.kind, 'cleanup');
  assert.equal(archive.state.attempts, 1);
  assert.equal(archive.state.message, "Couldn't free some storage.");
  await archive.clear();
  assert.equal(archive.state.attempts, 2);
  failRelease = false;
  await archive.clear();
  assert.equal(archive.state.kind, 'idle');
});

test('saving to a folder blocked by the browser tells the person to download instead', async () => {
  const blocked = new FolderSave(async () => { throw new DOMException('denied', 'NotAllowedError'); });
  await blocked.start([new File(['x'], 'a.wav')]);
  assert.deepEqual({ kind: blocked.state.kind, code: blocked.state.code, message: blocked.state.message },
    { kind: 'failed', code: 'folder-blocked', message: "Couldn't save to that folder. Download the files instead." });
  const unknown = new FolderSave(async () => { throw new Error('Something internal'); });
  await silently(() => unknown.start([new File(['x'], 'a.wav')]));
  assert.equal(unknown.state.message, "Couldn't save to that folder. Download the files instead.");
});

test('files that cannot be read are described in catalogue words, from real fixtures', async () => {
  const inspect = async name => silently(async () => inspectMedia(new File([await readFile(`tests/fixtures/${name}`)], name), new AbortController().signal));
  const corrupt = await inspect('corrupt.wav');
  assert.deepEqual([corrupt.kind, corrupt.code, corrupt.message], ['failed', 'file-unreadable', "This file can't be read. Try another file."]);
  const silent = await inspect('no-audio.mp4');
  assert.deepEqual([silent.kind, silent.code, silent.message], ['failed', 'file-no-audio', 'This file has no audio.']);
  const unsupported = await inspect('unsupported.mkv');
  assert.deepEqual([unsupported.kind, unsupported.code], ['failed', 'file-unsupported-audio']);
  assert.equal((await inspect('tone.wav')).kind, 'ready');
});

test('a cleanup failure is the one error type that carries a way to recover', async () => {
  const failure = await cleanupAll([async () => { throw new Error('x'); }]).catch(error => error);
  assert(failure instanceof CleanupFailure);
  assert.equal(failure.code, 'storage-stuck');
  assert.equal(typeof failure.recover, 'function');
});
