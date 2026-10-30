# UI redesign requested2026-10-31

## Goal

Replace the crowded recipe interface with a polished workspace matching the image-compressor reference. Use readable clock times, one two-handle trim rail, slider-only gain/normalize, on-demand source peak/average, fewer visible actions and consistent spacing.

## Plan and contracts

- [x] Frame and interrogate current UI. Two independent read-only Terra/Luna reviewers; main reproduces findings in Chrome. Source baseline4ea3ef0.
- [x] Capture baseline and actual image-compressor reference. Trim expanded381CSSpx, two rails plus two numeric fields, five row buttons, raw-second summaries. Baseline trim input count0 was captured after the card collapsed; it is not evidence of missing inputs.
- [x] Implement the authorized redesign separately from the read-only audit.
- [x] Verify actual Chrome desktop/mobile, light/dark, both trim handles, clock fields, keyboard/menu/drag, on-demand levels and cancellation/stale-file recovery, actual exports.
- [x] Independent Terra/Luna final review; fix proven findings and rerun affected checks.
- [ ] Submit one reviewable PR with captures and exact limitations.

## Design

Reference-driven quiet application chrome. Light colors background#f5f6f7, surface#fff, text#22262b, line#e5e7eb, accent#34785e. Dark colors follow image-compressor charcoal#121316/#1d1f24 with muted borders and mint accents. System sans/Inter,14px body,16px section headers, tabular numeric values. Spacing scale4/8/12/16/24px. A wider files area and compact400px recipe sidebar share a consistent top line; stack at800px. Large empty intake shrinks to an add-files strip when populated. Expanded settings use one padded block, quiet dividers and no stacked-card decoration. One primary Export action; row secondary actions live behind More.

The shared trim rail overlays two native range inputs for keyboard/native semantics, with separate Start/End clock values. Clock fields replace raw seconds; source-time numeric values remain authoritative and parsing accepts m:ss/h:mm:ss with optional fractions. Valid source precision survives unless edited. Invalid/short-file ranges keep adjustable repair handles and explicit validation. No waveform or decode required.

Level metrics run in a cancellable worker only when Gain/Normalize opens. Measure complete ORIGINAL selected audio, explicitly labelled Original audio, not processed recipe output or LUFS. Peak is max absolute sample; average is sample-weighted RMS, both dBFS. Existing bounded decoder is reused, no whole-recording PCM buffer or model inference. Cache only successful immutable File measurements; abort on close/remove/file changes/export. Silence has a distinct infinity display; unavailable decoding is not shown as0dB. Gain/normalization keep their existing supported ranges and audio semantics, one slider each.

## Throughput checkpoint

Blocking first steps are baseline/audit/data contracts. Implementation is sequential in the main instance. Shared branch/build/browser have one owner; reviewers are read-only with scratch probes. Parameter, trim/menu and layout changes are one code-coupled feature; no implementation fan-out. Separate worker analysis keeps UI work responsive and failure policy testable.

## Verification and review

82normaltests/build/static pass. Actual Mac Chrome verified long-clock fields, both mouse/touch handles, Shift fine keyboard changes, menu pointer/focus/Escape dismissal, grip keyboard/long-press reorder, on-demand tone/silence/unsupported analysis and removal recovery, physical downloads and ZIP. Actual CSS390x844 and320px layouts have no horizontal overflow; physical mobile/screen-reader and full standalone matrix remain unverified. Independent panel corrections included light-theme text contrast and Clear results focus across invalid settings, failed batch cleanup and failed ZIP cleanup. The parent reproduced these in real Chrome, fixed recovery priorities and reran; final narrow independent verdict is clean. Evidence is in `docs/sprint-evidence/ui-redesign/`.
