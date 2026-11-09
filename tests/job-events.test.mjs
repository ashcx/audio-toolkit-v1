import test from 'node:test';
import assert from 'node:assert/strict';
import { showsDuringSeparation } from '../src/job-events.ts';

test('while separation shows its percent only the model download and model start may replace it', () => {
  assert.equal(showsDuringSeparation({ kind: 'model-download', loaded: 3_000_000, total: 85_034_606 }), true);
  assert.equal(showsDuringSeparation({ kind: 'phase', phase: 'Loading model' }), true);
  for (const phase of ['Separating', 'Processing', 'Processing / encoding', 'Preparing', 'Decoding', 'Saving'])
    assert.equal(showsDuringSeparation({ kind: 'phase', phase }), false, phase);
  assert.equal(showsDuringSeparation({ kind: 'isolation-progress', completed: 1, total: 4 }), false);
});
