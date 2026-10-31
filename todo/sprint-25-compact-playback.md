# Sprint 25. Compact the workspace and clarify playback

Status is planned. Updated 2026-10-31. This file authorizes planning only. Do not start app implementation, install or run a candidate model, create an implementation PR, merge or deploy without a separate user instruction.

## Goal

Reduce redundant UI and make it obvious which audio is playing or downloading, while preserving the current balanced workspace.

## Dependencies and execution order

Current main including Sprints 21–23. Can run before Sprint 24. Sprint 29 later adds waveform-only individual trimming.

Sprint numbers identify scope, not a mandatory numerical execution order. Verify current main and existing PR state before branching.

## Scope

Compact file metadata, inline playback, conditional Preview, export action alignment, Clear all, download icons and Trim all presentation.

Out of scope is waveform implementation, model optimization, new encoding modes and LUFS/compressor behavior.

## Entry criteria

- [ ] Read this sprint, its dependencies and the current source at a recorded main SHA.
- [ ] Confirm the dependency features work on the actual surface; historical completion labels are not sufficient evidence.
- [ ] Record representative fixtures, current behavior, resource constraints and the baseline checks needed for this sprint.
- [ ] Resolve shared recipe, worker, playback or export contracts with other in-flight work before editing the same files.

## Required behavior and data contracts

Keep Files left and Recipe right with equal desktop widths. Keep Export beneath Recipe. Clear all removes loaded files, preview/result objects and temporary outputs, but retains recipe/export preferences and never deletes source files or saved downloads. A current export matches both the recipe and output settings.

## Implementation checklist

Keep the current Files-left and Recipe-right arrangement, equal-width panes and separate Export card. Combine the following presentation and playback changes into one sprint with separate verification checkpoints.

### Reduce file-row text and spacing

- [ ] Show only the filename and duration in ordinary file metadata. Example `02:47`. Remove redundant kept-duration, custom-range and processor badges from normal successful rows. Keep actionable errors visible.
- [ ] When Trim all changes the range, show one compact line containing kept duration and source range. Match the requested pattern `02:00 · 00:00 to 02:00`. Do not duplicate the original duration on another line. A no-op full-range trim keeps the ordinary duration-only line.
- [ ] Keep preview times and summaries at mm:ss. Trim input displays retain at most tenths without silently changing stored cut precision.
- [ ] Tighten repeated padding, row gaps and control spacing while preserving readable text, keyboard focus and comfortable touch targets. Do not shrink the entire interface or add a layout exploration phase.

### Align export status and actions

- [ ] Keep progress counts, completion summaries and actionable error text in a left-aligned status area inside Export. Use clear phrases such as `1/1 processing` and `1/1 done`.
- [ ] Put actions in a right-aligned group. Order them Clear all, Save to device, Export. Clear all sits immediately to the left of Save to device when that action is available. Rename Save results to Save to device, including its accessible name.
- [ ] Preserve ZIP and folder-saving choices beneath Save to device, with format-specific action names. Preserve cancellation, retry and cleanup controls when required.
- [ ] Allow long errors to wrap without displacing or overlapping actions. On narrow screens, stack status above the action group and allow the buttons to wrap in the same order.
- [ ] Define Clear all as removing the loaded file list, retained previews and exported results while keeping recipe and export preferences. It never deletes source files or files already saved to the device. If work is active, cancel and finish cleanup before clearing. Keep a retry path if cleanup fails. Explain that unsaved exports will be removed when that is relevant.

### Use one batch trim rule

- [ ] Rename the recipe step Trim to Trim all in the add menu, heading, pencil label, summaries and relevant validation messages.
- [ ] Remove the competing standalone individual Trim button and editor. Resolve any active individual overrides visibly before hiding their editor; do not leave hidden precedence. Remove obsolete callers. Sprint 29 later reintroduces individual editing exclusively through waveform handles with explicit custom-range/reset behavior.
- [ ] State beside the recipe control that the range applies to every file. For example `Applies to all files. Files shorter than the selected start cannot be exported.` Confirm the actual end-clamping behavior against the existing resolver before writing the final help text.
- [ ] Retain per-file warnings for invalid ranges and identify affected files before export. Never silently ignore an invalid trim or export an untrimmed file instead. Preserve the existing fault-isolated batch behavior for valid files.
- [ ] For any supported imported or restored state containing individual overrides, show a clear explanation and require an explicit decision before replacing those ranges with Trim all. If no such state can enter the current app, record that fact and remove the dead override path rather than adding a speculative migration system.

### Make the play bar the normal interaction

