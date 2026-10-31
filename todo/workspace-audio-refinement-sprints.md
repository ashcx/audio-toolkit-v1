# Balance the workspace and improve audio processing

Prepared 2026-10-31 and revised to four combined sprints at the user's request. Implementation of Sprints 21–23 authorized on 2026-10-31, with a PR after each sprint. No merge or deployment is authorized. Sprint 24 remains planning-only. This request follows the existing Sprints 1–20 and the UI refinement. Historical completion statements remain historical.

## Confirmed requirements

Use equal-width desktop panes, balanced spacing, compact recipe summaries, a visible pencil button for editing, and a separate Export card. Keep the existing visual identity. Show preview times as mm:ss and trim times with at most one decimal place. Rename the export option to Direct stream copy and default to it for videos when eligible.

The user confirmed one loudness slider and one peak slider, and short excerpts for previews. Proposed interpretation is that Loudness mode uses both targets, while Peak mode uses only the peak target. Do not add a second peak slider. Default to -14 LUFS and -0.3 dBTP. Loudness spans -30 to -8 LUFS in 0.5 LUFS steps. Peak spans -6 to 0 dBTP in 0.1 dBTP steps without magnetic snapping.

## Evidence from this pass

- Chrome's production tab displayed Export inside Recipe and an active music-isolation job. The job was left untouched. Trim dragging was not reproduced while controls were locked.
- `src/style.css` defines a flexible left pane and fixed 400px right pane, 24px panel padding, and a 300px upload area.
- `src/pcm/blocks.ts` normalizes sample peaks. It does not implement integrated LUFS measurement or true-peak limiting.
- `src/trim-fields.tsx` uses overlapping native range inputs. Investigate gesture ownership and rerenders, without treating either as the proven cause.
- `src/pcm/isolation-window.ts` uses 485100-frame windows at 44100 Hz with half-window hops. Larger input recordings and larger inference windows are different experiments.
- Sprints 16–17 retained the isolation baseline and explicitly claimed no speed improvement. Reuse their fixtures and records where applicable.

## Run the sprints

Use one working branch and one PR per sprint. Resolve current main and existing PR state before branching. Do not merge or deploy without explicit user permission. Preserve unrelated local changes, including the existing deletion of `todo/sprint-12-unfinished.md`.

Each sprint ends with relevant unit checks, `npm test`, `npm run build`, live Chrome verification, and recorded evidence under `docs/sprint-evidence/sprint-N/`. Use independent Terra and Luna interrogate review, at most two reviewers. Interaction changes get screenshots and a short interaction recording for user review. Record unverified device and listening checks explicitly. Tests alone do not establish audible quality.

At each checkpoint, record time spent, remaining scope, blockers and the next verifiable result. Reassess scope before adding another feature. Do not promise sprint durations before the DSP prototypes establish effort.

## Sprint 21. Improve music-isolation speed with quality checks

Depends on the current source baseline. The user reports that current SCNet-S output has significant, distracting audible artifacts. Treat this as a user-reported quality defect, not an independently reproduced finding. The user confirmed speed remains the first priority because the current model is already slow. Measure artifacts as a quality guardrail alongside runtime and memory. No quality improvement or speedup is promised.

