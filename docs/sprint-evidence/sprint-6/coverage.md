# Sprint 6 coverage

Base `3c29c0f`; current integrated working tree is under review. Parent and independent acceptance checks pass; main delivery remains pending.

| Condition | Evidence | Verdict |
| --- | --- | --- |
| Ready predecessor | Sprint 5 coverage/interrogate, integrated main history, closed historical checkpoint PR7 | VERIFIED |
| Ready contracts, fixtures, browsers | contracts.md; checked-in synthetic media; regenerated analytic signals in scripts/dsp-check.mjs; Chromium/WebKit | VERIFIED |
| Ready carry-forwards | None used | VERIFIED |
| US01 ordered DSP, boundaries, mapping, rates | tests/pcm.test.mjs; DSP downloaded WAV checks | VERIFIED |
| US02 position, peak, silence, long signals | contracts.md; normalization/quiet/3 s/180 s WAV observations | VERIFIED |
| US03 topology and reference signals | worker completion statistics independently matched to downloaded frames, codec probes and DSP suite | VERIFIED |
| Deterministic checks | Fresh npm ci reproduced guarded 4-file patch; npm run build; node --test tests/*.test.mjs, 15/15 | VERIFIED |
| Inherited contracts/data safety | workspace, intake, recipe and copy regression folders; all four suites passed in both engines | VERIFIED |
| UI themes/layout/keyboard/touch/recovery | inherited captures/checks; DSP desktop/mobile captures; current/edited result labels; quota/retry/remove | VERIFIED |
| Self-review | source-time/decoder boundary probes, stale PCM label fix, bounded storage, near-silence reproduction | VERIFIED, independently refreshed |
| Independent interrogate | interrogate.md, Terra high initial finding, parent reproduction/fix | VERIFIED, fresh Terra high integrated run 58 observations |
| Relevant audio/resource evidence | independent numerical WAV references; 60× duration fixture comparison and bounded block/checkpoint counters | VERIFIED for fixture block/checkpoint behavior; RSS NOT VERIFIED (Sprint 11) |
| Physical devices/listening | User-approved Sprint 12 devices and Sprint 9 real isolation listening | NOT VERIFIED, deferred by explicit scope |
| Main delivery/Pages | User-authorized automatic deployment; no current increment pushed yet | NOT VERIFIED |

No full-app completion claim. Retained output WAVs are rerunnable local artifacts, not committed large binary evidence. Committed results and captures record observations. AAC source release audit remains open; no claim that hosting closes it.

Exact parent run: `DSP_EVIDENCE_DIR=docs/sprint-evidence/sprint-6/dsp node scripts/dsp-check.mjs`, 58 observations passed across Chromium and WebKit, plus explicit multichannel failure and quota/remove cleanup assertions. Results are dsp/results.json. Three-second and 180-second jobs reported maxDecodedFrames/maxBlockFrames 2048/2048 in both engines; no RSS result is inferred. Initial dark DSP captures caught an in-progress theme transition; settled captures are explicitly named *-mobile-dark-settled.png. The harness now waits for the actual dark control background before capture.
