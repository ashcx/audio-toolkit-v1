# Sprint 4 interrogate

Intent: configure ordered serializable recipes and source-time per-file overrides with compact, accessible controls matching the user's minimal-copy instruction. Integrated working snapshot on sprint/4-recipe vs Sprint 3 base 51da1c8. Reviewed source, requirements sections 8/10, all sprint Ready/Done/story rows, frozen contracts, captures, scripts, exact results and decisions. PR delivery follows this technical gate.

Independent reviewer: gpt-6.1-terra, high; read-only checkout and ignored scratch .upstream/review-s4. No implementation delegation or additional panel.

## Reproductions and fixes

1. Set individual start to 3 on a 2-second WAV, then Gain to 13: the file trim warning disappeared. Parent reproduced exact before/after row text. Whole-recipe validation incorrectly gated file feedback. Shared resolveTrim now independently validates the range; whole-recipe snapshots remain blocked when any setting is invalid.
2. Add Gain13, collapse, then add another Gain: both toggles had accessible name Gain settings and no associated error. Parent reproduced count2. Repeated steps now have numbered accessible names; toggles reference summaries and inline errors, with invalid inputs linked to the same message.
3. Add Trim/Gain, focus Move Gain up and press Enter: WebKit activeElement became BODY; Chromium retained a disabled button. Parent reproduced WebKit BODY. The moved card's settings toggle now receives focus in a layout effect, preserving a usable keyboard location.
4. Set individual start3 on 2-second WAV: reviewer found aria-invalid=false and no description despite visible error. Parent confirmed missing associations in source; final browser suite exercises that exact range and validates the association and subsequent recovery. File input and toggle now reference the stable per-file error ID.

Parent extended scripts/recipe-check.mjs for simultaneous failures, repeated-card association/recovery and reorder focus. Also retained stable collapsed aria-controls targets with explicit hidden display styling.

## Checks and verdict

Reviewer independently ran unit4/4, typecheck, build, full recipe, intake and workspace suites. First workspace run overlapped a rebuild and timed out on reload; isolated rerun passed. Final affected reviewer refresh on latest rebuilt code passed in both engines: file input/toggle error association, corrected-range recovery and hidden collapsed panels. No further reproduced defects. Negative-gain typing hypothesis dropped: both engines accepted -6 and summary -6dB.

Parent final sequential checks after final rebuild: unit4/4, full recipe/workspace/intake suites in Chromium/WebKit and git diff --check all exit0. Refreshed recipe-check.json records simultaneousErrors, repeatedStepErrorLabels and reorderFocus true in both engines. The retained large-chunk build warning belongs to the feasibility probe entry; no resource performance claim is made here.

Final technical verdict: VERIFIED after fixes and independent affected refresh plus full parent regression. Actual processing/preview/output and physical-device acceptance remain later scope. No carry-forward, merge or deployment. Final documentation bookkeeping preserves reviewed behavior.

Reviewed implementation committed as6c22ac9. PR #5 https://github.com/ashcx/audio-toolkit-v1/pull/5 open/ready; base51da1c8. No configured remote CI. Final delivery bookkeeping changes docs only.
