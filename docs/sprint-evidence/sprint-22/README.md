# Sprint 22 verification

2026-10-31. Local development build on Chrome at http://127.0.0.1:5175/audio-toolkit-v1/. Baseline and candidate used the same local two-second tone.wav fixture. Private media was not used.

## Reproduced cause and regression check

Baseline rail rectangle was x=1049.55, y=330.96, width=350.90. Dragging the start thumb at y=353 tracked normally. Dragging the rail from (1110,347) to (1200,347) instead set the start to 0.296 seconds, the initial pointerdown projection, and did not continue to the expected final approximately 0.847 seconds. The end rail behaved the same way. The wrapper handled pointerdown only. The native overlapping inputs ignored pointer events outside their thumbs. This is a rail-start gesture ownership defect rather than component remounting.

The candidate captures the pointer on the rail for both thumb and rail gestures. It tracks subsequent moves, clamps through the existing trim constraints, and ends on release, cancellation or lost capture. Cancellation retains the last valid cut point. Native range elements keep accessible names, values and keyboard behavior.

To rerun through Chrome, choose tests/fixtures/tone.wav, add Trim, and drag within the rail away from either thumb. Continue in one held gesture beyond the midpoint and outside the rail before releasing. Repeat for both ends. Check the actual range input value after the gesture, rather than relying on rounded text labels. Baseline should change only at pointerdown; candidate should follow the final pointer coordinate.

Candidate rail was x=849.55, y=316.97, width=558.90. Start rail drag (910,333) to (1050,333) ended at display 00:00.7. End rail drag (1350,333) to (1260,333) ended at 00:01.5. Start thumb drag to (1190,339) crossed the midpoint to 00:01.2. End drag beyond the rail to (1450,390) reached 00:02. All repeated gestures remained responsive.

Entering 0.123456 into Start retained the exact range input value 0.123456 after blur, focus and another blur, while displaying 00:00.1. ArrowRight then produced exact 1.123456. Display formatting therefore did not quantize the stored point. Existing planner tests cover precise exported trim boundaries.

## Layout and defaults

Files remained left and Recipe remained right. Files width was 591.9966 CSS pixels and Recipe/Export width was 592.0052. Export is a separate card immediately below Recipe and contains the action button. Pencil and summary buttons both toggled the same settings. Dark theme was checked through Settings.

Eligible video.mp4 selected Direct stream copy automatically. Selecting WAV explicitly, then adding tone.wav, retained WAV. A fresh mixed video.mp4/tone.wav batch selected MP3 automatically. Automatic defaults require every file to be inspected and every video plan to support copying. Effects, precise trims and per-file overrides are considered. Explicit format choices remain pinned. No saved recipe/export preference mechanism existed in the baseline; no persistence was introduced.

A 320-pixel viewport request produced a measured 355 CSS-pixel viewport because of the existing browser zoom. No horizontal overflow was present at that measured width. Actual 320 CSS-pixel validation remains pending.

## Checks and remaining validation

npm test passed 85/85 tests. npm run build passed, including type checking and worker import checks. Existing build warnings concern Node 22.11 versus Vite's requested 22.12+ and large chunks. The existing ZIP test requires the ignored .artifacts directory to exist in a fresh checkout; it was created before the successful run.

Physical trackpad, physical touch, cancellation on a physical touch device, actual 320 CSS-pixel viewport and a short interaction recording remain unverified. No independent review has run yet. No merge or deployment occurred.

Images are trim-baseline.png, workspace-desktop.png, workspace-dark.png and workspace-mobile.png.

## Independent review

Terra and Luna independently inspected the scoped diff and each ran `node --experimental-strip-types --test tests/ui-controls.test.mjs tests/export-default.test.mjs`. Both observed nine passing tests and no verified findings. Added-comment and suppression audits found none. Reviewers did not repeat Chrome interactions. The root inspected the implementation and desktop screenshot. The pending device and recording checks above remain open.
