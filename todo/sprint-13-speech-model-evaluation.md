# Sprint 13 - Compare speech cleanup models and browser processing paths

## Goal

Produce reproducible evidence comparing GTCRN and DeepFilterNet3 for speech with background noise. Retain both models for the user's later inclusion decision.

Status: In progress. Research checkpoint; acceptance remains open.

## Entry criteria

- [ ] Verify baseline main, existing recipe and processing contracts, and model provenance.
- [ ] Establish representative licensed speech/noise fixtures and reference checks.
- [ ] Define browser, hardware, quality, timing and memory measurement methods.

## Depends on

Existing PCM processing, batch and export contracts. Prior unfinished physical-device checks remain open and are not silently waived.

## Tasks

One-week timebox; 6 committed points, 3 required stretch; reserve 20–30% for review and rework. Main-instance implementation.

- [ ] **S13-US01 - Establish CPU baselines**. P0, 3 points. Given representative speech, when both models run locally, then outputs and end-to-end time, memory, model size and audible quality are recorded. Evidence: `docs/sprint-evidence/sprint-13/cpu.md`.
- [ ] **S13-US02 - Assess acceleration**. P0, 3 points. Given suitable hardware and isolated hosting, when GPU and threaded CPU are tested, then actual execution, fallback, numerical quality and runtime are measured or marked not verified. Evidence: `docs/sprint-evidence/sprint-13/acceleration.md`.
- [ ] **S13-US03 - Record quality and provenance**. P1, 3 points, required stretch. Given the results, when tradeoffs are reviewed, then model, weights, browser support, licensing and listening limitations are recorded without selecting for the user. Evidence: `docs/sprint-evidence/sprint-13/coverage.md`.

## Exit criteria

- [ ] All stories have reproducible evidence and honest limitations; no unmeasured performance or quality claims.
- [ ] Independent interrogate and coverage matrix recorded; verified findings resolved.
- [ ] PR targeting main created and recorded; no merge without explicit permission.

## Scrum details

Execute sequentially. Maintain decision trail and actual review records. Missing real-device/listening evidence stays not verified.

## Out of scope

Replacing music separation, automatic model selection, deployment, and the user's final model inclusion decision.

## References

[Roadmap](../TODO.md), [orchestration](orchestration-plan.md), [requirements](audio-toolkit-plan.md).

## Execution log

2026-10-30: User authorized comparison and implementing both choices for evaluation. No results yet.

2026-10-30: Started on codex/sprint-13-speech-evaluation at e9d68cc. Both pinned CPU runtimes executed in Chrome. See [coverage](../docs/sprint-evidence/sprint-13/coverage.md) for incomplete representative-quality, memory, provenance, acceleration and review gates. Sprints 14–15 remain dependent.

2026-10-30: Terra high and Luna high reviewed the integrated research checkpoint. The parent fixed and reproduced a reference-grid validation defect, recorded fixture digests, and reran Chrome. Both reviewers confirmed the fixes and withheld Sprint 13 acceptance and dependent progression. A supported project-local Node 22.23.1 clean locked build passes. Representative corpus, listening, end-to-end timing, memory and full source/model rights audit remain open. No last-resort exception or completed-sprint PR is claimed. Review and exact evidence are in the Sprint 13 evidence directory.
