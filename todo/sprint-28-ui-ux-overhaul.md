# Sprint 28. Clear wording, quieter status and plain errors

Status is planned. Updated 2026-11-09. This file authorizes planning only. Do not start app implementation, create an implementation PR, merge or deploy without a separate user instruction. It replaces the withdrawn stem-selection sprint.

## Goal

Keep the current design and make the app easier to understand. Users should see plain step names, only the status that helps them, and short errors that say what to do. The app should say almost nothing when an export succeeds.

## Dependencies and execution order

Current main with Sprint 27 merged (Demucs is the only isolation engine). No dependency on Sprint 29. Sprint 29 should start after this sprint so the waveform work uses the new copy and layout.

Sprint numbers identify scope, not a mandatory numerical execution order. Verify current main and existing PR state before branching.

## Scope

Wording, status and error messages, step controls, typography and text hierarchy, empty states, one behavior fix for Opus export, phone layout of the existing panels, the Settings dialog, and an accessibility pass.

Out of scope is a visual redesign. Colors, tokens, card shapes, spacing rhythm and the three-panel layout stay as they are. Also out of scope are new features, new steps, presets or quick-start tiles, stem selection, waveform work, and any change to audio processing numerics.

## Entry criteria

- [ ] Read this sprint and the audit findings below at a recorded main SHA.
- [ ] Confirm the audit still reproduces on that SHA by running the state matrix in the verification section before editing.
- [ ] Record the current text of every user-visible string (the baseline copy inventory) before changing any of it.
- [ ] Resolve overlaps with in-flight work on `src/recipe-editor.tsx`, `src/file-row.tsx` and `src/main.tsx` before editing them.

## Decisions already made by the user

- Keep the names **Voice / music splitter**, **Remove background noise** and **Compressor** for those steps, and call the list **Steps** instead of Recipe.
- Keep loudness and decibel numbers visible. Clean them up for clarity, but do not hide them behind an Advanced section.
- Settings keeps a theme toggle and the Licenses link.
- Keep only the existing Add step control. No presets, shortcuts or quick-start tiles.
- Cleaning up fonts and text hierarchy is allowed.

Labels the user has not decided yet are marked **proposed** below. The copy deck review (first task) puts them in front of the user before they ship.

## Audit findings this sprint fixes

These were observed in real Chrome on the Sprint 27 build, so each is a testable defect, not an opinion.

**Wording.** "Recipe" is the wrong word. Step names are inconsistent: "Voice / music" and "Voice isolation" sound alike but do different things, and "Reduce loud/quiet differences" is a compressor. Model names ("GTCRN", "DeepFilterNet3") and codec phrases ("Direct stream copy", "M4A · AAC") mean nothing to users. MP3 export shows "This LAME path has no verified variable mode."

**Status shown on success.** Each result repeats "Exported audio", a loudness sentence ending "Later steps can change the final level", "Separated with Demucs on the GPU", compressor gain reduction and a bare "Clipped samples." The Export panel keeps "2/2 done", "Clear all removes unsaved exports…" and "Keep this page open. Cancellation waits for cleanup." The voice/music step always shows a paragraph about an 85 MB model, caching and re-checking. Four capability banners can appear, one saying "Some formats need a compatibility component."

**Status during work.** A "Trying GPU" chip shows while the model downloads, and later "GPU + CPU" or "CPU · switched from GPU". Progress reads "Loading isolation tools…", "Analyzing for isolation…", "Processing / encoding…" and "Separating 0 / 4", where 4 is an internal window count.

**Errors.** A failed model download shows the raw text "Failed to fetch". Others are generic ("Audio export failed.", "Isolation failed.", "Unsupported audio codec.") or internal ("Each step needs a unique identity.", "Temporary output is already closed.", "The audio timeline has an unsupported gap or overlap."). A bad trim range shows the same message twice. Cleanup problems appear as "Retry preview cleanup" and "Retry ZIP cleanup". Folder-save errors run to two sentences with paths.

**A real bug.** Choosing Opus for a normal 44.1 kHz file fails with "Opus needs 16, 24 or 48 kHz. Add a sample rate step." The app should resample on its own.

**Steps and controls.** A new Compressor starts bypassed with an unchecked "Enable compressor", so adding it does nothing. Normalize shows five reference marks and a paragraph about "400 ms blocks". A "Peak / Average RMS dBFS" readout repeats in Gain, Normalize and Compressor. Each step row has a title, a chevron, a pencil that duplicates the title, and a menu. The Add step list gives no hint that steps run top to bottom, and an empty Steps panel is just the dropdown.

**Layout.** On a phone, results sit above the steps and the Export button lands at the bottom. The Save to device menu covers the export fields. "Clear results" sits inside the Save menu. Each exported file shows two full players. The Preview button does not say it renders only the first 15 seconds.

**Typography.** Much supporting text is very small and low-contrast, and the hierarchy between headings, labels, values and hints is flat.

**Console.** One 404 appears on page load. The file is unidentified.

## Required behavior and data contracts

**Message rules** (every user-visible string must follow them):

