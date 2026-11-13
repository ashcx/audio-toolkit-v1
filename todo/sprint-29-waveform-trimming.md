# Sprint 29. Add waveform playback and individual-track trimming

Status is in implementation. Updated 2026-11-13. On 2026-11-13 the user authorized implementing this sprint, interactive UI/UX testing and one PR. Do not merge or deploy without a separate user instruction.

## Decisions recorded 2026-11-13

These come from the user and supersede conflicting text below. A design mockup (Option B, "Compact player, expands to trim") was reviewed and chosen.

- **Layout (Option B).** Every player row stays compact: play/pause, file name, elapsed/total time, a short bar waveform and a Trim button. Pressing Trim grows only that row into a taller editor with draggable start and end handles that carry time tags, numeric Start and End fields, a Custom range badge and Reset to Trim all. Only one row is edited at a time. Done folds the row back and keeps the range. Handles exist only in edit mode, so a stray tap on a compact row never cuts audio.
- **Start and end lines.** The trim start and trim end are drawn as full-height, high-contrast lines on the waveform (near-white in the dark theme, near-black in the light theme). They stay visible in compact and edit mode. Audio outside the range is dimmed. The lines must be visually distinct from the playhead. Trim lines are 2 px bracket-shaped marks with a small flag at the top, and the playhead is a thinner accent-coloured line with a round head. Colour and shape must differ so the two are never confused, including in both themes and with the played-bar accent underneath.
- **Files that follow Trim all.** Their waveform shows the shared range with the same lines and dimming, read-only until the user drags a handle. Dragging a handle makes that file a Custom range. Trim all stays a separate numeric recipe control. Warn before replacing custom ranges with a newly applied shared range.
- **Scrubbing and playback stay together.** Dragging or touch-dragging the playhead must keep audible playback in step with the pointer. No pause, restart, snap-back or stale position during or after a drag. The playhead follows `audio.currentTime` while playing. While dragging, seeks are coalesced to one per animation frame and the final pointer position is applied exactly on release. A playing file keeps playing after release.
- **Every player gets the waveform.** The original, the before and after preview players and the exported result all use the waveform player. A processed or exported waveform is labelled as that output and is never the source waveform. Peaks for outputs are computed from the output itself.
- **Stem audition is out of scope.** There are no stem rows because the stem-selection sprint was withdrawn. Scenario 29-06 is out of scope for this PR.
- **Renderer.** Canvas, rendered from worker-supplied bounded peaks. The WaveSurfer comparison in scenario 29-01 is recorded as a short written decision, not a prototype.

## Goal

Replace the generic-looking player with a compact, accurate waveform that supports seeking and individual-track trimming without slowing isolation.

## Dependencies and execution order

Sprint 25 playback/source semantics. Source and single-output waveforms can ship independently of Demucs. Stem audition is out of scope because the stem-selection sprint was withdrawn.

Sprint numbers identify scope, not a mandatory numerical execution order. Verify current main and existing PR state before branching.

## Scope

Real peak generation/cache, compact waveform renderer, playback/seek controls, individual trim gestures, explicit custom ranges and synchronized stem audition.

Out of scope is a batch waveform, decorative random bars, a spectrogram editor, retaining full PCM solely for drawing, or unsynchronized independent stem clocks.

## Entry criteria

- [ ] Read this sprint, its dependencies and the current source at a recorded main SHA.
- [ ] Confirm the dependency features work on the actual surface; historical completion labels are not sufficient evidence.
- [ ] Record representative fixtures, current behavior, resource constraints and the baseline checks needed for this sprint.
- [ ] Resolve shared recipe, worker, playback or export contracts with other in-flight work before editing the same files.

## Required behavior and data contracts

The user explicitly confirmed waveform trimming applies only to individual tracks. Batch Trim all remains a separate numeric control if retained. A waveform gesture never edits another file. Show Custom range and Reset to Trim all when overriding a shared range; warn before replacing custom ranges.

## Implementation checklist

Can begin after Sprint 25's playback semantics. Source and single-output waveform work does not depend on Demucs. Separated-stem rows are out of scope because the stem-selection sprint was withdrawn.

### Preserve the user's trim distinction

The user confirmed that waveform trimming applies only to individual tracks. There is no batch waveform. This supersedes the earlier plan to eliminate every individual range editor, but does not restore a second standalone Trim button beside the player.

- [ ] Put trim handles on an individual track's waveform. Keep Trim all as a separate numeric batch recipe control if retained. Never make a track waveform silently change other files.
- [ ] Show the effective range and a Custom range state when a waveform edit overrides the batch default. Provide an explicit Reset to Trim all action. Warn before replacing custom ranges with a newly applied shared range; do not silently resolve precedence.
- [ ] For separated stems, distinguish source trimming before separation from trimming an already separated stem. A stem-only edit should not force all stems through neural inference again. Keep source-clock alignment for playback and identify any export-only range.

### Build the compact waveform player

