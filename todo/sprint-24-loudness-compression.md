# Sprint 24. Add loudness, true-peak control and compression

Status is planned. Updated 2026-10-31. This file authorizes planning only. Do not start app implementation, install or run a candidate model, create an implementation PR, merge or deploy without a separate user instruction.

## Goal

Make speech levels more consistent with LUFS normalization and a true-peak ceiling, while offering a separate optional compressor with understandable controls.

## Dependencies and execution order

Sprint 23 preview and the current main processing pipeline. This sprint does not depend on Sprints 25–29.

Sprint numbers identify scope, not a mandatory numerical execution order. Verify current main and existing PR state before branching.

## Scope

Normalization modes, loudness/peak measurement and enforcement, optional compression, recipe migration and preview/export consistency.

Out of scope is music-model replacement, stem selection, waveform rendering and changing export bitrate modes.

## Entry criteria

- [ ] Read this sprint, its dependencies and the current source at a recorded main SHA.
- [ ] Confirm the dependency features work on the actual surface; historical completion labels are not sufficient evidence.
- [ ] Record representative fixtures, current behavior, resource constraints and the baseline checks needed for this sprint.
- [ ] Resolve shared recipe, worker, playback or export contracts with other in-flight work before editing the same files.

## Required behavior and data contracts

Use one loudness slider and one peak slider. Default to -14 LUFS and -0.3 dBTP. Loudness spans -30 to -8 LUFS in 0.5 LUFS steps; peak spans -6 to 0 dBTP in 0.1 dBTP steps. Loudness mode uses the peak value as a ceiling. Peak mode uses only the peak target. Peak has no magnetic snapping. Preserve existing peak recipes as peak recipes.

## Implementation checklist

Depends on Sprint 23. Combine normalization and compression in one sprint, with independently verified DSP checkpoints. Implement metering and peak control, then compression, then verify the complete ordered chain in preview and export.

### Implement normalization and peak control

- [ ] Model Loudness and Peak as distinct normalization modes. Loudness is the default for new normalization steps. Migrate existing peak recipes without changing their meaning.
- [ ] Add the confirmed loudness and peak sliders. Loudness mode uses the peak value as a ceiling. Peak mode ignores the loudness target and makes that state clear.
- [ ] Prototype the nonlinear loudness rail. LUFS is already logarithmic, so specify a monotonic position mapping rather than taking logarithms of negative values. Preserve all 0.5 LUFS selections and keyboard steps. Add visible reference marks and magnetic attraction near them without trapping the pointer.
- [ ] Verify European broadcast, YouTube, Spotify and TikTok reference values against primary documentation before assigning labels. Distinguish formal delivery standards from playback targets and informal suggestions. Do not invent an official TikTok target if none is documented.
- [ ] Implement gated integrated loudness measurement, true-peak measurement and ceiling enforcement. Define what happens when the ceiling prevents the requested loudness. Show the achieved result and limitation rather than falsely reporting success.
- [ ] Verify against an independent reference with documented tolerances, including silence, very short audio, mono/stereo, transient-heavy audio and intersample peaks. Measure decoded lossy exports as well as pre-encode PCM.
- [ ] Record analysis time, memory, temporary storage and preview latency. Keep long-file processing bounded and cancellable.

Primary files are `src/recipe.ts`, `src/recipe-editor.tsx`, `src/planner.ts`, `src/pcm-worker.ts` and new DSP modules beside `src/pcm/blocks.ts`. This is a DSP sprint, not a rename of Normalize peaks.

### Add the optional compressor

- [ ] Prototype a stream processor and compare speech and music excerpts with bypass. Use the plain description Reduce loud/quiet differences.
- [ ] Start disabled with a simple amount control and a speech-oriented preset. Put threshold, ratio, attack, release and makeup gain under advanced settings only if the prototype earns their place.
- [ ] Show gain reduction while previewing and explain the audible effect in one sentence. Avoid automatic makeup gain hiding the comparison.
- [ ] Preserve stereo image with linked detection. Verify smooth block boundaries, finite output, attack/release behavior, silence, cancellation and bounded state.
- [ ] Recommend compressor before loudness normalization and final peak control. Respect explicit recipe ordering and explain downstream gain risks.
- [ ] Require listening checks for pumping, distortion and speech clarity before calling the sprint accepted.

