# Sprint 28. Select and export four stems or instrumentals

Status is planned. Updated 2026-10-31. This file authorizes planning only. Do not start app implementation, install or run a candidate model, create an implementation PR, merge or deploy without a separate user instruction.

## Goal

Let users extract vocals, drums, bass, other instruments or a combined instrumental without rerunning the separator for each stem.

## Dependencies and execution order

A verified Sprint 27 four-output adapter. Sprint 29 adds synchronized waveform audition; the basic export feature must not depend on that renderer.

Sprint numbers identify scope, not a mandatory numerical execution order. Verify current main and existing PR state before branching.

## Scope

Stem selection, one-pass inference routing, instrumental mixing, result identity, previews, individual/ZIP/folder downloads and bounded result retention.

Out of scope is four separate neural passes, unlabelled source-order assumptions, independently normalizing stems before reconstruction, or silently exporting an audition mix.

## Entry criteria

- [ ] Read this sprint, its dependencies and the current source at a recorded main SHA.
- [ ] Confirm the dependency features work on the actual surface; historical completion labels are not sufficient evidence.
- [ ] Record representative fixtures, current behavior, resource constraints and the baseline checks needed for this sprint.
- [ ] Resolve shared recipe, worker, playback or export contracts with other in-flight work before editing the same files.

## Required behavior and data contracts

Define selectable Vocals, Drums, Bass, Other, Instrumental and All four. Instrumental is Drums + Bass + Other. Associate every output with source file, stem, recipe and range. Muting a player does not change export selection.

## Implementation checklist

Depends on a verified Sprint 27 adapter. Keep the controls compact and speed-oriented.

- [ ] Add selectable Vocals, Drums, Bass, Other and Instrumental outputs, plus a convenient All four choice. Explain Other as the remaining instruments. Define Instrumental as Drums + Bass + Other.
- [ ] Run the four-output network once and route its selected outputs. Selecting one stem does not imply the network can skip computing the others. Avoid four separate inference passes for All four.
- [ ] Read source order from model metadata and verify the adapter's mapping. Names shown in OBRA's UI are not proof of raw tensor order.
- [ ] Sum instrumental stems in floating point on the same timeline. Preserve level relationships; do not normalize each stem independently and then describe their sum as the original accompaniment. Apply final output/peak policy consistently and report clipping or limiting.
- [ ] Distinguish summing predicted instrumental stems from subtracting predicted vocals from the source. Compare and record reconstruction differences; do not silently interchange the two algorithms when naming the result.
- [ ] Preserve source-file and stem identity throughout jobs, preview, export, downloads, ZIP/folder save, cancellation and retry. Use unambiguous names such as `song.vocals.wav` and `song.instrumental.wav`.
- [ ] Keep expensive separated PCM in bounded storage while needed. Save or discard unselected outputs according to the measured resource budget. Re-selecting retained stems should not rerun inference; explain regeneration if an output was deliberately released.
- [ ] Keep original, processed preview and final exported stems distinguishable. Verify downloads contain the selected full stem, not the mixture or excerpt. Processing effects after separation apply to the explicitly selected output, with recipe ordering documented.
- [ ] Check equal source grids, alignment, start/end preservation, finite samples, mono/stereo handling, unsupported files, partial output failures and cleanup. Verify that adding stems does not multiply model loads or unexpected peak memory.
- [ ] Run unit/build and actual Chrome checks with matched single-/multi-output scenarios, review with Terra/Luna and deliver one PR. Save evidence under `docs/sprint-evidence/sprint-28/`.

Solo and mute are audition controls, not additional separation models. Add them when synchronized stem playback is available in Sprint 29, with clearly labelled accessible controls rather than unexplained S/M initials alone.

## Acceptance scenarios

Check a scenario only when its evidence exists. A passing unit test alone does not establish live behavior or audible quality.

| Scenario | Required observable result | Evidence |
| --- | --- | --- |
| 28-01 | Select each single stem, Instrumental and All four and verify the expected files and names. | `docs/sprint-evidence/sprint-28/scenario-01.md` |
| 28-02 | Count completed windows and model loads to prove All four does not run four separator passes. | `docs/sprint-evidence/sprint-28/scenario-02.md` |
| 28-03 | Validate every output’s frame/rate/channel grid, source alignment, finite samples and endings; inspect reconstructed mix separately from quality. | `docs/sprint-evidence/sprint-28/scenario-03.md` |
| 28-04 | Verify instrumental gain relationships and clipping policy, and compare sum-of-instruments with source-minus-vocals as distinct algorithms. | `docs/sprint-evidence/sprint-28/scenario-04.md` |
| 28-05 | Change selections with retained results, remove files, cancel midway, force partial save failure and retry. Check storage/URL cleanup and whether regeneration is clearly explained. | `docs/sprint-evidence/sprint-28/scenario-05.md` |
| 28-06 | Verify full exported stem downloads, per-stem excerpt labels, ZIP/folder delivery and recipe ordering. | `docs/sprint-evidence/sprint-28/scenario-06.md` |

## Verification and evidence

- [ ] Run focused behavioral checks for the changed contract, then `npm test` and `npm run build`. Run applicable existing browser/static/format checks. Record exact commands, exit status and tested revision.
- [ ] Drive the changed workflow in actual Chrome using the Chrome skill. Save screenshots and an interaction recording for user-facing controls. Distinguish observed browser results from physical-device coverage.
- [ ] Record relevant processing/interaction time, memory, cancellation and cleanup checks. For a speed claim, read the benchmark checklist first, use interleaved matched runs, validate outputs and identify the limiter. No speed claim from unlike output scopes or failed work.
- [ ] Record source provenance, unresolved gaps and decisions under `docs/sprint-evidence/sprint-28/`. Use a coverage table linking every requirement and scenario to its artifact.
- [ ] Obtain independent Terra and Luna review, at most two reviewers. Resolve verified findings and record the exact reviewed revision; missing review remains open.
- [ ] Audit the final diff for unnecessary abstractions, misleading labels, comments/suppressions and unrelated changes.

## Risks and fallback

Tensor order may differ from displayed UI order. Four stems increase storage and encoding work even if inference runs once. Summed predicted instruments and original-minus-vocals are distinct results and must not be silently interchanged.

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
- [Original context and research](demucs-waveform-sprints.md). The checklist in this individual file is authoritative for Sprint 28.
