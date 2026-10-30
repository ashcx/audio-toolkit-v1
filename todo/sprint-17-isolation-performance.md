# Sprint 17 - Deliver a measured music isolation improvement

## Goal

Deliver the viable isolation improvement selected from Sprint 16, with measured before-and-after results and preserved quality, privacy and reliability.

Status: In progress. Technical disposition retains the existing implementation; no performance gain or full quality acceptance claimed.

## Entry criteria

- [ ] Verify Sprint 16's evidence, independent review, PR delivery and recommendation, including model and weight licensing.
- [ ] Freeze shared runtime and recipe contracts and resolve interactions with speech-cleanup changes before integration.
- [ ] Establish baseline and pass criteria for processing time, quality, memory, cancellation and fallback on the target devices.

## Depends on

[Sprint 16](sprint-16-isolation-benchmark.md) and the existing isolation, recipe and batch contracts. If no candidate demonstrates an acceptable improvement, retain the existing implementation and report the result rather than ship an unproven change. Required Mac and listening observations remain not verified until obtained.

## Tasks

One-week timebox; 6 committed points, 3 required stretch; reserve 20-30% for review and rework. Main-instance implementation follows the Scrum policy.

- [ ] **S17-US01 - Implement the selected path**. P0, 3 points; owner: main instance. Given an eligible result from Sprint 16, when the selected change is integrated, then voice and music isolation remain local and preserve recipe behavior, output timing, resource limits and model attribution. Evidence: `docs/sprint-evidence/sprint-17/implementation.md`.
- [ ] **S17-US02 - Verify performance and reliability**. P0, 3 points; owner: main instance. Given the same representative fixtures, when the product runs before and after the change, then repeated full-song time, peak memory, both outputs, GPU/CPU fallback, cancellation and cleanup are recorded. Run Mac benchmarks without competing workloads. Evidence: `docs/sprint-evidence/sprint-17/verification.md`.
- [ ] **S17-US03 - Verify user-facing quality**. P1, 3 points, required stretch; owner: main instance. Given lawful music and live/event material, when the outputs are checked, then objective quality and user listening observations are recorded, including remaining artifacts or unavailable evidence. Evidence: `docs/sprint-evidence/sprint-17/quality.md`.

## Exit criteria

- [ ] All applicable stories have evidence; any decision to retain the baseline is documented without claiming a performance gain.
- [ ] Actual product behavior, regression checks, resource limits and preserved contracts are verified. Missing Mac, thermal or listening evidence remains not verified.
- [ ] Coverage matrix, decision trail, self-review and independent interrogate are recorded; verified findings are resolved.
- [ ] The sprint PR targeting main is created and recorded. No merge or deployment without explicit permission.

## Scrum details

Use the Sprint 16 protocol for before-and-after comparisons. Log changes, exact checks, review and recovery timeboxes. Protect private media and coordinate shared code with the speech-cleanup track.

## Out of scope

Guaranteeing a target speed before measurement, adding simultaneous stem export, deploying, or changing speech-cleanup product scope.

## References

[Roadmap](../TODO.md), [orchestration](orchestration-plan.md), [Sprint 16](sprint-16-isolation-benchmark.md), [Sprint 9](sprint-9-isolation.md).

## Execution log

2026-10-30: Added at the user's request. Planning only; implementation and acceptance evidence do not yet exist.

2026-10-30: Sprint16 assessment PR18 reports no eligible measured replacement. Applied this sprint’s explicit retain-baseline outcome with no processing/runtime/dependency changes. Reran the normal unit suite and build; reused the source-identical actual Mac baseline without describing it as a new benchmark. Full comparisons, peak/thermal/fallback and quality/listening remain unverified. See Sprint17 evidence.

2026-10-30: [Draft disposition PR19](https://github.com/ashcx/audio-toolkit-v1/pull/19) targets main at3868334. Terra/Luna approve the source-identical retain-baseline decision; no measured gain or completed quality acceptance is claimed.
