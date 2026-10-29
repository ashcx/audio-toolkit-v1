# Sprint 1 - Verify the local processing foundation

## Goal

Verify the local processing foundation. Owns feature-plan sections 2,7,13,20,21,22; cross-cutting requirements remain binding.

Status: Not started. Technical delivery: Not started. Agent-verified acceptance: NOT VERIFIED.

## Entry criteria

- [ ] Verify source requirements and repository authorization. Predecessor artifacts, PR and review are not applicable because this is the first implementation sprint.
- [ ] Inputs for feasibility work are available: source repository access and lawful probe fixtures. Browser/device availability is recorded honestly; missing required observations block affected exits. Contracts created by this sprint are outputs, not entry prerequisites.
- [ ] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

None. Start from the feature requirements and repository authorization.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [ ] **S01-US01 - Audit upstream and licenses**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given authoritative source is located, when exact revisions are inspected, then code, weights, codec licenses and redistribution obligations have traceable evidence.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Inspect AudioTools.dev, Mediabunny, SCNet/ONNX and every proposed encoder; record versions and reusable modules.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-1/S01-US01.md`, fixtures/captures and coverage matrix.

- [ ] **S01-US02 - Probe browser and hosting feasibility**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given pinned candidates exist, when copy, encode and isolation probes run, then native/fallback paths and Pages asset/header constraints have actual pass/fail evidence.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Probe desktop, Safari and Android capabilities, model delivery and bounded isolation before committing to the stack.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-1/S01-US02.md`, fixtures/captures and coverage matrix.

- [ ] **S01-US03 - Freeze test and product contracts**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given probe results exist, when defaults and fixture protocol are recorded, then numerical audio tolerances and initial device/version targets are explicit.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Define lawful fixtures, output inspection references and measurable quality budgets; mark unavailable browsers NOT VERIFIED.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-1/S01-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [ ] All required stories including stretch satisfy their acceptance predicates.
- [ ] `docs/sprint-evidence/sprint-1/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [ ] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [ ] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [ ] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [ ] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [ ] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-1/interrogate.md`.
- [ ] Relevant real-device, audio/listening and resource evidence exists. Missing observations stay NOT VERIFIED.

After the preceding gates pass, deliver this sprint's single PR. PR creation is a delivery step, not a prerequisite to reviewing the increment.

- [ ] Commit, push and open/update one sprint PR linking plans, exact checks, captures, evidence, review verdict, gaps and dependency revisions.
- [ ] Verify PR URL and CI state; record URL in References, Execution log and TODO.md, then push bookkeeping.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-1-unfinished.md`. Merge and deployment follow actual authorized scope.

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
