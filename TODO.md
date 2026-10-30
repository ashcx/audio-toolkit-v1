# Audio Toolkit TODO roadmap

Prepared 2026-10-29. Implementation resumed on 2026-10-29. Current user instructions require working branches and PRs targeting main, with no direct-main commits/pushes or merge without explicit permission. Existing GitHub Pages automation deploys main only after an authorized merge. The user can perform real-device acceptance. Sprints 1–8 are complete within their scope; Sprint 9 is in progress after resuming from [the checkpoint](todo/RESUME.md). [Feature requirements](todo/audio-toolkit-plan.md) remain authoritative and unchecked until evidence exists.

The user confirmed the public repository `ashcx/audio-toolkit-v1`. Production path is `/audio-toolkit-v1/`; the current page returned HTTP 200 and deployment run40858999659 succeeded. This verifies hosting, not unfinished app functionality. Future sprints deliver working branches and PRs targeting main; historical deployment links remain evidence.

## Sprint sequence

| Sprint | Observable outcome | Requirement sections | Status |
| --- | --- | --- | --- |
| [1](todo/sprint-1-feasibility.md) | Verify the local processing foundation | 2,7,13,20,21,22 | Complete, [PR #2](https://github.com/ashcx/audio-toolkit-v1/pull/2) |
| [2](todo/sprint-2-workspace.md) | Open a responsive accessible audio workspace | 2,5,22 | Complete, [PR #3](https://github.com/ashcx/audio-toolkit-v1/pull/3) |
| [3](todo/sprint-3-intake.md) | Inspect mixed audio and video batches | 6,7 | Complete, [PR #4](https://github.com/ashcx/audio-toolkit-v1/pull/4) |
| [4](todo/sprint-4-recipe.md) | Configure ordered recipes and per-file trim overrides | 8,10 | Complete, [PR #5](https://github.com/ashcx/audio-toolkit-v1/pull/5) |
| [5](todo/sprint-5-copy-export.md) | Extract original audio without encoding | 9,14,15 | Complete, [PR #6](https://github.com/ashcx/audio-toolkit-v1/pull/6) |
| [6](todo/sprint-6-dsp.md) | Process accurate trims and basic audio changes | 10,11,12,15,19 | Complete, main9f50c82, [Pages success](https://github.com/ashcx/audio-toolkit-v1/actions/runs/40877444915), live WAV smoke passed |
| [7](todo/sprint-7-formats.md) | Export all required encoded formats | 14,21,22 | Complete, main5a61da3, [Pages success](https://github.com/ashcx/audio-toolkit-v1/actions/runs/40889990911), live MP3/AAC/Opus smoke passed |
| [8](todo/sprint-8-batch.md) | Run cancellable fault-isolated batches | 16,19 | Complete, main312c673, [Pages success](https://github.com/ashcx/audio-toolkit-v1/actions/runs/40927620132), live cancellation/retry and MP3 downloads passed |
| [9](todo/sprint-9-isolation.md) | Keep voice or music locally in the recipe | 13,15,19,22 | In progress; [PR #9](https://github.com/ashcx/audio-toolkit-v1/pull/9) merged, [reliability PR #10](https://github.com/ashcx/audio-toolkit-v1/pull/10) open with full-song checks passed; Mac GPU and listening acceptance remain open |
| [10](todo/sprint-10-preview-presets.md) | Test one file and reuse the result in the batch | 17 | [PR #11](https://github.com/ashcx/audio-toolkit-v1/pull/11) open; technical checks pass, independent technical review passed in Sprint11; device acceptance open |
| [11](todo/sprint-11-downloads-limits.md) | Download retained results within measured limits | 18,19 | [PR #12](https://github.com/ashcx/audio-toolkit-v1/pull/12) open; technical checks/review pass; measured workload/device limits recorded |
| [12](todo/sprint-12-release-readiness.md) | Verify the complete static audio product | 3,4,20,22,25,26,27 | [PR #13](https://github.com/ashcx/audio-toolkit-v1/pull/13) open; technical automation/review pass; physical/listening acceptance open |
| [13](todo/sprint-13-speech-model-evaluation.md) | Compare speech cleanup models and browser processing paths | Speech cleanup | Not started |
| [14](todo/sprint-14-speech-cleanup.md) | Add Standard and Detailed voice isolation to ordered recipes | Speech cleanup | Not started |
| [15](todo/sprint-15-speech-acceleration.md) | Assess and deliver proven speech-processing acceleration | Speech cleanup | Not started |
| [16](todo/sprint-16-isolation-benchmark.md) | Compare music isolation models and processing paths | 13,19 | Not started |
| [17](todo/sprint-17-isolation-performance.md) | Deliver a measured music isolation improvement | 13,19 | Not started |

## Final acceptance

- [ ] All required source features and section 26 have evidence, including isolation and all required exports.
- [ ] Every sprint has passed independent interrogate and delivered its verified working-branch PR targeting main. No required stretch or carry-forward remains unresolved.
- [ ] Browser, audio correctness, privacy, accessibility and measured resource matrices pass.
- [ ] Production deployment is authorized and observed before claiming the live app works.
- [ ] Hub/image work has a separate handoff; this workspace does not claim those sites delivered.

## Start here

Read [orchestration](todo/orchestration-plan.md), [Scrum policy](todo/redesign-scrum-plan.md) and [Sprint 1](todo/sprint-1-feasibility.md). Implementation is now authorized and follows the earliest eligible sprint. Section 25 is the cross-sprint verification inventory. Sections 23 and 24 remain deferred/excluded.

## Planning delivery

Planning validation and independent review are in [planning evidence](docs/sprint-evidence/planning/validation.md). The decision trail is [decisions.tsv](docs/sprint-evidence/planning/decisions.tsv). Planning PR: [#1](https://github.com/ashcx/audio-toolkit-v1/pull/1). This PR is separate from all future implementation sprint PRs.
