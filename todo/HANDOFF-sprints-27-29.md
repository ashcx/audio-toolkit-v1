# Handoff: finishing Sprint 27 and starting Sprints 28 and 29

Written 2026-11-08 when the user paused the work. A future AI session should read this file first, then `todo/sprint-27-demucs-runtime.md`, `todo/sprint-28-stem-selection.md`, `todo/sprint-29-waveform-trimming.md` and `docs/sprint-evidence/sprint-27/coverage.md`.

## User goal and standing instructions

The user asked for Sprints 27 to 29 to be completed autonomously, one PR per sprint, pushed only after proper checking. They then asked to remove SCNet entirely and keep only the tested Demucs model. They later said to **stop after the Sprint 27 PR and wait for their review** before doing 28 and 29. They paused before that PR was pushed.

Decisions the user made (do not reopen):
- Download `htdemucs_fp16.onnx` (85,034,606 bytes, sha256 `742a4f8594a48d6306da303b8b2dd8be2b54389b88557db034408b436effd775`) from `https://huggingface.co/Ryan5453/unblend/resolve/main/htdemucs_fp16.onnx`.
- Bundle the weights with the app **even though the weight license is unresolved** (the model metadata says `unlicensed`). This is recorded as the user's decision in `THIRD_PARTY_LICENSES.md` and the provenance docs. It adds 85 MB to the repo permanently (commit `fdd2606`).
- PRs are stacked: Sprint 27, then 28 on top of 27, then 29 on top of 28. The user merges bottom-up.
- If Demucs had not been clearly faster or good enough, stop and ask. It was clearly faster, so the run continued. Quality is still unjudged.
- Listening and physical-device gates stay open and are listed in each PR. They are not marked passed.
- Demucs is now the only engine. Without WebGPU it runs on single-thread WASM (slow but works).
- Repo rule: work on branches, open PRs against `main`, no direct commits to `main`, no merges without the user's explicit permission.

## Current state

Branch `codex/sprint-27-demucs`, in the worktree `.claude/worktrees/codebase-analysis-sprints-e8733f`. Nothing is pushed and no PR exists. `gh` is logged in as `ashcx`, and `origin` is `https://github.com/ashcx/audio-toolkit-v1.git`.

The branch carries an earlier housekeeping commit `3f5a2b6` (PR CI workflow, ZIP test fix, doc refresh) that is not on `main`. The Sprint 27 PR will include it. Say so in the PR body.

Commit history on the branch, oldest first:
- `3f5a2b6` housekeeping (CI workflow, ZIP test fix, `TODO.md`/`resume.md` refresh)
- `bf967c7`, `196122b`, `138c6a7` Phase 1: numpy reference, adapter, scenario 27-01 evidence
- `0b5ae16`, `e2f1fb5` Phase 2: benchmark and evidence
- `fdd2606` adds the model file under `public/vendor/neural/`
- `86b6c67` Demucs integration (streaming windows, worker, UI, tests, Chrome driver)
- `ca58b5f`, `0d1daea`, `8543c38` SCNet removal and cleanup
- `8ba5361` docs and evidence
- Review fix round, all done: `87d2336` (A, dead tooling and raw dumps removed), `14aff67` and `9d1cc64` (B, one `src/inference/demucs-model.ts`), then C to F as separate commits: strict isolation step, DC offset once in music, product cleanups (`attempts`, `Stems`, `InferenceDone`, `protocol.ts` without `Recipe`, `WindowStats`, exported watchdog limits), the numpy pipeline check expecting the single-mean rule, docs, `*.onnx binary`, the Independent review section, decisions rows 18 to 20, and the `TODO.md` row.

All review fixes are done. What remains is verification by whoever pushes, and the push.

Checks last run on the review-fix head by the fix-round agent (output in the ignored `.artifacts/final/`): `npm test` 130 pass, `npx tsc --noEmit`, `npm run build`, `npm run verify:static`, `node scripts/demucs-check.mjs` (numpy reference, WASM and WebGPU) and `node scripts/isolation-check.mjs` all exit 0. The 10 minute run (`ISOLATION_LONG_SECONDS=600`) was last run at `8ba5361`. Do not trust this paragraph; re-run them.

The independent reviews covered `8ba5361`. The fixes were not re-reviewed, and `todo/sprint-27-demucs-runtime.md` still has the review box unticked for that reason.

Not changed on purpose: Keep music is now `audio.mean` added once and Keep voice adds none, which departs from upstream Demucs (it adds the mean to every stem). The numpy pipeline check subtracts the extra means from its reference stems for that reason.

### Deferred to Sprint 28 on purpose

Reshape `demucsWindows` to take `outputs: DemucsSource[][]` so several stems can stream out, and move mono handling out of the worker (stereo in, four stereo stems out). Chrome driver coverage on WebKit and non-macOS is also deferred. The vendored `vendor/neural/neural.js` still contains a SCNet preset (verbatim upstream, hash-pinned); rebuilding it was not requested.

Do not change the shipped DSP numerics, window geometry, overlap (25%), the model, or the worker's four-stem return contract.

### Then push the Sprint 27 PR

