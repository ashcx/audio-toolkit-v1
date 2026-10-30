import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('capability probe rejects empty/nonfinite results and cannot silently reuse cached memory observations', async () => {
  const html = await readFile(new URL('../scripts/speech-acceleration-check.html', import.meta.url), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/gm, '');
  for (const mode of ['valid', 'nan', 'empty', 'unobserved']) {
    const button = { disabled: false }, result = { textContent: '' };
    const wasm = {
      Memory: WebAssembly.Memory,
      instantiate: async () => ({ instance: { exports: { memory: new WebAssembly.Memory({ initial: 1 }) } } }),
      instantiateStreaming: async () => ({ instance: { exports: { memory: new WebAssembly.Memory({ initial: 1 }) } } }),
    };
    const processor = { frameSize: 256, frameLength: 480, process: frame => mode === 'empty' ? new Float32Array() : mode === 'nan' ? Float32Array.from(frame, () => NaN) : frame, destroy() {} };
    const context = {
      document: { querySelector: selector => selector === '#run' ? button : result },
      navigator: { userAgent: 'offline probe test', hardwareConcurrency: 1 },
      crossOriginIsolated: false, SharedArrayBuffer, WebAssembly: wasm, Float32Array,
      GtcrnProcessor: class { constructor() { return processor; } },
      loadGtcrnModule: async () => { if (mode !== 'unobserved') await wasm.instantiate(); },
      DeepFilter: { create: async () => { await wasm.instantiate();return { ...processor, process: frame => processor.process(frame) }; } },
    };
    vm.runInNewContext(script, context);
    await button.onclick();
    const output = JSON.parse(result.textContent);
    assert.equal(output.status, mode === 'valid' ? 'passed' : 'failed', mode);
    assert.equal(button.disabled, true);
  }
});