Primary files are `src/recipe.ts`, `src/recipe-editor.tsx`, `src/pcm-worker.ts` and a compressor module. A compressor is separate from normalization and the final peak limiter.

## Acceptance scenarios

Check a scenario only when its evidence exists. A passing unit test alone does not establish live behavior or audible quality.

| Scenario | Required observable result | Evidence |
| --- | --- | --- |
| 24-01 | Compare independent-reference integrated LUFS and true peak on speech, silence, mono, stereo and transient-heavy fixtures. Freeze numerical tolerances before implementation. | `docs/sprint-evidence/sprint-24/scenario-01.md` |
| 24-02 | Verify both slider limits, all keyboard increments, nonlinear loudness mapping and attraction to reference marks without pointer trapping. | `docs/sprint-evidence/sprint-24/scenario-02.md` |
| 24-03 | Verify legacy recipes preserve peak behavior and defaults apply only to newly created normalization steps. | `docs/sprint-evidence/sprint-24/scenario-03.md` |
| 24-04 | Compare preview with export while clearly marking context-dependent excerpt estimates. | `docs/sprint-evidence/sprint-24/scenario-04.md` |
| 24-05 | Verify compressor bypass, stereo linking, attack/release across block boundaries, cancellation, bounded storage and listening for pumping/distortion. | `docs/sprint-evidence/sprint-24/scenario-05.md` |

## Verification and evidence

- [ ] Run focused behavioral checks for the changed contract, then `npm test` and `npm run build`. Run applicable existing browser/static/format checks. Record exact commands, exit status and tested revision.
- [ ] Drive the changed workflow in actual Chrome using the Chrome skill. Save screenshots and an interaction recording for user-facing controls. Distinguish observed browser results from physical-device coverage.
- [ ] Record relevant processing/interaction time, memory, cancellation and cleanup checks. For a speed claim, read the benchmark checklist first, use interleaved matched runs, validate outputs and identify the limiter. No speed claim from unlike output scopes or failed work.
- [ ] Record source provenance, unresolved gaps and decisions under `docs/sprint-evidence/sprint-24/`. Use a coverage table linking every requirement and scenario to its artifact.
- [ ] Obtain independent Terra and Luna review, at most two reviewers. Resolve verified findings and record the exact reviewed revision; missing review remains open.
- [ ] Audit the final diff for unnecessary abstractions, misleading labels, comments/suppressions and unrelated changes.

## Risks and fallback

A true-peak ceiling and integrated loudness are not sample-peak normalization. Define silence, short clips, unreachable targets and lossy-encoder overshoot explicitly. Do not present excerpt loudness as a guaranteed full-track measurement.

If a requirement fails, retain its unchecked state and the failed evidence. Revert an unsuccessful experimental change rather than describe it as complete. State the working fallback and the exact condition required to resume the blocked part. Do not replace mandatory tests with a generic disclaimer.

## Exit criteria and PR delivery

- [ ] Implementation and acceptance scenarios have linked evidence, with any unverified platform/listening checks named explicitly.
- [ ] Unit/build/live checks and applicable resource checks pass at the final head, with independent review recorded.
- [ ] Deliver one working-branch PR for this sprint. Do not bundle another sprint's feature changes into its review diff.
- [ ] If based on an unmerged parent, target that branch and clearly state the dependency. After the parent merges, retarget the child to main before merging it.
- [ ] Report the PR, observable result, tests, tradeoffs and remaining limits. Do not merge or deploy without separate authorization.

## References

- [Roadmap](../TODO.md).
- [Pending sprint index](README.md).
- [Original context and research](workspace-audio-refinement-sprints.md). The checklist in this individual file is authoritative for Sprint 24.