- [ ] Reproduce the reported artifacts on a representative affected excerpt. Preserve the source, exact recipe, model hash, backend and exported output. Describe the audible defect and its time positions. Use a lawful local fixture and keep private media local.
- [ ] Compare the source, isolated voice, residual music and decoded export to distinguish model leakage or musical artifacts from window seams, quantization, backend differences, reconstruction or encoding defects. These are hypotheses until checked.
- [ ] Compare the current compact model with a supported higher-precision version of the same model where available. If model quality remains inadequate, evaluate a higher-quality separation model before spending the sprint solely on speed tuning. Verify licensing, browser compatibility and memory requirements before adopting a candidate.
- [ ] Use matched excerpts and anonymized listening comparisons. Record vocal leakage, metallic or watery sounds, transient damage, pumping and seam artifacts. Include the user's acceptance of the distracting passages. Objective metrics supplement listening and require suitable reference stems.
- [ ] Compare the user-confirmed 55% window overlap against the existing 50% overlap. Keep isolation strength unchanged. At a fixed window length, 55% overlap reduces the hop to 45% of the window and increases inference work; measure quality and runtime rather than assuming a speed benefit.
- [ ] Test larger supported processing windows alongside the confirmed 55% window-overlap experiment in this first sprint. Establish the baseline, test each change alone, then their combination so quality and timing changes can be attributed. Do not change the production default until quality results pass review.
- [ ] First benchmark the unchanged path with short excerpts, full songs and long recordings, proposed durations 15 seconds, 3 minutes, 10 minutes and 30 minutes. Stop at resource limits rather than crashing the browser.
- [ ] Separate cold model loading, warm setup, decode, resample, temporary storage, inference, overlap reconstruction and encoding. Record end-to-end seconds, seconds per audio minute, memory, window counts and cancellation delay on the actual Mac.
- [x] Investigate larger model windows separately from longer recordings. Check model shape constraints before varying the current 11-second window. Longer input alone does not establish lower inference cost.
- [ ] Compare supported window sizes, overlap, model-session reuse, buffer reuse and storage passes one variable at a time. Keep backend, precision, fixture, model and output format fixed.
- [ ] Run baseline and candidate interleaved with at least three warm runs plus a separately labelled cold run. Record browser/device/backend, variability and competing workload conditions.
- [ ] Accept a quality candidate only after the distracting passages improve in listening comparisons and reliability checks pass. Report any runtime or memory tradeoff explicitly. Do not adopt a slower default solely for better quality. Record higher-quality but slower candidates as optional future choices. For a performance-only candidate, propose at least 10% lower median end-to-end time beyond observed variation, no more than 10% memory growth and no quality regression.
- [ ] Check both voice and music outputs, seams, duration, objective comparison where references exist, listening, cancellation, cleanup and CPU fallback. Retain the baseline if no candidate passes.

Primary files are `src/pcm/isolation-window.ts`, `src/pcm/isolate.ts`, `src/inference/runner.ts` and the existing isolation scripts. Follow the benchmark-checklist skill before measuring or reporting a speedup.

### Sprint 21 implementation checkpoint

The opt-in experiment is implemented and independently reviewed. Five interleaved warm runs per profile measured a 15.9% lower median for two-window session reuse on the 19.043-second fixture, with identical decoded-export bytes. The 55% overlap variant was 16.3% slower on that fixture and changed output, so its listening tradeoff remains open. Actual 15-second and 22-second model inputs were rejected by the fixed 476-frame model axis. The 92.16-second full song passed both baseline and reuse2 once, with identical WAV output and no remaining temporary files. Live cancellation after a retained window completed cleanup in 12 ms. These are scoped diagnostics, not a production speedup or an audible-artifact fix.

Production defaults remain 11 seconds,50% overlap and fresh workers. The remaining unchecked items retain their acceptance scope. Owned peak memory, WebKit reuse, affected-passage listening, fully cold attribution and the proposed 3/10/30 minute cases are not established. See `docs/sprint-evidence/sprint-21/verification.md` for results and limitations.

## Sprint 22. Refine the existing workspace and fix trim

Depends on Sprint 21. Combine the trim fix, time formatting, spacing, equal-width panes, pencil buttons, separate Export card and video copy defaults in one sprint. Keep separate verification checkpoints inside the sprint.

- [ ] Reproduce the stuck gesture in Chrome using both handles, including small movements and crossing the midpoint. Save before/failure evidence.
- [ ] Trace pointer ownership, overlap, state updates and input identity. Fix the first proven cause.
- [ ] Keep dragging responsive outside the rail until release, with defined cancellation behavior. Verify mouse, trackpad, touch and keyboard where available.
- [ ] Separate display formatting from stored precision. Preview and recipe summaries use mm:ss. Trim fields use at most tenths. Formatting must not silently change the stored cut point.
- [ ] Check short and long files, zero/end boundaries, adjacent handles, per-file overrides and batch locks. Add a behavioral regression check for the reproduced defect.

