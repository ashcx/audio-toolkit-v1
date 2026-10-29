# Sprint 5 - Extract original audio without encoding

## Goal

Extract original audio without encoding. Owns feature-plan sections 9,14,15; cross-cutting requirements remain binding.

Status: Not started. Technical delivery: Not started. Agent-verified acceptance: NOT VERIFIED.

## Entry criteria

- [ ] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [ ] Required contracts, fixtures, dependencies and browser/device access exist.
- [ ] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 4](sprint-4-recipe.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [ ] **S05-US01 - Compile effective execution plans**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given validated snapshots and detected tracks exist, when each input is planned, then copy eligibility and required PCM work are explicit.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Freeze processor capabilities and planner contracts; preserve step order and eliminate only real no-ops.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-5/S05-US01.md`, fixtures/captures and coverage matrix.

- [ ] **S05-US02 - Execute packet copy**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given compatible original audio is selected, when extraction finishes, then one audio-only output retains packets with zero decoder/encoder calls.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Stream demux/remux with correct container, timestamps, extension and MIME; instrument calls.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-5/S05-US02.md`, fixtures/captures and coverage matrix.

- [ ] **S05-US03 - Prove mixed-codec paths**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given AAC MP3 Opus Vorbis and FLAC fixtures exist, when copy is requested, then supported paths preserve payloads and incompatible paths never silently transcode.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Compare encoded packets and independently inspect playback, duration and per-file output containers.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-5/S05-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [ ] All required stories including stretch satisfy their acceptance predicates.
- [ ] `docs/sprint-evidence/sprint-5/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [ ] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [ ] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [ ] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [ ] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [ ] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-5/interrogate.md`.
- [ ] Relevant real-device, audio/listening and resource evidence exists. Missing observations stay NOT VERIFIED.

After the preceding gates pass, deliver this sprint's single PR. PR creation is a delivery step, not a prerequisite to reviewing the increment.

- [ ] Commit, push and open/update one sprint PR linking plans, exact checks, captures, evidence, review verdict, gaps and dependency revisions.
- [ ] Verify PR URL and CI state; record URL in References, Execution log and TODO.md, then push bookkeeping.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-5-unfinished.md`. Merge and deployment follow actual authorized scope.

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
