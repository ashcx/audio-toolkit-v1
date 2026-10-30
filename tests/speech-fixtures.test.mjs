import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, readdir, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

test('speech fixture verification preserves prior audio on failure and publishes only verified bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'speech-fixtures-'));
  try {
    await mkdir(join(root, 'scripts'));
    await mkdir(join(root, 'docs/sprint-evidence/sprint-13'), { recursive: true });
    await mkdir(join(root, '.artifacts/speech-youtube'), { recursive: true });
    await copyFile(new URL('../scripts/prepare-youtube-speech.mjs', import.meta.url), join(root, 'scripts/prepare.mjs'));
    const fake = join(root, 'downloader');
    await writeFile(fake, `#!${process.execPath}\nrequire('node:fs').writeFileSync(process.argv[process.argv.indexOf('-o')+1],process.env.FAKE_SPEECH_BYTES);\n`);
    await chmod(fake, 0o755);
    const destination = join(root, '.artifacts/speech-youtube/fixture.m4a');
    await writeFile(destination, 'previous');
    await writeFile(join(root, 'docs/sprint-evidence/sprint-13/youtube-fixtures.json'), JSON.stringify([{ id: 'fixture', localFile: '.artifacts/speech-youtube/fixture.m4a', source: 'https://example.invalid/fixture', downloadedAudioSha256: createHash('sha256').update('verified').digest('hex') }]));
    const run = bytes => spawnSync(process.execPath, [join(root, 'scripts/prepare.mjs')], { encoding: 'utf8', env: { ...process.env, YT_DLP: fake, FAKE_SPEECH_BYTES: bytes } });
    const failed = run('mismatched');
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /audio bytes changed/);
    assert.equal(await readFile(destination, 'utf8'), 'previous');
    assert.deepEqual(await readdir(join(root, '.artifacts/speech-youtube')), ['fixture.m4a']);
    const succeeded = run('verified');
    assert.equal(succeeded.status, 0, succeeded.stderr);
    assert.equal(await readFile(destination, 'utf8'), 'verified');
    assert.deepEqual(await readdir(join(root, '.artifacts/speech-youtube')), ['fixture.m4a']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
