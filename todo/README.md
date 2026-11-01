# Media Toolkit audio planning

Recorded 2026-10-29. This directory contains historical delivery records and pending sprint plans. Read each file's status; historical planning statements do not describe the current implementation.

- [TODO roadmap](../TODO.md) sequences the sprints.
- [Orchestration](orchestration-plan.md) owns dependencies and contract freezes.
- [Scrum policy](redesign-scrum-plan.md) defines evidence, reviews and delivery.
- [Feature plan](audio-toolkit-plan.md) preserves complete scope and acceptance.
- [Original brief](original-audio-pipeline-brief.md) preserves the initial discussion and unverified upstream claims.

Feature requirements take precedence over conflicting historical brief details. Start [Sprint 1](sprint-1-feasibility.md) when implementation is authorized. Everything remains unchecked until evidence exists.

## Individual sprint plans

These files are the authoritative execution checklists. The grouped documents retain shared research and historical context.

| Sprint | Outcome | Status |
| --- | --- | --- |
| [24](sprint-24-loudness-compression.md) | Add loudness, true-peak control and compression | Merged, [PR #29](https://github.com/ashcx/audio-toolkit-v1/pull/29) |
| [25](sprint-25-compact-playback.md) | Compact the workspace and clarify playback | Merged, [PR #28](https://github.com/ashcx/audio-toolkit-v1/pull/28) |
| [26](sprint-26-encoding-modes.md) | Expose verified CBR, VBR and supported encoding modes | Merged, [PR #31](https://github.com/ashcx/audio-toolkit-v1/pull/31), [PR #32](https://github.com/ashcx/audio-toolkit-v1/pull/32) |
| [27](sprint-27-demucs-runtime.md) | Evaluate and optimize browser Demucs v4 | Planned |
| [28](sprint-28-stem-selection.md) | Select and export four stems or instrumentals | Planned |
| [29](sprint-29-waveform-trimming.md) | Add waveform playback and individual-track trimming | Planned |

Sprint 27 may run first for separation speed. Sprint 28 follows 27. Four-stem waveform audition in 29 also requires 28. Sprints 27–29 remain planning-only.
