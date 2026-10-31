# Sprint 24 verification

2026-10-31. Base `4d4395a`. Branch `codex/sprint-24-loudness`. Final checks were run in the worktree `/private/tmp/audio-sprint24` against system Chrome on `http://127.0.0.1:5185/audio-toolkit-v1/`.

## Commands and results

- `npm test`: 123 tests, 123 pass, 0 fail.
- `npm run build`: pass, including the AAC, neural and worker-import checks.
- `npm run verify:static`: pass.
- `node --experimental-strip-types /Users/macbook/Documents/test/audio-toolkit-v1/.artifacts/loudness-reference.mjs`: PASS on all seven ffmpeg EBU R128 rows.
- `APP_URL=http://127.0.0.1:5185/audio-toolkit-v1/ node scripts/sprint-24-check.mjs`: PASS. Both modes, rail keys and marks, compressor controls, preview gain reduction and the ceiling-limited result. A cold first run can time out on its first screenshot while Vite optimizes dependencies; the warm run passes.
- `DSP_CHECK_ENGINE=chromium PATH=/opt/homebrew/bin:$PATH APP_URL=... node scripts/dsp-check.mjs`: 29 browser DSP observations pass, including WAV, MP3, AAC, FLAC, OGG, Opus, video, mixed trims, long files and quota retry.
- `ISOLATION_CHECK_ENGINE=chromium PATH=/opt/homebrew/bin:$PATH APP_URL=... node scripts/isolation-order-check.mjs`: both isolation order cases pass.

## Adversarial checks

- A 16 kHz burst at -8 LUFS with a -0.3 dBTP ceiling reported an estimated -1.3 dBTP in the app. ffmpeg measured the exported WAV at -0.4 dBTP, so the ceiling held. The 1.0 dB guard covers the measured 0.83 to 0.90 dB meter under-read.
- Normalize then Gain +6 reports `Loudness target reached at the Normalize step. Achieved -14.0 LUFS. Later steps can change the final level.` ffmpeg measures -8.0 LUFS.
- Normalize then Compressor 100% reports the same qualification plus the gain reduction. ffmpeg measures -19.9 LUFS.
- A 0 dBTP Peak target exported at -0.6 dBTP by ffmpeg with an estimated -1.0 dBTP result. The -6 dBTP target uses the same guard.
- Silence reports `Loudness target not reached. The audio was silent or below the measurement gate.`
- The rail magnet attracts at -14 and -23 at +0.02 and escapes at +0.03.

## Review

Two independent reviewers covered the sprint. Their first round found four blocking issues: the ceiling under-read, the unqualified final-loudness claim, the peak mode using dBFS sample peak instead of dBTP true peak, and stale checks. All four were fixed and reproduced clean. The second round resolved the behavior findings; the only remaining stale-check finding was fixed in later commits. After the rebase onto Sprint 25, the root reran the updated checks on the merged tree successfully. The peak result now says `Peak target applied` because the 1.0 dB guard sits below the requested target.

## Gaps

- Lossy decoded exports are not metered. The result text is derived from pre-encode PCM statistics.
- Listening and physical-device acceptance were not performed.
- Analysis time, memory, peak temporary storage and preview latency were not recorded. The normalize path checkpoints the full decoded stream, so temporary storage grows with duration.
