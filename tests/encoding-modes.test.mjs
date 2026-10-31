import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENCODING_MODES,
  defaultEncodingMode,
  encoderBitrateMode,
  encodingModesFor,
} from '../src/encoding-modes.ts';
import { newExport, newRecipe, recipeSchema } from '../src/recipe.ts';

test('the capability table exposes only measured alternatives', () => {
  assert.deepEqual(ENCODING_MODES.opus.map(mode => mode.value), ['cbr', 'vbr']);
  assert.deepEqual(ENCODING_MODES.mp3.map(mode => mode.value), ['cbr']);
  assert.deepEqual(ENCODING_MODES.m4a.map(mode => mode.value), ['vbr']);
  for (const format of ['wav', 'flac', 'original'])
    assert.deepEqual(encodingModesFor(format), []);
  assert.equal(defaultEncodingMode('opus'), 'cbr');
});

test('legacy encoded recipes keep the existing constant mode', () => {
  for (const [format, expected] of [['mp3', 'cbr'], ['m4a', 'vbr'], ['opus', 'cbr']]) {
    const parsed = recipeSchema.parse({
      version: 1,
      steps: [],
      export: { format, bitrateKbps: format === 'mp3' ? 320 : 128 },
    });
    assert.equal(parsed.export.mode, expected);
  }
});

test('new exports keep CBR and invalid combinations cannot be saved', () => {
  assert.equal(newExport('mp3').mode, 'cbr');
  assert.equal(newExport('m4a').mode, 'vbr');
  assert.equal(newExport('opus').mode, 'cbr');
  assert.equal(recipeSchema.safeParse({
    ...newRecipe(),
    export: { format: 'mp3', mode: 'vbr', bitrateKbps: 192 },
  }).success, false);
  assert.equal(recipeSchema.safeParse({
    ...newRecipe(),
    export: { format: 'opus', mode: 'vbr', bitrateKbps: 128 },
  }).success, true);
  assert.equal(recipeSchema.safeParse({
    ...newRecipe(),
    export: { format: 'm4a', mode: 'cbr', bitrateKbps: 128 },
  }).success, false);
  assert.equal(recipeSchema.safeParse({
    ...newRecipe(),
    export: { format: 'opus', mode: 'abr', bitrateKbps: 128 },
  }).success, false);
});

test('only Opus VBR maps to the variable encoder mode', () => {
  assert.equal(encoderBitrateMode({ format: 'opus', mode: 'vbr' }), 'variable');
  assert.equal(encoderBitrateMode({ format: 'opus', mode: 'cbr' }), 'constant');
  assert.equal(encoderBitrateMode({ format: 'opus' }), 'constant');
  assert.equal(encoderBitrateMode({ format: 'mp3', mode: 'cbr' }), 'constant');
  assert.equal(encoderBitrateMode({ format: 'm4a', mode: 'vbr' }), 'variable');
});
