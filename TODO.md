# Audio Toolkit TODO roadmap

> **Sprint evidence removed from the tree.** The per-sprint evidence files that used to live under `docs/sprint-evidence/` are no longer tracked. They are recoverable from git history, for example `git show 918380b:docs/sprint-evidence/sprint-27/coverage.md` or `git ls-tree -r 918380b docs/sprint-evidence`. Plain-text paths and Sprint decisions in these planning documents still describe that history. Scripts that wrote evidence there now default to `.artifacts/evidence/`.

## Delivered refinement sprints

[The refinement plan](todo/workspace-audio-refinement-sprints.md) authorizes Sprints 21–23. Sprints 24–26 have individual checklist files below. Merged means the PR landed; it does not by itself establish the sprint's listening, device or acceptance gates.

| Sprint | Outcome | Status |
| --- | --- | --- |
| [21](todo/workspace-audio-refinement-sprints.md) | Test isolation overlap and bounded model reuse | Merged, [PR #24](https://github.com/ashcx/audio-toolkit-v1/pull/24) |
| [22](todo/workspace-audio-refinement-sprints.md) | Balance panels and fix trim dragging | Merged, [PR #25](https://github.com/ashcx/audio-toolkit-v1/pull/25), [PR #27](https://github.com/ashcx/audio-toolkit-v1/pull/27) |
| [23](todo/workspace-audio-refinement-sprints.md) | Compare processed excerpts before export | Merged, [PR #26](https://github.com/ashcx/audio-toolkit-v1/pull/26) |
| [24](todo/sprint-24-loudness-compression.md) | Add loudness, true-peak control and compression | Merged, [PR #29](https://github.com/ashcx/audio-toolkit-v1/pull/29) |
| [25](todo/sprint-25-compact-playback.md) | Compact the workspace and clarify playback | Merged, [PR #28](https://github.com/ashcx/audio-toolkit-v1/pull/28) |
| [26](todo/sprint-26-encoding-modes.md) | Expose verified CBR, VBR and supported encoding modes | Merged, [PR #31](https://github.com/ashcx/audio-toolkit-v1/pull/31), [PR #32](https://github.com/ashcx/audio-toolkit-v1/pull/32) |

## Pending individual sprint plans

These files are the authoritative execution checklists. The grouped documents retain shared research and historical context.

| Sprint | Outcome | Status |
| --- | --- | --- |
| [27](todo/sprint-27-demucs-runtime.md) | Evaluate and optimize browser Demucs v4 | Implemented on branch; listening and device gates open. Demucs replaced SCNet; coverage |
| [28](todo/sprint-28-ui-ux-overhaul.md) | Clear wording, quieter status and plain errors | Planned |
| [29](todo/sprint-29-waveform-trimming.md) | Add waveform playback and individual-track trimming | Planned |

SCNet was removed in Sprint 27: Demucs on WebGPU separated 3.7 to 4 times faster, and one engine keeps one model, license and test surface. Sprint 28 is a UI and wording overhaul that replaced the withdrawn stem-selection sprint. Sprint 29 no longer includes four-stem audition. Sprints 28 and 29 remain planning-only.

[Sprints 27–29](todo/demucs-waveform-sprints.md) add research-backed planning for optimized browser Demucs v4, selectable four-stem/instrumental outputs, and compact waveform playback with individual-track trimming. Waveform handles never edit the batch range.

[Sprints 25–26](todo/compact-playback-encoding-sprints.md) plan compact metadata, aligned Export actions, Trim all, inline playback and clear exported-download behavior, then only encoding modes verified in the actual format and backend. Both are delivered.

Prepared 2026-10-29. Implementation resumed on 2026-10-29. Current user instructions require working branches and PRs targeting main, with no direct-main commits/pushes or merge without explicit permission. Existing GitHub Pages automation deploys main only after an authorized merge. The user can perform real-device acceptance. Sprints 1–8 are complete within their scope; Sprints 9–26 are merged to main; their listed acceptance gates remain open (see the table). [Feature requirements](todo/audio-toolkit-plan.md) remain authoritative and unchecked until evidence exists.

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
| [9](todo/sprint-9-isolation.md) | Keep voice or music locally in the recipe | 13,15,19,22 | Merged to main (branch is an ancestor of main); Mac GPU and listening acceptance open |
| [10](todo/sprint-10-preview-presets.md) | Test one file and reuse the result in the batch | 17 | Merged to main (branch is an ancestor of main); device acceptance open |
| [11](todo/sprint-11-downloads-limits.md) | Download retained results within measured limits | 18,19 | Merged to main (branch is an ancestor of main); none recorded beyond measured limits |
| [12](todo/sprint-12-release-readiness.md) | Verify the complete static audio product | 3,4,20,22,25,26,27 | Merged to main (branch is an ancestor of main); physical-device and listening acceptance open |
| [13](todo/sprint-13-speech-model-evaluation.md) | Compare speech cleanup models and browser processing paths | Speech cleanup | Merged to main (branch is an ancestor of main); acceptance and dependent progression open |
| [14](todo/sprint-14-speech-cleanup.md) | Add Standard and Detailed voice isolation to ordered recipes | Speech cleanup | Merged to main (branch is an ancestor of main); release, device and listening acceptance open |
| [15](todo/sprint-15-speech-acceleration.md) | Assess and deliver proven speech-processing acceleration | Speech cleanup | Merged to main (branch is an ancestor of main); accelerator and comparison gates unverified |
| [16](todo/sprint-16-isolation-benchmark.md) | Compare music isolation models and processing paths | 13,19 | Merged to main (branch is an ancestor of main); comparisons and quality gates open |
| [17](todo/sprint-17-isolation-performance.md) | Deliver a measured music isolation improvement | 13,19 | Merged to main (branch is an ancestor of main); no improvement claimed; baseline retained |
| [18](todo/sprint-18-workspace-redesign.md) | Simplify the workspace and file results | Redesign, 5,6,17,22 | Merged to main (branch is an ancestor of main); broader acceptance open |
| [19](todo/sprint-19-recipe-interactions.md) | Modernize recipe and trim controls | Redesign, 8,10,11,12 | Merged to main (branch is an ancestor of main); physical and matrix gaps open |
| [20](todo/sprint-20-output-delivery.md) | Deliver ZIP and supported folder saving | Redesign, 18,19,20 | [Merged PR22](https://github.com/ashcx/audio-toolkit-v1/pull/22), reviewed folder delivery; native save/ZIP verified; physical/unsupported matrix open |

The 2026-10-30 redesign request adds Sprints 18–20 after Sprint 17. It is planning-only; it does not authorize execution in this turn. The [redesign requirements](todo/audio-toolkit-plan.md#28-redesign-direction-2026-10-30) supersede conflicting earlier UI requirements.

## Final acceptance

- [ ] All required source features and section 26 have evidence, including isolation and all required exports.
- [ ] Every sprint has passed independent interrogate and delivered its verified working-branch PR targeting main. No required stretch or carry-forward remains unresolved.
- [ ] Browser, audio correctness, privacy, accessibility and measured resource matrices pass.
- [ ] Production deployment is authorized and observed before claiming the live app works.
- [ ] Hub/image work has a separate handoff; this workspace does not claim those sites delivered.

## Start here

Read [orchestration](todo/orchestration-plan.md), [Scrum policy](todo/redesign-scrum-plan.md) and [Sprint 1](todo/sprint-1-feasibility.md). Implementation is now authorized and follows the earliest eligible sprint. Section 25 is the cross-sprint verification inventory. Sections 23 and 24 remain deferred/excluded.

## Planning delivery

Planning validation and independent review are in planning evidence. The decision trail is decisions.tsv. Planning PR: [#1](https://github.com/ashcx/audio-toolkit-v1/pull/1). This PR is separate from all future implementation sprint PRs.

## 2026-10-31 UI redesign

The user superseded the Sprint19 number-first/duplicated trim presentation with a shared two-handle rail and clock fields, slider-only gain/normalize, on-demand original peak/RMS and a compact image-compressor-style shell. [Redesign plan](todo/ui-redesign.md) and `docs/sprint-evidence/ui-redesign/` record the implementation, audit, tests and final independent review. Ready [PR23](https://github.com/ashcx/audio-toolkit-v1/pull/23) delivers this UI increment. Earlier sprint evidence is historical, not the current UI contract.

GitHub confirmed Sprint20 PR22 merged; the UI refinement branches from that exact source tree. The refinement itself is not merged or deployed.
