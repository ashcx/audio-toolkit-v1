# Sprint 5 coverage

| Condition | Exact evidence | Verdict |
| --- | --- | --- |
| Ready predecessor artifacts/review/PR | Sprint4 exits, interrogate,34e102c, PR5 open/ready with no checks | VERIFIED |
| Ready source contracts/fixtures/dependencies/browser | contracts.md, original sections9/14/15, checked-in synthetic fixtures and npm ci; persistent WebKit storage probe | VERIFIED |
| Ready carry-forwards | None | VERIFIED |
| US01 copy vs PCM and accurate no-ops/order | tests/planner.test.mjs5/5; source-shape regression and clear Original audio rejection | VERIFIED |
| US02 primary audio-only, payloads/configs, no decoding/encoding | copy-check.json14fixtures per engine, downloaded outputs, FFprobe/FFmpeg comparison, codecCalls0 | VERIFIED |
| US03 AAC MP3 Opus Vorbis FLAC mixed paths | coded payload hashes/packet lengths, decoding config equivalence and independent PCM hashes match; per-file MIME/extensions/names; no silent transcode | VERIFIED |
| Done stories and exact checks | Three reports, npm ci/build/typecheck,11unit tests, copy and inherited browser regressions | VERIFIED |
| Done contracts/data safety | contracts.md; stable snapshot, source time, owned OPFS cleanup; injected quota/storage failure and retry checks | VERIFIED |
| Done UI desktop/mobile/themes/keyboard/touch/labels/recovery | captures/, copy-check.json touch tap download/export/remove, keyboard export, failure recovery and inherited regressions | VERIFIED locally; physical devices NOT VERIFIED |
| Done self-review/decisions | gapless metadata, Matroska tail-padding and shape traversal fixes; decision trail | VERIFIED |
| Done independent integrated interrogate | interrogate.md: reproduced behavior fixes, refreshed integrated and evidence review | VERIFIED |
| Done audio/resource evidence | Independent decoded float PCM hashes equal across14fixtures; maxWrite <=1MiB; no process-memory/long-file claim | VERIFIED for fixtures; long-file resource/device gates remain later; listening NOT VERIFIED (copy identity uses exact decoded PCM) |
| Delivery PR and actual CI state | PR #6 https://github.com/ashcx/audio-toolkit-v1/pull/6, open/ready, no configured checks | VERIFIED |

Deterministic checks use checked-in synthetic media and local browser assets; no live network calls. PCM processing/export, cancellation UI, isolation, preview, ZIP and final device acceptance remain their owning sprints. Existing AAC corresponding-source release gate remains open; no release/deployment claim.


For the relevant audio/listening exit, this increment changes no audio samples: FFmpeg independently decoded sample hashes and frame counts match for every copied output. That is the audio-correctness acceptance evidence; no perceptual listening occurred or is claimed (NOT VERIFIED). Required subjective isolation listening remains Sprint9 and is not waived. Relevant resource evidence here is measured maximum individual write, awaited bounded reads/writes and owned-storage cleanup on normal/failure/retry paths; process RSS and long-duration scaling remain required later. This does not assert full resource readiness.