- [ ] Use the reference's compact bar waveform and aligned rows within the existing equal-pane workspace. Keep filename/stem label, play/pause, duration, seek position, download icon and remove action legible. Retain the existing type and neutral surfaces; use a restrained played/unplayed accent, with sufficient contrast in both themes.
- [ ] Prototype a supplied-peaks WaveSurfer player and a lightweight Canvas player. Compare dependencies, accessibility, seeking/trim behavior and memory on real files. Select one implementation before committing to production; this is a component comparison, not a new workspace layout.
- [ ] Generate bounded min/max peak bins in a worker. Accumulate source peaks lazily, and collect processed/stem peaks during existing PCM processing where possible. Cache peak levels by file/output identity, range and channel layout, not by a display filename alone.
- [ ] Do not retain full decoded PCM merely to draw the bars. Preserve transients during downsampling, handle stereo and silence correctly, and build additional peak resolutions only when zoom requires them. Prioritize visible tracks and pause optional peak work during heavy isolation.
- [ ] Keep playback available while peak generation is pending. Use a clear loading state or simple seek rail, then replace it with real peaks without moving the current playback position. Do not show a fabricated waveform as data.
- [ ] Support click/tap seeking, visible playhead, elapsed/total time, keyboard play/seek and accessible numeric trim fields. Drag handles must retain pointer ownership outside the rail and handle cancellation. Preserve exact sample/time values despite rounded labels.
- [ ] Define seek versus trim gestures so a click does not accidentally cut audio. Verify touch hit targets, zoomed and unzoomed behavior, short files, very long files and variable-bitrate source timing.
- [ ] Keep Original, Processed preview, Exported audio and Previous export identities from Sprint 25. A source waveform must not masquerade as the processed output's waveform. Invalidate stale peaks and URLs after edits, re-exports, file removal and Clear all.
- [ ] For multi-stem audition, use one synchronized transport/shared clock with gain controls for solo/mute. Do not rely on independently starting four HTML audio elements. Keep export stem selection independent from audition mute/solo unless the user explicitly chooses to export a mix.

### Verify cost and correctness

- [ ] Compare original and waveform UI for first-play latency, source peak-generation time, memory, main-thread responsiveness and separation time. Freeze budgets from the baseline before selecting a renderer. Do not accept a prettier UI that reintroduces whole-file memory growth or slows isolation through competing work.
- [ ] Use a known transient fixture to verify peak placement and seek/trim positions against the source sample grid. Check exported cut boundaries and resampled/encoded outputs independently of the display.
- [ ] Verify source, excerpt, completed export and four aligned stems in actual Chrome; test 320 CSS pixels, desktop, both themes, keyboard, pointer cancellation, long batches and unsupported playback. Record physical-device gaps honestly.
- [ ] Run the unit suite/build, capture screenshots and interaction video, obtain Terra/Luna review and deliver one sprint PR. Evidence belongs under `docs/sprint-evidence/sprint-29/`.

## Acceptance scenarios

Check a scenario only when its evidence exists. A passing unit test alone does not establish live behavior or audible quality.

| Scenario | Required observable result | Evidence |
| --- | --- | --- |
| 29-01 | Compare supplied-peaks WaveSurfer and a small Canvas renderer on real files, recording dependency size, memory, responsiveness and accessibility. | `docs/sprint-evidence/sprint-29/scenario-01.md` |
| 29-02 | Check peak position with known impulses/transients, stereo/silence and long recordings. Verify displayed time and exported cut boundaries against actual sample positions. | `docs/sprint-evidence/sprint-29/scenario-02.md` |
| 29-03 | Exercise tap seeking, pointer capture beyond the rail, cancellation, keyboard controls, numeric precision and explicit source/stem-only trim behavior. | `docs/sprint-evidence/sprint-29/scenario-03.md` |
| 29-04 | Check peak cache invalidation after recipe/output/range changes, removal, Clear all and re-export; release stale URLs and worker state. | `docs/sprint-evidence/sprint-29/scenario-04.md` |
| 29-05 | Measure first-play latency and separation time with waveform generation on/off; pause optional peak work during heavy inference. | `docs/sprint-evidence/sprint-29/scenario-05.md` |
| 29-06 | Verify synchronized solo/mute stem audition without changing export selection, mobile320/desktop, both themes, long batches and unsupported playback. | `docs/sprint-evidence/sprint-29/scenario-06.md` |

## Verification and evidence

- [ ] Run focused behavioral checks for the changed contract, then `npm test` and `npm run build`. Run applicable existing browser/static/format checks. Record exact commands, exit status and tested revision.
- [ ] Drive the changed workflow in actual Chrome using the Chrome skill. Save screenshots and an interaction recording for user-facing controls. Distinguish observed browser results from physical-device coverage.
- [ ] Record relevant processing/interaction time, memory, cancellation and cleanup checks. For a speed claim, read the benchmark checklist first, use interleaved matched runs, validate outputs and identify the limiter. No speed claim from unlike output scopes or failed work.
- [ ] Record source provenance, unresolved gaps and decisions under `docs/sprint-evidence/sprint-29/`. Use a coverage table linking every requirement and scenario to its artifact.
- [ ] Obtain independent Terra and Luna review, at most two reviewers. Resolve verified findings and record the exact reviewed revision; missing review remains open.
- [ ] Audit the final diff for unnecessary abstractions, misleading labels, comments/suppressions and unrelated changes.

## Risks and fallback

Generating peaks still needs audio access/decoding. Full-file Web Audio decoding may exceed memory limits. Source, excerpt and exported output peaks must not be confused. Gesture cancellation must not repeat the previous rail-freeze defect.

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
- [Original context and research](demucs-waveform-sprints.md). The checklist in this individual file is authoritative for Sprint 29.