1. Re-run every check above yourself. Do not trust a subagent's summary.
2. `git push -u origin codex/sprint-27-demucs`, then `gh pr create --base main` with a body that opens with the user's goal and includes: the housekeeping commit note, the 85 MB model commit and permanent repo growth, the unresolved weight license and the user's decision, benchmark numbers (below), regressions (below), open listening and device gates, and the independent-review summary. End the body with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. End commits with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
3. After opening it, use the ccd_pr tools (`get_status`, then `bind_pr` if needed). Do not poll CI yourself.
4. **Stop and wait for the user's review.** Do not start Sprint 28 until they say so.

## Measured facts (Apple M5, 16 GiB, Chrome 156.0.8078.81, real WebGPU adapter)

Median wall time, same input and same scope (decoded stereo in, vocals and accompaniment out). Evidence is in `docs/sprint-evidence/sprint-27/` (`scenario-02.md` to `scenario-06.md`, `results.json`, `decisions.tsv`).

| Input | SCNet (removed) | Demucs WebGPU |
| --- | --- | --- |
| 10 s | 3.50 s | 3.07 s |
| 60 s | 53.66 s | 13.28 s |
| 3 min | 130.63 s | 35.60 s |

- Demucs WASM single-thread: about 81 s per 60 s of audio (slower than the old SCNet).
- Demucs slowest run beat SCNet's fastest by about 3x. Limiter on WebGPU is GPU compute.
- Overlap speed (60 s, WebGPU): 10% 13.1 s, 25% 15.2 s, 40% 18.0 s, 50% 21.2 s. Overlap is fixed at 25%.
- Streaming memory: about 1 GiB rise at a 10 minute export, against 2.9 GiB for the whole-track approach. Cancellation took about 55 ms.
- Phase 1 correctness: stem order is drums, bass, other, vocals. ORT-Web differs from native ORT beyond rounding on near-silent windows (inferred cause: less precise long float32 reductions, not proven). Stem sums reconstruct the mix at about 29 dB SNR, which is the model's own reconstruction.
- ORT can silently run on CPU while labelled "webgpu". The shipped code derives the GPU badge from counted dispatches.

## Regressions and risks the user was told about

- Devices without WebGPU are slower than before (about 81 s against about 54 s per 60 s audio).
- First use downloads 85 MB (SCNet was 13 MB).
- Separation quality is unjudged. Nobody has listened. An energy proxy favoured Demucs on one instrumental clip.
- Weight license unresolved. Repo grew by 85 MB permanently.
- Keep music is now a sum of predicted stems, not original minus voice. It is band-limited for non-44.1 kHz sources.
- Tested only on one M5 in headless Chrome. No Safari, Firefox, integrated GPU or low-memory device. The silent-CPU-under-WebGPU case and the browser SHA-256 mismatch path are covered by unit tests or code reading only.
- The vendored third-party bundle `vendor/neural/neural.js` still contains an scnet preset. It is verbatim upstream and hash-pinned. It could be rebuilt from `@audio/neural-runtime` alone using the README esbuild recipe, which the app no longer needs `separate()` for. The user has not asked for this. The upstream MIT notice also mentions SCNet and must stay.

## Open gates only the user can close

Listening checks on real music (files are in the gitignored `.artifacts/sprint-27/listening/` and `.artifacts/sprint-27/app-check/` on the user's machine): vocals and accompaniment on their own songs, the joins every 5.85 s, reverb tails and cymbals and bass, silent intros and fades and very short files, GPU versus CPU output of one file. Also physical-device and other-browser runs.

Real recordings used for speed and app checks live at `/Users/macbook/Documents/test/audio-toolkit-v1/.artifacts/music16/` (`live.ogg`, `instrumental.ogg`) in the main checkout. They are gitignored and must never be committed.

## Sprints 28 and 29 (not started)

Start only after the user reviews the Sprint 27 PR and says to continue. Base each on the previous branch and open each PR against the previous branch (stacked). Use the same method that worked here: a fresh agent per phase with a full brief, independent review by two agents that did not write the code, a combined fix round, then the coordinator re-verifies and pushes.

**Sprint 28, select and export stems** (`todo/sprint-28-stem-selection.md`): choose Vocals, Drums, Bass, Other, Instrumental (drums+bass+other summed in float on one timeline, no per-stem normalization) or All four. Run the network once. Take the stem order from model metadata. Tie every output to its source, stem, recipe and range. Previews, individual/ZIP/folder downloads, bounded retention. The worker already returns all four stems, so no protocol change is needed. Do the deferred `outputs: DemucsSource[][]` reshape here. Note the plan's distinction between summing predicted stems and subtracting vocals from the source.

**Sprint 29, waveform playback and per-track trimming** (`todo/sprint-29-waveform-trimming.md`): real peak generation and cache, a compact waveform with seek, trim handles that edit only that one track (never other files or the batch Trim all range), "Custom range" and "Reset to Trim all" with a warning before replacing custom ranges, no batch waveform, no decorative bars, no retaining full PCM just for drawing. Source and single-output waveforms do not need Demucs. Synchronized four-stem audition needs Sprint 28.

## Lessons from this run

- Subagent reports are claims. Re-run typecheck, tests, build and the greps yourself.
- The user's gates (listening, devices) cannot be satisfied by synthetic audio or by a passing driver. Say so in every PR.
- `.artifacts/` is gitignored. Point script output there so running a check never dirties tracked evidence.
- Avoid writing compatibility for fields that never shipped. Check `git log -S` before adding it.