1. Success is quiet. A finished export shows the result, its player and its download. At most one short note appears, and only when something needs attention.
2. One problem gets one message, shown where the user can act on it, and it says what to do next.
3. No internal terms in the interface: GPU, CPU, model, window, codec names beyond the format names in the export menu, cleanup, temporary, stream, identity. Decibel and loudness terms appear only on the controls that use them.
4. Progress says what is happening and how far. Stage names are Preparing, Downloading, Separating, Saving. Counters show percent or MB, never internal units.
5. Technical detail goes to the console. An error report may keep a collapsed "Details" line, but the visible text never shows a raw `Error.message`.

**Copy deck.** A single module (proposed `src/copy.ts`) owns every visible string and error message. Components import from it and contain no inline user-facing text. Error codes map to `{ message, action }` entries.

**Step names.**

| Today | New | Status |
| --- | --- | --- |
| Recipe | Steps | decided |
| Voice / music | Voice / music splitter | decided |
| Voice isolation | Remove background noise | decided |
| Reduce loud/quiet differences | Compressor | decided |
| Trim all | Trim all | unchanged |
| Gain | Volume | proposed |
| Normalize | Match loudness | proposed |
| Channels | Channels | unchanged |
| Sample rate | Sample rate | unchanged |

**Option labels (proposed).** Voice / music splitter keeps "Voice" and "Music" with a one-line hint ("Keeps only the vocals" and "Removes the vocals"). Remove background noise uses "Standard" and "Detailed" with a short hint, and no model names. Export formats: MP3, M4A, WAV, FLAC, Opus (.ogg), and "Keep original (no re-encoding)".

**Status copy.** The voice/music step shows a note only when it helps: the first-use download size before the first run, and a single slow-path warning when no GPU is available ("No graphics acceleration found, so this will be slow, about 1½ minutes per minute of audio."). No device badges at any time. Progress text is one line per file.

**Error catalogue.** Every failure maps to a plain sentence and an action. Examples of the target tone:

| Situation | Message | Action |
| --- | --- | --- |
| Model download fails | Couldn't download the voice/music model. Check your connection and try again. | Retry |
| Unreadable file | This file can't be read. Try another file. | Remove |
| No audio track | This file has no audio. | Remove |
| Unsupported audio | This file's audio format isn't supported. | Remove |
| Trim start after end | Start must be before the end. | (shown once, at the step) |
| Trim past the file | Start is after the end of this file. | |
| Out of storage | Not enough space to finish. Free some space and try again. | Retry |
| Processing failed | Something went wrong with this file. Try again. | Retry |
| Folder save blocked | Couldn't save to that folder. Download the files instead. | Download |

The final wording is part of the copy deck review. Internal-only messages (unique step identity, closed output, timeline gaps) never reach the screen.

**Typography.** One type scale with named roles (page title, panel heading, step title, label, value, hint, small status), a minimum size for readable text, sufficient contrast for hint text in light and dark, and consistent weights. Existing color tokens and layout stay. Hint text is shortened or removed rather than made smaller.

**Behavior fix.** Opus export resamples to a supported rate automatically for any input rate, including 44.1 kHz. The same rule applies to any other format constraint the planner currently reports as an instruction to the user. The resample is silent.

## Implementation checklist

Do the first task, the copy deck, before the others. Group commits by task so each is reviewable alone.

- [ ] **Baseline.** Record the current visible text and the state matrix screenshots. Screenshots and recordings are never committed; they stay under `.artifacts/` or a scratch folder, and results are summarized in the PR body.
- [ ] **Copy deck.** Add the single copy module and the error catalogue. List every string in the baseline with its new text, show the table to the user, and apply it only after approval. Mark which messages are removed outright.
- [ ] **Names and options.** Rename the steps, the list and the options in the recipe editor, the export panel, the planner messages and the summary lines. Keep internal identifiers and saved-recipe keys unchanged.
- [ ] **Errors.** Route all failures through the catalogue. Remove raw `Error.message` display. Show each problem once. Hide cleanup retries unless they fail repeatedly, and then use one plain message.
- [ ] **Status and progress.** Remove the device badges. Replace the phase and window counters with the staged progress from the message rules. Show the first-use download as a progress state, not a standing paragraph. Show the slow-path warning only when it applies.
- [ ] **Result card.** Keep the player, the download button and at most one attention note. Remove the success sentences, the "Exported audio" label and the separate "Clipped samples." line; if clipping or a limited level needs a note, make it one clear sentence. Make the original player unobtrusive without removing it.
- [ ] **Persistent hints.** Remove "2/2 done" except while work is running, remove the standing clear-all and keep-open hints, and show them only when relevant.
- [ ] **Steps.** The Compressor is on when added and its enable checkbox goes away (removing the step disables it). Show one short level line, shared by Volume, Match loudness and Compressor where useful, instead of repeating a three-box readout. Clean up Match loudness: keep the loudness numbers visible, reduce the reference marks to short clear labels, replace the paragraph about measurement blocks with one sentence, and keep the true-peak ceiling visible but visually secondary. Remove the duplicate pencil control.
- [ ] **Add step and empty state.** Keep only the existing Add step menu. Add one line to the empty Steps panel, and a one-line hint that steps run top to bottom. Give each menu entry a short description if the native control allows it, otherwise leave it as is.
- [ ] **Preview.** Label it with its length and replace "Excerpt estimate…" and "WAV comparison" with plain before and after wording.
- [ ] **Settings.** The dialog keeps the theme toggle and the Licenses link. Tidy the text and the focus behavior, and add no new options.
- [ ] **Typography.** Introduce the type scale and apply it across the three panels, results, dialogs and errors. Verify contrast and minimum sizes in light and dark.
- [ ] **Phone layout.** On narrow screens, keep Export reachable without scrolling past the results, stop the Save menu from covering other controls, and move "Clear results" out of the Save menu. Do not change the wide layout.
- [ ] **Opus fix.** Resample automatically and cover it with a test for several source rates.
- [ ] **Console 404.** Find the failing request, fix it or confirm it is harmless and remove it.
- [ ] **Accessibility.** Run an automated axe check, test keyboard-only use and a screen reader, and reduce the live announcements to what a user needs. Check focus order and focus return after dialogs and removals.

