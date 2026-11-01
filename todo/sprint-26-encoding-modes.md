# Sprint 26. Expose verified CBR, VBR and supported encoding modes

Status is planned. Updated 2026-10-31. This file authorizes planning only. Do not start app implementation, install or run a candidate model, create an implementation PR, merge or deploy without a separate user instruction.

## Goal

Let users select meaningful bitrate or quality modes without offering options the actual encoder ignores.

## Dependencies and execution order

Sprint 25 Export card. Independent of Sprint 24 DSP, but coordinate recipe-schema changes if both are in flight.

Sprint numbers identify scope, not a mandatory numerical execution order. Verify current main and existing PR state before branching.

## Scope

Actual backend capability audit, mode-dependent export schema, applicable controls, compatibility feedback and encoded-output verification.

Out of scope is changing the separation model, promising faster isolation, changing existing CBR defaults or exposing lossy modes for WAV/FLAC/stream copy.

## Entry criteria

- [ ] Read this sprint, its dependencies and the current source at a recorded main SHA.
- [ ] Confirm the dependency features work on the actual surface; historical completion labels are not sufficient evidence.
- [ ] Record representative fixtures, current behavior, resource constraints and the baseline checks needed for this sprint.
- [ ] Resolve shared recipe, worker, playback or export contracts with other in-flight work before editing the same files.

## Required behavior and data contracts

Use a format/backend capability table as the authority for visible modes. Preserve existing recipes and current CBR behavior. Distinguish target bitrate from quality-based VBR. ABR is included only when a real encoder path supports it.

## Implementation checklist

Depends on Sprint 25's Export card. It can proceed independently of Sprint 24's DSP work, with integration checks if recipe schemas change in both.

- [ ] Audit the pinned MP3 encoder, native AAC, fallback AAC and native Opus paths. Create a capability table for each actual format/backend with supported CBR, VBR, quality-based VBR and ABR modes. Record unsupported or ignored options rather than claiming support from a shared type declaration.
- [ ] Add Encoding mode to Export only for formats with verified alternatives. Use plain labels Constant bitrate (CBR), Variable bitrate (VBR), and Average bitrate (ABR) where actually supported. Explain the tradeoff in one short sentence. Do not add nonfunctional choices to fill out the menu.
- [ ] For CBR, retain the supported bitrate selector. For VBR, expose the encoder's supported target-bitrate or quality control and label its meaning correctly. Do not present a quality preset as a guaranteed bitrate or file size. Add ABR only when the actual encoder supports average-target behavior.
- [ ] Hide bitrate modes for WAV and FLAC. Direct stream copy preserves the source encoding and therefore has no new bitrate mode selection.
- [ ] Preserve current CBR settings for existing recipes and default new encoded exports to the existing behavior until a deliberate default change is agreed. Model mode-dependent settings in the recipe schema so invalid combinations cannot be saved.
- [ ] Check native and fallback encoder capability before processing. If a selected mode is unavailable, explain which supported choice the user can make. Never silently encode CBR while displaying VBR.
- [ ] Verify real output using encoder configuration, bitstream metadata and packet/frame behavior where applicable. Variable packet sizes alone are not proof of VBR for every codec. Test representative silence, speech and music fixtures, duration, decodability, channels, cancellation, output naming and existing gapless metadata behavior.
- [ ] Compare file size and encoding time on the same fixtures. Distinguish encoding time from neural-isolation time; this sprint must not promise faster music isolation.
- [ ] Verify that no-recipe Preview remains hidden even when the output mode changes. The completed export player must play the actual encoded output, allowing the user to hear its compression. The recipe excerpt preview remains a clearly identified processing estimate rather than a final codec-quality preview.
- [ ] Run the full test suite, build and actual Chrome export checks. Record backend/browser gaps, obtain Terra/Luna review and deliver one sprint PR.

Primary entry points are `src/recipe.ts`, `src/recipe-editor.tsx`, `src/pcm/encode.ts`, `src/export-format.ts`, the registered encoder adapters and export checks. Do not implement unsupported modes by merely changing a label.

## Acceptance scenarios

Check a scenario only when its evidence exists. A passing unit test alone does not establish live behavior or audible quality.

| Scenario | Required observable result | Evidence |
| --- | --- | --- |
| 26-01 | Audit and record MP3, native AAC, fallback AAC and Opus capability on each supported tested browser. | `docs/sprint-evidence/sprint-26/scenario-01.md` |
| 26-02 | Check mode-dependent controls and reject unsupported combinations before starting a job. | `docs/sprint-evidence/sprint-26/scenario-02.md` |
| 26-03 | Export silence, speech and music in every advertised mode, checking configuration, appropriate bitstream/frame evidence, decodability, duration and channels. | `docs/sprint-evidence/sprint-26/scenario-03.md` |
| 26-04 | Verify legacy recipe migration and unchanged CBR results, stream-copy behavior and lossless-mode control hiding. | `docs/sprint-evidence/sprint-26/scenario-04.md` |
| 26-05 | Compare file size and encoding time separately from neural-processing time. Verify cancellation, output names and gapless timing. | `docs/sprint-evidence/sprint-26/scenario-05.md` |
| 26-06 | Verify final playback uses the encoded output while the WAV recipe preview remains clearly identified as an excerpt estimate. | `docs/sprint-evidence/sprint-26/scenario-06.md` |

## Verification and evidence

- [ ] Run focused behavioral checks for the changed contract, then `npm test` and `npm run build`. Run applicable existing browser/static/format checks. Record exact commands, exit status and tested revision.
- [ ] Drive the changed workflow in actual Chrome using the Chrome skill. Save screenshots and an interaction recording for user-facing controls. Distinguish observed browser results from physical-device coverage.
- [ ] Record relevant processing/interaction time, memory, cancellation and cleanup checks. For a speed claim, read the benchmark checklist first, use interleaved matched runs, validate outputs and identify the limiter. No speed claim from unlike output scopes or failed work.
- [ ] Record source provenance, unresolved gaps and decisions under `docs/sprint-evidence/sprint-26/`. Use a coverage table linking every requirement and scenario to its artifact.
- [ ] Obtain independent Terra and Luna review, at most two reviewers. Resolve verified findings and record the exact reviewed revision; missing review remains open.
- [ ] Audit the final diff for unnecessary abstractions, misleading labels, comments/suppressions and unrelated changes.

## Risks and fallback

A common library type does not establish backend support. Constant frame size is not universal proof of CBR, nor is variable packet size universal proof of VBR. Native AAC and fallback AAC may differ.

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
- [Original context and research](compact-playback-encoding-sprints.md). The checklist in this individual file is authoritative for Sprint 26.
