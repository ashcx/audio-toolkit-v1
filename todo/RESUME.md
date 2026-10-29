# Current work, 2026-10-30

User resumed full build under poteto/scrum. Sprints1–8 are complete within their scope; main e9aef30 is the Sprint8 closure. Main312c673/Pages40927620132 are verified live. Current user instructions require a working branch and PR targeting main, with no merge without explicit permission. The user explicitly requested Sprint9 PR delivery with its unfinished factual gates disclosed. Working branch codex/sprint-9-isolation.

Sprint9 bounded voice/music isolation is implemented locally at http://localhost:4174/audio-toolkit-v1/. Parent current39 unit checks, build, both-engine full CPU isolation, four order cases, inherited DSP58, copy28sources, formats96, batch/cleanup and all UI suites pass. A real WebKit music boundary issue was reproduced, localized before encoding, and corrected by indexed loops. Exact failures/results and source snapshot are in docs/sprint-evidence/sprint-9/coverage.md, findings.md and reviewed-code.sha256.

Remaining factual gates: actual lawful music/live listening (asynchronous user observations requested, no response yet); complete GPU SCNet execution (host physical GPU unavailable; forced software diagnostic observed native dispatch then exceeded the2GiB guard before completed inference); independent review is now complete for the named CPU/numerical scope: reused Terra high sprint6_refresh passed current hashes/unit39 and its actual WebKit driver; overall Done remains open for factual observations. Sprint9 [PR #9](https://github.com/ashcx/audio-toolkit-v1/pull/9) is open against main at source implementation a6ecb1a. No merge/deployment or overall acceptance claim. Do not ship or enter dependent Sprints10–12 without their gates or an independently verified exception. No exception exists.

Current processes: production preview4174 remains for user listening; temporary diagnostic previews4176/4177 were stopped. All parent browser/diagnostic runs and independent browser tests have finished. Production4174 remains for the user; verify actual process before using it. Independent reviewers do not implement or rebuild shared dist. Follow current user routing, never Astra. Physical-device tests remain deferred to Sprint12. Keep UI text/icons minimal.

Historical records below are superseded only for current status; their old pause instructions and check results describe earlier checkpoints.

# Paused after Sprint 7, 2026-10-29

User explicitly requested pause, save and PR because credits ran out. Do not continue implementation until the user resumes. The checkpoint branch is `codex/pause-after-sprint-7`, targeting `main`. No merge is requested during the pause. The previous instruction to push verified increments directly to main remains the default after resume unless the user changes it.

## Saved and verified

- Sprints1–7 complete within their scope. Sprint7 implementation is main5a61da33cbe14106d6e7f14a4b9011a9ec62cb21; review/delivery closure is mainb6b2db8.
- Sprint7 exports MP3, AAC/M4A, WAV, FLAC and Opus/OGG. Parent and independent reviewer each passed224 browser download checks in Chromium/WebKit. Unit17/17, inherited DSP58 and four inherited browser suites pass.
- One independent Terra high reviewer passed the integrated increment. Fresh dispatch hit the runtime thread limit, so the completed non-implementing reviewer was reused under poteto's explicit exception. No multi-model diversity claim.
- Pages run40889990911 succeeded. Actual live Chromium MP3/AAC/Opus exports downloaded and passed FFprobe inspection. HTTP200 and matching asset index-D8mAmIJf.js. Later closure push changes evidence only.
- Source and runtime provenance for the AAC fallback is reproducible and hash checked. Final transitive licensing audit remains Sprint12.
- [Sprint7 coverage](../docs/sprint-evidence/sprint-7/coverage.md), [review](../docs/sprint-evidence/sprint-7/interrogate.md), [live smoke](../docs/sprint-evidence/sprint-7/live-smoke.json) and [decision trail](../docs/sprint-evidence/decisions.tsv) are durable evidence.

## First action after resume

Verify main/branch/PR state and read [Sprint8](sprint-8-batch.md). Ground batch ownership in src/use-export.ts, process-audio.ts, copy-audio.ts, pcm/protocol.ts, main.tsx and file-row.tsx. No Sprint8 application code has been changed. One read-only Terra low design sketch completed; the Luna design dispatch hit the thread limit. Design exploration is incomplete, not an accepted implementation contract.

The sketch recommends a small batch owner separate from the UI hook. Freeze each job's File, plan/snapshot and allocated name. Model waiting, active, cancelling, done, failed and cancelled with attempt identity. Reject/release late outputs, retain slots until cancellation cleanup settles, preserve unrelated successful outputs and retry the original snapshot. Lock recipe/trim edits while a run is active. Report real phase events because streaming decode/process/encode overlap. Compare this with a simpler hook-owned queue before selecting the design. Concurrency must be capability based and verified conservatively; no workload limits have been established.

Continue Sprint8 batch controls,9 isolation and user listening,10 preview/presets,11 retained downloads/ZIP/measured limits,12 final devices/licensing/privacy/accessibility acceptance. Execute sequentially in the main instance. Independent review is required per sprint. Follow current user model settings; never Astra.

## Constraints and local state

Keep interface copy minimal like image-compressor-v1. No random decorative icons or redundant explanations. Real-device tests are deferred to Sprint12 by user authorization; lawful real music/live isolation listening is deferred to Sprint9. Do not claim those gates passed.

Production preview was available at127.0.0.1:4174/audio-toolkit-v1/ and fresh development at5176. Recheck live processes before using them. Older ports4173/5175 were unresponsive/stale; do not infer codec failure from those. Test outputs/profiles/compiler checkouts live in ignored .artifacts/ and .upstream/. Required source/notices and evidence are committed. Do not delete user data or unrelated processes.

No active implementation or review agents remain after pause. No unfinished application edits exist outside the committed Sprint7 increment. This PR records the pause only because Sprint7 had already reached main before the pause request.

---

## Earlier checkpoint history

# Current resume, 2026-10-29

User resumed work and replaced Git instructions. Work directly on main; verify and push completed increments, automatically deploying through the existing Pages workflow. Earlier pause/branch/PR restrictions below are historical. Current starting main3c29c0f contains paused checkpoint3f7e408. PR7 is closed. Sprint6 completed at implementation9f50c82 with fresh independent review,58 browser observations, successful Pages run40877444915 and actual live WAV export. Continue Sprint7 formats; preserve minimal UI and remaining gates. The scoped DSP works; complete-app/device readiness is not claimed.

## Historical paused checkpoint

# Resume Audio Toolkit

User explicitly paused on2026-10-29 because their token allowance ran out. Do not continue until requested. No merge or deployment authorized. Continue the existing build/test/PR objective when resumed, using scrum-mode and poteto-mode. Keep the webpage's minimal text and purposeful controls matching image-compressor-v1.

## Saved state

- Repo /home/user/audio-toolkit, public ashcx/audio-toolkit-v1.
- Sprints1–5 Complete in scope, all PRs open and stacked, none merged. PR1 planning; PR2 feasibility; PR3 workspace/minimal-copy cleanup; PR4 intake; PR5 recipe; PR6 original-audio export.
- PR5: https://github.com/ashcx/audio-toolkit-v1/pull/5. Sprint4 final34e102c.
- PR6: https://github.com/ashcx/audio-toolkit-v1/pull/6. Reviewed implementationa74b9f4, finalbf88058. Open/ready/mergeable with no configured CI checks observed. Host PR attachment requests for PR6/7 were attempted; inspect current attachments on resume if the host did not return a response. Do not create another PR6.
- Current branch sprint/6-dsp, based onbf88058. Only saved incomplete design/probe evidence; no production DSP code added. Draft checkpoint [PR7](https://github.com/ashcx/audio-toolkit-v1/pull/7) belongs to Sprint6; reuse it rather than creating a duplicate.
- Production preview remains at127.0.0.1:4173/audio-toolkit-v1/ for user inspection. Existing dev server5173 served root-relative dev paths during exploratory probes. Verify actual server state before use; do not treat dev paths as production proof.

## Next work

Read sprint-6-dsp.md and docs/sprint-evidence/sprint-6/design-checkpoint.md. Worker decoding probe has unresolved WebKit timeouts and codec presentation/priming counts. Diagnose before implementing. Both design alternatives preserve source-time trim at its actual card position, bounded PCM streaming, OPFS normalization replay and one final PCM16 WAV encoder. Library's internal linear resampler is not suitable for the intended anti-aliasing gate. No resampler or production PCM runner exists yet.

Sprint6 then7formats,8batch controls,9bounded isolation + user listening,10preview/presets,11retention/ZIP/limits,12final physical-device acceptance. Execute sequentially in main; independent reviews use Terra high. No Astra; user model routing and supplied AGENTS instructions remain binding. No implementation fan-out.

## Last verified checks

Sprint5 npm ci/postinstall/build/typecheck,11unit tests (recipe/planner/matroska-padding), copy14fixtures per engine, inherited recipe/workspace/intake suites, and independent integrated/evidence reviews passed. Copy outputs preserve coded access units and independent PCM references;13direct source comparisons and1laced fixture compared with original Opus golden source due a proven FFmpeg6.1.1 lacing-padding behavior. Source/ESM dependency patch is reproducible and exact-hash/version guarded. Detailed scope and limitations remain in Sprint5 contracts/interrogate.

Actual physical devices remain NOT VERIFIED until user's final tests. Real music/live isolation listening remains required later. AAC exact corresponding-source release gate remains open; no distribution/deployment claim. Do not mark full project complete.
