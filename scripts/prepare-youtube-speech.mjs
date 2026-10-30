import { readFile, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const fixtures = JSON.parse(await readFile(new URL('docs/sprint-evidence/sprint-13/youtube-fixtures.json', root)));
await mkdir(new URL('.artifacts/speech-youtube/', root), { recursive: true });
for (const fixture of fixtures) {
  const destination = new URL(fixture.localFile, root);
  const temporary = await mkdtemp(new URL('.artifacts/speech-youtube/download-', root).pathname);
  const downloadPath = temporary + '/audio.m4a';
  try {
    execFileSync(process.env.YT_DLP ?? 'yt-dlp', ['--no-overwrites', '--no-playlist', '--socket-timeout', '15', '--retries', '0', '--max-filesize', '30M', '-f', 'bestaudio[ext=m4a]', '-o', downloadPath, fixture.source], { stdio: 'inherit' });
    const bytes = await readFile(downloadPath);
    if (createHash('sha256').update(bytes).digest('hex') !== fixture.downloadedAudioSha256) throw Error(`${fixture.id}: audio bytes changed; reevaluate provenance and rerun evidence before comparing saved results`);
    await rename(downloadPath, destination);
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
console.log('Fixture bytes match the recorded YouTube evaluation. See youtube.md for local evaluation setup and attribution.');
