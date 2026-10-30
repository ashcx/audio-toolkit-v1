import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const fixtures = JSON.parse(await readFile(new URL('docs/sprint-evidence/sprint-16/fixtures.json', root)));
const media = new URL('.artifacts/music16/', root);
await mkdir(media, { recursive: true });
for (const fixture of fixtures) {
  const destination = new URL(`${fixture.id}.ogg`, media);
  let bytes;
  try { bytes = await readFile(destination); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(fixture.download);
    if (!response.ok) throw Error(`${fixture.id}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash('sha256').update(bytes).digest('hex') !== fixture.sha256) throw Error(`${fixture.id}: fixture hash mismatch`);
  await writeFile(destination, bytes);
}
await copyFile(new URL('scripts/isolation-baseline-check.html', root), new URL('.artifacts/music16-check.html', root));
await writeFile(new URL('.artifacts/s16.vite.config.mjs', root), "import original from '../vite.config.js';\nexport default {...original,build:{outDir:'.artifacts/s16-root/audio-toolkit-v1',rollupOptions:{input:'.artifacts/music16-check.html'}}};\n");
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', '.artifacts/s16.vite.config.mjs'], { cwd: root, stdio: 'inherit' });
const output = new URL('.artifacts/s16-root/audio-toolkit-v1/fixtures/', root);
await mkdir(output, { recursive: true });
for (const fixture of fixtures) await copyFile(new URL(`${fixture.id}.ogg`, media), new URL(`${fixture.id}.ogg`, output));
console.log('Serve .artifacts/s16-root at localhost:4196, then open /audio-toolkit-v1/.artifacts/music16-check.html. Do not rebuild during a run.');