## Acceptance scenarios

Check a scenario only when evidence exists. Evidence is recorded in the PR body and the local run notes, not committed to the repo.

| Scenario | Required observable result |
| --- | --- |
| 28-01 | A successful MP3 export of one file with no steps shows only the player and download, with no status sentences, and the Export panel shows no standing hint text. |
| 28-02 | A successful export with Match loudness, Compressor and Voice / music splitter shows at most one attention note per file, and none when nothing needs attention. |
| 28-03 | While the model downloads and separation runs, progress shows Downloading with MB, then Separating with a percent, then Saving. No badge, window counter or GPU word appears. |
| 28-04 | Each failure in the catalogue shows its plain message once, with its action, and never raw browser or engine text. A failed model download shows the retry message. |
| 28-05 | A bad trim range shows one message, at the step, and no duplicate under the file. |
| 28-06 | Opus export of 44.1 kHz, 22.05 kHz and 96 kHz sources succeeds without a sample rate step. |
| 28-07 | Adding a Compressor changes the audio without any second click. |
| 28-08 | No step, option, button or menu shows a banned term from the message rules. A test scans the visible text of every state. |
| 28-09 | On a 390 px phone width, Export is reachable without scrolling past results, the Save menu covers nothing, and no layout overflows. |
| 28-10 | Light and dark themes meet contrast requirements for body and hint text, and the type scale is applied consistently. |
| 28-11 | Axe reports no serious violations. Keyboard-only use reaches every control. Focus returns correctly after removing a file, closing Settings and clearing results. |
| 28-12 | The page loads with no failed requests. |

## Verification and evidence

- [ ] Run `npm test`, `npx tsc --noEmit`, `npm run build` and `npm run verify:static`. Record exit status and the tested revision.
- [ ] Add unit tests for the copy deck and error catalogue: every error code has a message and an action, no message contains a banned term, and no component contains inline user-facing text.
- [ ] Add a scripted Chrome run that drives the state matrix and asserts the visible text: empty, files loaded, each step open, every export format, running with isolation, success, cancelled, each catalogued failure, preview, settings, phone width, dark mode. The script writes screenshots outside git and fails on any banned string.
- [ ] Compare before and after screenshots of each state and confirm the layout, colors and shapes are unchanged except the intended text, type and phone-layout changes.
- [ ] Run the existing end-to-end isolation driver and confirm exports, cancel and retry still work with the new copy.
- [ ] Obtain independent review, at most two reviewers, with one focused on wording and flow. Resolve verified findings and record the reviewed revision.
- [ ] Audit the final diff for inline strings that bypass the copy deck, unrelated changes and anything outside this sprint's scope.

## Risks and fallback

Changing visible text can break tests and drivers that select by text. Update them with the copy, and prefer stable test hooks over text selectors going forward. Automatic resampling for Opus changes output for users who relied on the error. Hiding cleanup retries must not hide a real storage problem, so repeated failure must still surface. Removing success detail also removes some loudness reporting, so keep what a user would need to trust the result in one note when the result differs from what they asked for.

If a requirement fails, retain its unchecked state and the failed evidence. Revert an unsuccessful experimental change rather than describe it as complete.

## Exit criteria and PR delivery

- [ ] Implementation and acceptance scenarios have linked evidence, with any unverified platform or screen reader checks named explicitly.
- [ ] Unit, build and live checks pass at the final head, with independent review recorded.
- [ ] Deliver one working-branch PR for this sprint, targeting main. Do not bundle another sprint's changes.
- [ ] State in the PR which labels were proposed and which the user approved, and list every message that was removed.
- [ ] Report the PR, the observable result, tests, tradeoffs and remaining limits. Do not merge or deploy without separate authorization.

## References

- [Roadmap](../TODO.md).
- [Pending sprint index](README.md).
