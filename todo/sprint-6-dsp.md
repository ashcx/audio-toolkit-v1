# Sprint 6 - Process accurate trims and basic audio changes

## Goal

Process accurate trims and basic audio changes. Owns feature-plan sections 10,11,12,15,19; cross-cutting requirements remain binding.

Status: In progress. DSP implementation and parent acceptance checks pass; fresh independent review passes; main delivery remains open.

## Entry criteria

- [x] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [x] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [x] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 5](sprint-5-copy-export.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [x] **S06-US01 - Implement bounded ordered DSP**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given copy is ineligible, when trim gain channels and resampling execute, then source-time boundaries, amplitude, pitch and mapping meet frozen tolerances.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Implement chunk flow, backpressure, clipping warnings and explicit unsupported multichannel handling. Add the minimal bounded PCM16 WAV output adapter needed to inspect these signals end to end; freeze its output contract here. Sprint 7 extends and validates the complete public export set.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-6/S06-US01.md`, fixtures/captures and coverage matrix.

- [x] **S06-US02 - Normalize peaks honestly**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given silent and long signals exist, when normalization runs at its recipe position, then peak meets the defined dBFS tolerance without extreme silence gain.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Use bounded analysis passes; label peak-only mode and keep proper LUFS/true peak deferred.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-6/S06-US02.md`, fixtures/captures and coverage matrix.

- [x] **S06-US03 - Prove the processing topology**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given order-sensitive recipes exist, when instrumented jobs finish, then one decode path and one terminal encode avoid intermediate lossy files.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Use reference signals for gain, channel mapping, sample rate, duration, trim boundaries and cleanup.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-6/S06-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [x] All required stories including stretch satisfy their acceptance predicates.
- [x] `docs/sprint-evidence/sprint-6/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [x] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [x] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [x] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [x] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [x] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-6/interrogate.md`.
- [x] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

After the preceding gates pass, commit and push this increment directly to main under the updated user instructions. Record the resulting automatic Pages deployment separately from technical acceptance.

- [ ] Commit and push verified changes to main, retaining plans, exact checks, captures, evidence, review verdict, gaps and starting/ending revisions.
- [ ] Verify the main commit and Pages workflow status; record observed URLs/status in References, Execution log and TODO.md.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-6-unfinished.md`. Merge and deployment follow actual authorized scope.

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
- Sprint PR: [#7 draft checkpoint](https://github.com/ashcx/audio-toolkit-v1/pull/7); incomplete, paused, technical gates open.

## Execution log

### 2026-10-29 - Planning draft

Stories and initial estimates drafted from requirements. No implementation, Ready verification, tests, device observations or sprint review occurred. Next action is to verify Entry criteria after an implementation instruction.

### 2026-10-29 - User-requested pause

Sprint5 delivered PR6 with finalbf88058 and reviewed implementationa74b9f4. Began read-only Sprint6 design/probing; no production DSP implementation. Two permitted read-only design perspectives (Terra low/Luna low) and bounded decoder-worker probe are retained in docs/sprint-evidence/sprint-6/design-checkpoint.md and adjacent artifacts. Worker timing/presentation behavior remains unresolved; no task/Done claim. All agents stopped and no decoder probe remains running. Resume with the decoder observations and contract freeze, then sequential stories. No implementation carry-forward exception is being used, no dependent sprint started. This incomplete checkpoint is saved to the sprint branch and draft PR solely to honor the user's pause/close-out request; technical acceptance and independent sprint review stay open.

Paused checkpoint committed12dc3f9 and pushed. Draft [PR7](https://github.com/ashcx/audio-toolkit-v1/pull/7) observed open/draft, no configured checks. This records incomplete work only; no sprint Done gate was asserted.

### 2026-10-29 - Resumed on deployed main

User resumed with replacement AGENTS instructions and existing automatic Pages deployment. Main3c29c0f contains checkpoint3f7e408; PR7 is closed and remains historical evidence. Current hosting HTTP200 and successful run40858999659 observed. No new branch/PR. Starting throughput checkpoint is decoder presentation/worker correctness, then ordered DSP reference signals before UI breadth. Fresh browser-per-case probe isolates Vorbis timeout, FLAC EncodingError and successful AAC in WebKit. Previous later-AAC timeout was not a general AAC support failure. Diagnose exact decoding boundary before implementing.

### 2026-10-29 - Resumed processing increment and correction

Sequential main implementation added worker PCM/DSP/checkpoint storage and WAV output after decoder probes. Acceptance contracts are in contracts.md; three story reports capture self-review and exact scope. Fresh npm ci reproduced the source/ESM patch, build passed and 15 unit tests passed. Four inherited browser regressions passed in current Sprint 6 folders. Production DSP checks passed 58 observations across Chromium/WebKit, including 3/180-second normalization, downloaded signal references, trim overrides and OPFS failure/retry/remove cleanup. Initial independent Terra high review found +219 dB near-silence amplification; parent reproduced and corrected it with a -120 dBFS untouched floor, +60 dB boost ceiling and contextual limited-target label. Fresh independent integrated review remains pending. No full-memory/device/subjective listening claim. No required work is carried into a later sprint.

### 2026-10-29 - Independent acceptance

Fresh Terra high integrated review independently reran all 58 DSP browser observations and inspected all four settled desktop/mobile captures. No new verified finding. Parent and reviewer retained resource/device/listening/format/license scope limits. Separate self-review and comment lens complete. Technical gates pass. Main delivery/deployment still to be observed.

Agent sprint review/retrospective: the native boundary probes prevented silently accepting codec-delay and waveform errors; the near-silence review caught a missing input category. Keep each boundary/reference case in rerunnable checks. No human meeting or physical listening is implied.
