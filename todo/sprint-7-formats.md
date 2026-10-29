# Sprint 7 - Export all required encoded formats

## Goal

Export all required encoded formats. Owns feature-plan sections 14,21,22; cross-cutting requirements remain binding.

Status: In progress. Technical acceptance and independent review pass; main delivery remains open.

## Entry criteria

- [x] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [x] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [x] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 6](sprint-6-dsp.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [x] **S07-US01 - Encode MP3 and AAC**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given PCM is available, when MP3 or M4A is selected, then advertised bitrates produce valid flushed playable files.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Support MP3 128/192/256/320 and AAC 128/192/256 kbps with verified native/fallback paths.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-7/S07-US01.md`, fixtures/captures and coverage matrix.

- [x] **S07-US02 - Encode WAV FLAC and Opus**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given PCM is available, when lossless or Opus is selected, then headers, bit depth, rate, MIME and extension are correct.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Guard WAV limits; document FLAC properties; encode Opus in OGG and retain dependency notices.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-7/S07-US02.md`, fixtures/captures and coverage matrix.

- [x] **S07-US03 - Verify export combinations**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given required formats and rates are advertised, when short and long fixtures export, then independent inspection validates final frames, properties and sizes.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Test encoder flush and invalid rate recovery; distinguish video source bytes from extracted audio size comparisons.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-7/S07-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [x] All required stories including stretch satisfy their acceptance predicates.
- [x] `docs/sprint-evidence/sprint-7/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [x] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [x] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [x] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [x] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [x] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-7/interrogate.md`.
- [x] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

After the preceding gates pass, commit and push this increment directly to main under the updated user instructions. Record the resulting automatic Pages deployment separately from technical acceptance.

- [ ] Commit and push verified changes to main, retaining plans, exact checks, captures, evidence, review verdict, gaps and starting/ending revisions.
- [ ] Verify the main commit and Pages workflow status; record observed URLs/status in References, Execution log and TODO.md.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-7-unfinished.md`. Merge and deployment follow actual authorized scope.

## Scrum details

Planning up to 60 minutes. Daily written sync up to 15 minutes per working day. Review and retrospective up to 45 minutes each. Record actual agent-run events, never invented meetings. At expiry record remaining work and a recovery timebox. Read the shared Scrum policy for review and progression rules.

## Out of scope

Source sections 23–24 deferred features and exclusions. Hub/image implementation. Unrequested merge or production release.

## References

- [Roadmap](../TODO.md).
- [Orchestration](orchestration-plan.md).
- [Scrum policy](redesign-scrum-plan.md).
- [Feature requirements](audio-toolkit-plan.md).
- Decision trail: `docs/sprint-evidence/decisions.tsv`.
- Sprint PR: not created.

## Execution log

### 2026-10-29 - Planning draft

Stories and initial estimates drafted from requirements. No implementation, Ready verification, tests, device observations or sprint review occurred. Next action is to verify Entry criteria after an implementation instruction.

### 2026-10-29 - Entry and design

Sprint6 final518799a includes reviewed implementation9f50c82,58 browser observations,15 unit tests, fresh Terra high verdict and live Pages40877444915 WAV smoke. No carry-forward used. Main-instance sequential Sprint7 starts from518799a. Two allowed read-only designs, Terra low and Luna low, explored shared format configuration versus terminal lifecycle adapter. Parent selects small configuration helper, preserving worker lifecycle ownership; no extra judge needed for this narrow boundary. First throughput checkpoint is actual short/tail output validity and native AAC/fallback capability, then advertised bitrate/rate matrix and long flush evidence. Actual estimates remain6 committed+3 required stretch, reserve independent review/rework before delivery.

### 2026-10-29 - Implementation and parent acceptance

Sequential main implementation complete. See three story reports, architecture.md and coverage.md. Fresh npm ci/build passed,17 unit checks passed, full legal bitrate/rate/channel grid plus tiny/long/video cases passed224 downloads in Chromium/WebKit, inherited DSP58 and workspace/intake/recipe/copy regressions pass. Bounded Opus tail rewrite/truncate and Chromium pre-skip correction resolve measured timing defects; MP3 gapless metadata expresses the true frame count. WebKit native AAC was experimentally unsuitable and uses fallback. Replaced the unpinned AAC binary with a byte-reproducible FFmpeg n8.0 runtime and served source ZIP, scripts/hashes/notices. Exact-source gap resolved; final transitive audit remains Sprint12. Self-review complete. No carry-forward. Independent review remains open before any commit/push.

### 2026-10-29 - Independent review

Integrated technical verdict PASS from one independent non-implementing Terra high reviewer. A fresh dispatch hit the thread limit; explicit poteto exception permitted reuse of the completed reviewer with full current brief. Independent224 downloads plus8kHz Opus edge check, source hashes and desktop/mobile captures pass. No new proven behavior findings; two stale documentation statements corrected. Comment lens found no scoped suppressions/deletions. Final transitive audit, workload limits and user device/listening gates retain later ownership. Retrospective: final timing must be checked by independent decoding, and source provenance must match the actual bundled runtime. Main delivery remains next.
