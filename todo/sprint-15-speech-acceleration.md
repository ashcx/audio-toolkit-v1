# Sprint 15 - Prove speech-processing acceleration

## Goal

Provide an accelerated path for speech cleanup only where actual browser measurements demonstrate a useful, correct improvement over the CPU baseline.

Status: In progress. Technical assessment retains CPU; accelerated model execution remains not verified.

## Entry criteria

- [ ] Verify Sprints 13 and 14 evidence, model/runtime contracts and fallback behavior.
- [ ] Identify available real GPU and isolated-host CPU test environments.
- [ ] Define acceptance thresholds and target devices before measurements.

## Depends on

[Sprint 13](sprint-13-speech-model-evaluation.md) and [Sprint 14](sprint-14-speech-cleanup.md). Any dependency PRs target main; do not merge without explicit permission.

## Tasks

One-week timebox; 6 committed points, 3 required stretch; reserve 20–30% for review and rework. Main-instance implementation.

- [ ] **S15-US01 - Validate WebGPU**. P0, 3 points. Given supported GPU hardware, when each model is profiled, then actual placement, CPU fallback, quality and end-to-end speed are evidenced. Evidence: `docs/sprint-evidence/sprint-15/gpu.md`.
- [ ] **S15-US02 - Validate threaded CPU**. P0, 3 points. Given cross-origin isolation, when each model is profiled, then actual thread use, speed, memory and fallback are evidenced. Evidence: `docs/sprint-evidence/sprint-15/threads.md`.
- [ ] **S15-US03 - Ship measured wins**. P1, 3 points, required stretch. Given comparable results, when a path improves user outcomes without regressions, then it is integrated with truthful fallback and hosting notes; otherwise retain CPU and record the result. Evidence: `docs/sprint-evidence/sprint-15/coverage.md`.

## Exit criteria

- [ ] No hardware acceleration, multithreading or performance claim without verified execution and comparison.
- [ ] Audio correctness, cancellation, resource use and affected user journeys rechecked.
- [ ] Independent interrogate and coverage matrix recorded; verified findings resolved.
- [ ] PR targeting main created and recorded; no merge without explicit permission.

## Scrum details

Execute sequentially. Preserve unavailable physical devices and hosting capability as explicit evidence gaps.

## Out of scope

Changes to OS or hosting configuration without explicit authorization, model selection on the user's behalf, and unmeasured optimizations.

## References

[Roadmap](../TODO.md), [orchestration](orchestration-plan.md), [requirements](audio-toolkit-plan.md).

## Execution log

2026-10-30: User authorized investigation and possible accelerated processing. No measurements yet.

2026-10-30: Actual Chrome tests on the Mac observe Apple Metal3 GPU availability and both isolated/non-isolated CPU model execution. Both speech models use unshared WASM memory and expose no GPU/thread-provider option. No performance comparison or accelerated path is claimed. See Sprint15 coverage and raw probe JSON. The prospective thresholds are recorded before any future comparative timing.

2026-10-30: Terra/Luna reviewed the assessment and its limitations. Fixed repeat-init observation and invalid-output status defects in the research probe, added an offline boundary regression and regenerated both actual Chrome records. No production processing code changed. Accelerator execution/comparison gates remain unverified; the technical conclusion retains CPU without a speed claim.

2026-10-30: [Draft assessment PR17](https://github.com/ashcx/audio-toolkit-v1/pull/17) targets main at2d3a48f and includes dependency PR16. The assessment is reviewed; actual acceleration/comparison and release gates remain unchecked. No merge/deploy occurred.
