# Simplify playback and expose supported encoding modes

The later [waveform plan](sprint-29-waveform-trimming.md) supersedes the permanent removal of all individual range editing below. Sprint 25 removes the competing standalone Trim button; Sprint 29 adds explicit per-track waveform handles and a visible custom-range/reset rule. There is no batch waveform.

Prepared 2026-10-31. Planning only. This adds Sprints 25–26 after Sprints 21–23. Sprint 24 remains the planned loudness, true-peak and compressor work. These UI refinements can run before Sprint 24 because they do not depend on new DSP behavior. No implementation or PR is authorized by this planning request.

## Current behavior and intended result

The inspected main revision is 4d4395a. File rows currently show duration plus a separate trim summary, expose individual trim overrides, always offer Preview for inspected files, and hide exported playback behind Listen. The Download link uses the completed job's exported output URL and name. It does not download the original source. A changed recipe can leave a previous export available, so the new presentation must identify that state explicitly.

The current encoder requests `bitrateMode: "constant"` for bitrate-based formats. The installed Mediabunny declarations expose constant and variable modes. This establishes an available API, not support in every registered encoder. Verify the actual MP3, AAC and Opus paths before offering choices.

## Sprint 25. Compact the workspace and clarify playback

The detailed authoritative sprint file is [sprint-25-compact-playback.md](sprint-25-compact-playback.md). It contains scope, entry criteria, task checklists, acceptance scenarios, evidence and PR delivery requirements.

## Sprint 26. Expose verified CBR, VBR and supported encoding modes

The detailed authoritative sprint file is [sprint-26-encoding-modes.md](sprint-26-encoding-modes.md). It contains scope, entry criteria, task checklists, acceptance scenarios, evidence and PR delivery requirements.

## Delivery and assumptions

Use one working branch and one PR per sprint. Start from current main and retain unrelated local changes. Do not merge or deploy without authorization. If a PR depends on an unmerged parent, target that parent and retarget to main after the parent lands, before merging the child. This prevents a repeat of the earlier preview merge-order confusion.

Evidence belongs under `docs/sprint-evidence/sprint-25/` and `docs/sprint-evidence/sprint-26/`. Record implementation, checks, independent review and remaining limitations. This plan adopts Clear all as clearing files and results while retaining recipe/preferences, and treats a matching export as one made with the current recipe and output settings. Those are product assumptions, not claims about existing behavior.
