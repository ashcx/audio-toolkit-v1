# Sprint 6 - Process accurate trims and basic audio changes

## Goal

Process accurate trims and basic audio changes. Owns feature-plan sections 10,11,12,15,19; cross-cutting requirements remain binding.

Status: Not started. Technical delivery: Not started. Agent-verified acceptance: NOT VERIFIED.

## Entry criteria

- [ ] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [ ] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [ ] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 5](sprint-5-copy-export.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [ ] **S06-US01 - Implement bounded ordered DSP**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given copy is ineligible, when trim gain channels and resampling execute, then source-time boundaries, amplitude, pitch and mapping meet frozen tolerances.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Implement chunk flow, backpressure, clipping warnings and explicit unsupported multichannel handling. Add the minimal bounded PCM16 WAV output adapter needed to inspect these signals end to end; freeze its output contract here. Sprint 7 extends and validates the complete public export set.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-6/S06-US01.md`, fixtures/captures and coverage matrix.

- [ ] **S06-US02 - Normalize peaks honestly**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given silent and long signals exist, when normalization runs at its recipe position, then peak meets the defined dBFS tolerance without extreme silence gain.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Use bounded analysis passes; label peak-only mode and keep proper LUFS/true peak deferred.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-6/S06-US02.md`, fixtures/captures and coverage matrix.

- [ ] **S06-US03 - Prove the processing topology**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given order-sensitive recipes exist, when instrumented jobs finish, then one decode path and one terminal encode avoid intermediate lossy files.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Use reference signals for gain, channel mapping, sample rate, duration, trim boundaries and cleanup.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-6/S06-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [ ] All required stories including stretch satisfy their acceptance predicates.
- [ ] `docs/sprint-evidence/sprint-6/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [ ] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [ ] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [ ] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [ ] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [ ] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-6/interrogate.md`.
- [ ] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

After the preceding gates pass, deliver this sprint's single PR. PR creation is a delivery step, not a prerequisite to reviewing the increment.

- [ ] Commit, push and open/update one sprint PR linking plans, exact checks, captures, evidence, review verdict, gaps and dependency revisions.
- [ ] Verify PR URL and CI state; record URL in References, Execution log and TODO.md, then push bookkeeping.

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
- Sprint PR: not created.

## Execution log

### 2026-10-29 - Planning draft

Stories and initial estimates drafted from requirements. No implementation, Ready verification, tests, device observations or sprint review occurred. Next action is to verify Entry criteria after an implementation instruction.