Primary files are `src/trim-fields.tsx`, `src/trim-control.ts`, `src/format.ts`, `src/style.css` and trim tests. Pass when repeated continuous drags track input without losing the gesture and exported boundaries remain correct.

### Refine the existing layout

- [ ] Keep the current Files-left, Recipe-right arrangement. Use equal-width desktop panes, tighten spacing, and keep the separate Export card directly below Recipe. Do not build competing layouts.
- [ ] Preserve the existing palette and font. Use base #f5f6f7, surface #ffffff, text #22262b, muted #626d7b, accent #34785e and border #e5e7eb. Retain the dark theme equivalents. Use left-aligned content and tabular timing numerals.
- [ ] Start with 16px panel padding and gaps, compact populated upload controls, and 8–12px internal spacing. Preserve comfortable pointer targets, focus visibility and mobile stacking.
- [ ] Add a pencil button labelled Edit [step], plus an expansion indicator. Clicking the summary or pencil opens details. Keep more-actions separate and prevent accidental expansion during reorder or menu actions.

Primary files are `src/main.tsx`, `src/recipe-editor.tsx` and `src/style.css`. Pass when desktop pane widths match within one CSS pixel, no controls clip at 320px, and editing is discoverable without opening the menu.

### Set video export defaults

- [ ] Rename Original audio wherever it means the export mode. Preserve references to original audio used for playback or analysis.
- [ ] Default newly added eligible videos to Direct stream copy without overwriting an explicit user format choice. Define mixed audio/video batch behavior in the prototype before coding.
- [ ] Explain that stream copy preserves the encoded audio. For incompatible effects, codec/container combinations or trim requirements, show the reason and offer an encoded format. Never silently ignore processing steps.
- [ ] Verify video-only, audio-only and mixed batches, saved settings, explicit choices, supported copies and incompatible recipes. Confirm stream identity and timing with existing copy checks.

Primary files are `src/recipe.ts`, `src/planner.ts`, `src/main.tsx`, `src/copy-audio.ts` and `src/recipe-editor.tsx`. Preserve the internal format identifier if a label change is sufficient.

## Sprint 23. Preview processed excerpts before export

Depends on Sprint 22.

- [ ] Add Preview per track before Export. Proposed initial excerpt is 15 seconds from the chosen trim start, clamped to available audio. Prototype an excerpt selector and original/processed comparison.
- [ ] Show preparation progress, play/pause, cancellation and retry. Preview must not trigger a download or mark the full export complete.
- [ ] Reuse recipe order and per-file overrides. Define preview identity from the file, source track, recipe and excerpt bounds. Invalidate stale results after edits.
- [ ] Limit concurrent inference work, release temporary media and cancel on file removal. Avoid duplicate processing where a verified compatible result can be reused.
- [ ] Verify that short excerpts match the corresponding processed full-export region. Context-sensitive isolation and normalization may need surrounding audio or full-file analysis. Explain excerpt estimates and never imply they predict full-file integrated loudness exactly.

Primary files are `src/file-row.tsx`, `src/use-export.ts`, `src/batch.ts`, `src/process-audio.ts` and output storage. Pass when the user can compare an excerpt before export, cancel preparation, change a recipe and never hear a stale preview.

## Sprint 24. Add loudness, peak control and compression

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

## Decisions still open

The user confirmed 55% window overlap. Test the current window at 50% and 55%, then larger supported windows at both overlaps. This separates the overlap effect from the window-size effect.

The nonlinear rail mapping, platform reference values, mixed-batch copy defaults and preview context requirements need prototypes or documentation checks. The current trim root cause, compressor quality, isolation-artifact cause and isolation speed gains remain unproven. These are investigation tasks, not questions the user needs to answer now.

The user superseded the three-layout exploration with the current arrangement. Sequence Work into Verifiable Units now applies to checkpoints within the four combined sprints, rather than requiring a separate sprint for every feature.
