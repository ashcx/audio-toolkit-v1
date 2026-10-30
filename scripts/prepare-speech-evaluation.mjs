import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = new URL('../.artifacts/speech-upstream/', import.meta.url);
await mkdir(root, { recursive: true });
const packages = [
  ['gtcrn', 'https://registry.npmjs.org/@sapphi-red/gtcrn-wasm/-/gtcrn-wasm-0.0.3.tgz', 'd0dd19d7494d687834657a8d16914849fc38bf6863532c9213d24642470ff7f2'],
  ['dfn', 'https://registry.npmjs.org/@lofcz/deepfilternet-web/-/deepfilternet-web-0.1.0.tgz', 'b8402f1c2c40d3b830925665a9f58824572452c7cf9ad3f5d329fdd4b91323ec'],
];
for (const [name, url, hash] of packages) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== hash) throw Error(`${name}: archive hash mismatch`);
  const archive = new URL(`${name}.tgz`, root);
  const destination = new URL(`${name}/`, root);
  await writeFile(archive, bytes);
  await mkdir(destination, { recursive: true });
  execFileSync('tar', ['-xzf', archive.pathname, '-C', destination.pathname]);
}
await copyFile(new URL('./speech-evaluation.html', import.meta.url), new URL('index.html', root));
console.log('Pinned runtimes prepared. Add licensed clean.wav and noisy.wav as described in Sprint 13 cpu.md before serving locally.');