- [ ] After intake, show the original audio play bar directly, without autoplay or a Listen disclosure. Prefer native source playback without launching isolation or encoding. For unsupported source playback, show a useful explanation and a supported path rather than a broken player.
- [ ] Show Preview only when at least one recipe step exists and there is no completed export matching the current recipe. Hide it when the recipe is empty or a matching full export exists. Format settings alone do not count as recipe steps.
- [ ] Preserve on-demand excerpt comparison, cancellation and the context-estimate explanation when Preview is used. Avoid duplicating the normal original player unnecessarily in the preview presentation.
- [ ] After successful export, show its play bar directly and remove Listen. Make the active source clear with a short Original, Processed preview, Exported audio or Previous export label as appropriate. These labels explain what is playing; they are not extra file metadata.
- [ ] Keep only one player playing at a time. Retain accessible controls and avoid loading or decoding every full file eagerly just to display its player.
- [ ] Move Download into an icon action immediately to the left of the X remove button. Offer it only when a completed export exists. Use an accessible name and tooltip such as Download exported audio, including the filename where useful.
- [ ] Bind both playback and download to the same completed job output. If the recipe changes, clearly mark that retained result as Previous export and name its download accordingly. Allow Preview again because a current-recipe export is missing. Never silently substitute the original file or a short preview as the full export download.
- [ ] When Direct stream copy is used, explain its result accurately as exported audio with no re-encoding, rather than implying an effect was applied.

### Verify the sprint

- [ ] Drive intake, empty recipe, recipe-added, previewing, cancelled, exported, edited-after-export, failed export and removed-file states in actual Chrome. Check both native-playable audio and video sources and an unsupported playback case.
- [ ] Verify original playback does not start processing, no-recipe rows have no Preview, current exports have no Listen or Preview, and recipe edits never play or download a stale result without a visible Previous export label.
- [ ] Verify the downloaded bytes match the full completed output, not the original source or excerpt. Include a gain/trim fixture whose exported audio is observably different.
- [ ] Verify Trim all against mixed-duration files, invalid starts, clamped ends and any supported override migration entry point. Check exact processing boundaries independently of rounded labels.
- [ ] Verify Clear all during idle, processing, completed output, preview and cleanup failure. Confirm source files and saved downloads remain intact and temporary files/object URLs are released.
- [ ] Check 320 CSS pixels and desktop widths, both themes, keyboard access, long filenames, long errors and stable left-status/right-action alignment. Save screenshots and a short interaction recording.
- [ ] Run relevant unit checks, the full test suite and production build. Obtain independent Terra/Luna review, at most two reviewers, then create one sprint PR. Keep the documented physical-device gaps explicit.

Primary entry points are `src/file-row.tsx`, `src/main.tsx`, `src/recipe-editor.tsx`, `src/recipe.ts`, `src/preview.ts`, `src/use-preview.ts`, `src/style.css`, trim resolution and output lifecycle code. Remove override-only callers and tests in the same change as their feature removal.

## Acceptance scenarios

Check a scenario only when its evidence exists. A passing unit test alone does not establish live behavior or audible quality.

| Scenario | Required observable result | Evidence |
| --- | --- | --- |
| 25-01 | Add a file with no recipe. Show duration and original player, with no Preview and no background isolation. | `docs/sprint-evidence/sprint-25/scenario-01.md` |
| 25-02 | Add a recipe, render an excerpt, cancel it, export, then edit the recipe. Verify the correct player/source labels and Previous export state. | `docs/sprint-evidence/sprint-25/scenario-02.md` |
| 25-03 | Download an altered gain/trim fixture and verify its bytes match the completed full output rather than the original or excerpt. | `docs/sprint-evidence/sprint-25/scenario-03.md` |
| 25-04 | Verify the metadata examples 02:47 and 02:00 · 00:00 to 02:00, including no-op trim and mixed-duration invalid ranges. | `docs/sprint-evidence/sprint-25/scenario-04.md` |
| 25-05 | Check Clear all during processing, preview, completed output and cleanup failure; verify cancellation and retained cleanup retry. | `docs/sprint-evidence/sprint-25/scenario-05.md` |
| 25-06 | Verify left status/right actions on desktop and wrapping at 320 CSS pixels, long errors/filenames, both themes and keyboard focus. | `docs/sprint-evidence/sprint-25/scenario-06.md` |

## Verification and evidence

- [ ] Run focused behavioral checks for the changed contract, then `npm test` and `npm run build`. Run applicable existing browser/static/format checks. Record exact commands, exit status and tested revision.
- [ ] Drive the changed workflow in actual Chrome using the Chrome skill. Save screenshots and an interaction recording for user-facing controls. Distinguish observed browser results from physical-device coverage.
- [ ] Record relevant processing/interaction time, memory, cancellation and cleanup checks. For a speed claim, read the benchmark checklist first, use interleaved matched runs, validate outputs and identify the limiter. No speed claim from unlike output scopes or failed work.
- [ ] Record source provenance, unresolved gaps and decisions under `docs/sprint-evidence/sprint-25/`. Use a coverage table linking every requirement and scenario to its artifact.
- [ ] Obtain independent Terra and Luna review, at most two reviewers. Resolve verified findings and record the exact reviewed revision; missing review remains open.
- [ ] Audit the final diff for unnecessary abstractions, misleading labels, comments/suppressions and unrelated changes.

## Risks and fallback

The later user-confirmed waveform requirement supersedes permanent removal of all individual ranges. Remove the competing standalone Trim button here; Sprint 29 introduces individual waveform handles with an explicit custom-range/reset rule. Do not maintain hidden active overrides after removing their UI.

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
- [Original context and research](compact-playback-encoding-sprints.md). The checklist in this individual file is authoritative for Sprint 25.
