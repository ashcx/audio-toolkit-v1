# Sprint 4 - Configure ordered recipes and per-file trim overrides

## Goal

Configure ordered recipes and per-file trim overrides. Owns feature-plan sections 8,10; cross-cutting requirements remain binding.

Status: Not started. Technical delivery: Not started. Agent-verified acceptance: NOT VERIFIED.

## Entry criteria

- [ ] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [ ] Required contracts, fixtures, dependencies and browser/device access exist.
- [ ] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 3](sprint-3-intake.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [ ] **S04-US01 - Freeze the recipe specification**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given processor settings exist, when cards are added reordered expanded or removed, then versioned serializable settings preserve logical order and reject invalid combinations.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Separate terminal export; define duplicate-step rules and keyboard/mobile Move up/down controls.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-4/S04-US01.md`, fixtures/captures and coverage matrix.

- [ ] **S04-US02 - Apply source-time trim overrides**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given files inherit shared trim, when a file override changes or resets, then stable IDs retain correct effective ranges and inheritance.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Allow one trim; validate bounds, clamp excessive ends, isolate starts beyond duration and snapshot settings.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-4/S04-US02.md`, fixtures/captures and coverage matrix.

- [ ] **S04-US03 - Verify editing recovery**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given parameters or step order are invalid, when users correct settings, then summaries, labels and effective ranges agree with validation.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Capture desktop/mobile expanded/collapsed states and accessible error recovery.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-4/S04-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [ ] All required stories including stretch satisfy their acceptance predicates.
- [ ] `docs/sprint-evidence/sprint-4/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [ ] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [ ] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [ ] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [ ] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [ ] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-4/interrogate.md`.
- [ ] Relevant real-device, audio/listening and resource evidence exists. Missing observations stay NOT VERIFIED.

After the preceding gates pass, deliver this sprint's single PR. PR creation is a delivery step, not a prerequisite to reviewing the increment.

- [ ] Commit, push and open/update one sprint PR linking plans, exact checks, captures, evidence, review verdict, gaps and dependency revisions.
- [ ] Verify PR URL and CI state; record URL in References, Execution log and TODO.md, then push bookkeeping.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-4-unfinished.md`. Merge and deployment follow actual authorized scope.

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
