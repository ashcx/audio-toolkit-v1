# Sprint 16 - Compare music isolation models and processing paths

## Goal

Identify a practical way to reduce voice and music isolation time without an unacceptable loss of quality or reliability. Record a reproducible comparison and recommendation.

Status: Not started.

## Entry criteria

- [ ] Verify the current isolation implementation, model provenance, runtime, resource limits and existing acceptance gaps.
- [ ] Define representative lawful fixtures, measurement protocol, quality checks and hardware/browser metadata. Keep `test_songs/` out of Git.
- [ ] Establish the shared runtime and recipe contracts and coordinate any overlapping speech-cleanup work.

## Depends on

The Sprint 9 isolation and batch contracts. Existing device and listening gaps remain open. Independent preparation may overlap Sprints 13-15; shared changes and Mac benchmarks must be coordinated. Access to the user's Mac and listening observations is required for Mac-specific claims.

## Tasks

One-week timebox; 6 committed points, 3 required stretch; reserve 20-30% for review and rework. Main-instance implementation follows the Scrum policy.

- [ ] **S16-US01 - Measure the current experience**. P0, 3 points; owner: main instance. Given representative songs, when current SCNet runs, then full-song time, first-load and warm-run time, peak memory, output quality and actual execution path are recorded with device and browser details. Repeat measurements without competing Mac benchmarks. Evidence: `docs/sprint-evidence/sprint-16/baseline.md`.
- [ ] **S16-US02 - Compare practical candidates**. P0, 3 points; owner: main instance. Given the same fixtures and measurement protocol, when feasible SCNet pipeline changes and DTTNet vocal separation are evaluated, then their speed, memory, quality, browser compatibility and weight licenses are compared or explicitly marked not verified. Check the derived instrumental as well as vocals. Evidence: `docs/sprint-evidence/sprint-16/comparison.md`.
- [ ] **S16-US03 - Recommend a path**. P1, 3 points, required stretch; owner: main instance. Given the measured results, when tradeoffs are assessed, then recommend a viable change or retain the baseline if no candidate meets quality and reliability requirements. Record unresolved Mac and listening observations and the Sprint 17 scope. Evidence: `docs/sprint-evidence/sprint-16/recommendation.md`.

## Exit criteria

- [ ] Each story has reproducible evidence, explicit comparison conditions and honest limitations. No speed or quality improvement is claimed without measurements.
- [ ] Mac GPU, thermal and human listening observations are recorded when available; missing observations remain not verified.
- [ ] Coverage matrix, decision trail, self-review and independent interrogate are recorded; verified findings are resolved.
- [ ] A planning and evidence PR targeting main is created and recorded. No merge without explicit permission.

## Scrum details

Record exact model and fixture identities, warmup, run order, hardware, browser version and the meaning of memory and timing measurements. Keep media private. Log review and recovery timeboxes. Compare independent work without running simultaneous performance tests on the same Mac.

## Out of scope

Shipping an unverified model, simultaneous stem export, deployment and claims based solely on parameter counts or published benchmarks.

## References

[Roadmap](../TODO.md), [orchestration](orchestration-plan.md), [Sprint 9](sprint-9-isolation.md), [Sprint 17](sprint-17-isolation-performance.md), [SCNet model record](../public/vendor/neural/README.md).

## Execution log

2026-10-30: Added at the user's request. Planning only; no new benchmark, device observation or implementation has been completed.
