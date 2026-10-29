# Sprint 6 paused design checkpoint

Paused at the user's explicit request on 2026-10-29. This is incomplete research, not a completed sprint or verified DSP implementation. No production DSP code changed. Current branch sprint/6-dsp starts from Sprint5 finalbf88058, implementationa74b9f4, PR6 open/ready. No carry-forward from completed sprints.

## Completed before pause

Read Sprint6 goal and predecessor artifacts/contracts. Two read-only major-design sketches used Terra low and Luna low, with no implementation delegates. Both keep the existing copy/PCM planner as authority, bounded pull-based PCM blocks and one worker-owned decoder/pipeline/terminal PCM16 WAV encoder. Normalization analyzes and replays an owned OPFS float-PCM checkpoint at its actual card position. Trim must retain source-time mapping across earlier resampling; use stable origin plus integer frame-grid mapping (Luna proposed exact rationals). Neither timing representation nor concrete resampling implementation is frozen yet.

Pinned Mediabunny's internal AudioResampler uses a five-second buffer and naive linear interpolation without lowpass; inspected source is unsuitable for the intended anti-aliasing claim. Candidate: bounded windowed-sinc/polyphase filter with history/lookahead and one EOF flush, with independently measured alias/duration/chunk-split behavior. No resampling quality result exists yet. Existing bounded output store and copy path should remain separate dispatch branches within a generalized export runner.

## Decoder worker probe: actual observations

The saved decoder-worker-probe.json records9fixtures in each engine using the existing dev server on5173. Chromium returned all9. WebKit returned WAV/AAC/MP3/Opus, then Vorbis, FLAC and the later AAC/Opus video cases hit a five-second probe timeout. Those timeouts are NOT a proven codec or platform limitation; diagnose fresh per-case contexts, capability checks and cleanup before choosing production behavior. Do not turn a timeout into a ready claim or silently use whole-file decodeAudioData. Known FLAC chunk decoder remains an available fallback, not integrated.

Native decoded counts include codec priming/padding: AAC97280, MP397920 and differing Opus totals appear in these probes, while copy references independently decode different presentation lengths. PCM execution must resolve presentation timestamps, pre-skip/tail metadata and source-time boundaries, rather than blindly concatenate every decoded sample. MP3 gapless delay/padding metadata requires investigation. No parser or fix has been implemented. Inspect JSON first/last timestamps and Sprint5 reference PCM counts.

Exact run source is retained as decoder-worker-probe.ts.txt and decoder-worker-probe-run.mjs.txt. Actual exploratory files remain ignored under .upstream/s6-probe; harness ran `node .upstream/s6-probe/run.mjs`. Its current dev-server paths are root-relative (production static path remains /audio-toolkit-v1/); next implementation verification must use the actual built production worker path. The first unbounded wait probe was stopped, then a bounded five-second-per-case run completed. No probe remains running.

## Resume sequence

1. Read todo/RESUME.md and the current sprint, confirm branches/PR states and preserve current minimal-copy UI.
2. Resolve worker decoding/presentation observations empirically, then freeze the DSP data shape, resampling tolerances and replay contracts before code.
3. Implement Sprint6 stories sequentially in main instance. Validate actual WAV signals, ordered normalization/trim, silence, channels, sample rate/pitch, clipping and cleanup; instrument one decoder and terminal encoder. Do not substitute a full-file buffer.
4. Run all relevant regressions, self-review and independent Terra high interrogate, then update this sprint's one draft PR. Do not mark Done or begin dependent Sprint7 before gates pass.

No physical-device or listening observation was made here. User-approved real-device gate remains Sprint12; real isolation listening remains Sprint9. No merge or deployment authorized.
