# Sprint 8 - Run cancellable fault-isolated batches

## Goal

Run cancellable fault-isolated batches. Owns feature-plan sections 16,19; cross-cutting requirements remain binding.

Status: Not started. Technical delivery: Not started. Agent-verified acceptance: NOT VERIFIED.

## Entry criteria

- [ ] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [ ] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [ ] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 7](sprint-7-formats.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [ ] **S08-US01 - Schedule bounded jobs**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given a frozen recipe exists, when a mixed batch starts, then jobs expose accurate applicable states with bounded queues and PCM.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Freeze job events, attempt identity and resource ownership; choose conservative capability-based concurrency.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-8/S08-US01.md`, fixtures/captures and coverage matrix.

- [ ] **S08-US02 - Cancel and retry safely**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given waiting active failed and successful jobs coexist, when cancel one/all or retry is used, then late results cannot publish success and unrelated outputs survive.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Retry original snapshots; prevent result duplication; lock recipe edits during runs and communicate safe cancellation boundaries.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-8/S08-US02.md`, fixtures/captures and coverage matrix.

- [ ] **S08-US03 - Prove terminal cleanup**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given read process encode or save fails, when jobs terminate and repeat, then workers codecs and abandoned temporary output are released.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Test all terminal states, responsive controls and preservation of successful results.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-8/S08-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [ ] All required stories including stretch satisfy their acceptance predicates.
- [ ] `docs/sprint-evidence/sprint-8/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [ ] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [ ] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [ ] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [ ] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [ ] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-8/interrogate.md`.
- [ ] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

After the preceding gates pass, commit and push this increment directly to main under the updated user instructions. Record the resulting automatic Pages deployment separately from technical acceptance.

- [ ] Commit and push verified changes to main, retaining plans, exact checks, captures, evidence, review verdict, gaps and starting/ending revisions.
- [ ] Verify the main commit and Pages workflow status; record observed URLs/status in References, Execution log and TODO.md.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-8-unfinished.md`. Merge and deployment follow actual authorized scope.

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
