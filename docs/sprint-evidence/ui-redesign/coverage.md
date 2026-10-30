# UI redesign verification

Base4ea3ef0. The user explicitly requested a severe visual/interaction revamp and rigorous interrogate. Initial audit is separate from the main instance's authorized implementation. Read-only Terra/Luna findings are in audit.md; final code review is in interrogate.md. No processing/model/export semantics were replaced.

| Requirement | Actual result and evidence |
|---|---|
| Readable trim/file clocks |619.439s input displays10:19; end542.609 displays9:02.609; precise fields retain distinct submillisecond values in82-test suite |
| Shared two-handle rail | Both mouse endpoints and mobile emulated touch endpoints change actual range; handles.json; manual fields remain clock-formatted |
| Fine keyboard trim | Shift+ArrowLeft9:02.609 to9:02.599; handles.json |
| Short-file invalid range repair | Batch7s on2s input retains handles; Home on per-file start repairs range and removes error; actual Chrome recorded in execution |
| Compact/necessary actions | Three header controls per step, secondary actions hidden in More; Save results groups delivery controls; desktop/mobile captures |
| Keyboard/menu recovery | Arrow grip ordering, announcements/focus, More action move; pointer/focus/Escape dismissal; keyboard.json/menus.json |
| Touch ordering | Actual Chrome touch emulation400ms hold, insertion after Trim and resulting Trim/Gain order; touch-reorder.json |
| On-demand source peak/RMS | Original mono tone peak-12.0dBFS, average-15.1dBFS; gain and normalize expansion both display metrics; real decoder fixture, not a model estimate |
| Analysis cancellation/stale recovery | Close removes readouts; silence shows minus infinity; unsupported6ch reports error with filename and no old values; removing it recovers; analysis-recovery.json. Client abort/late reply/termination also has executed boundary tests |
| Ordered processing/download accuracy | Trim0.25..1.75, Normalize-3 then Gain-6 produce WAVs12000frames8kmono and72000frames48kstereo; measured peak-8.99965dBFS. Actual downloaded files inspected independently in downloads.json |
| ZIP/download actions | Save results/Create ZIP/Download ZIP completes; physical ZIP validated and has exactly the two successful outputs; zip.json |
| Clear results focus | Before fix BODY; after fix invalid recipe Trim settings, valid recipe Export; clear-focus.json |
| Failed storage recovery focus | Actual source App in test-only local Vite page with one OPFS removal failure: Batch Retry cleanup to Export, ZIP Retry ZIP cleanup to Export; cleanup-focus.json/zip-cleanup-focus.json |
| Responsive | Actual CSS390x844 and320px have no horizontal overflow; responsive.json. Existing browser zoom was compensated in viewport settings, verified against innerWidth |
| Small-text contrast | Fixed light muted token#626d7b; minimum4.861 across tested light surfaces; contrast.json |
| Automated |82normaltests pass; production build, static notices/hash audit and all changed browser-driver syntax pass; unit.txt/build.txt/static.txt |

Limits. Current Chrome controls do not expose Target.setAutoAttach, so no direct worker-target lifetime observation is claimed. Actual closure/removal recovery and executable worker-boundary tests support the cancellation contract. Native folder-writing implementation is unchanged from verified Sprint20; this run checks its menu availability/source wiring, not another native permission journey. Standalone Chromium/WebKit drivers were migrated for sliders, clocks, menus and new theme tokens, including fresh-result ZIP failure scenarios, but the full matrix was not rerun under the user's selected Chrome tool. Physical touch, screen reader and other browser/device claims remain unverified. Inherited listening/model-rights/thermal/resource release gates are not waived. No merge/deploy or broad performance claim.

Self-review removed old duplicate CSS/number-input paths, preserved valid source precision and omitted bounds, checked menu/accessibility role differences, and added outside/focus dismissal. Actual failure probes found enabled-action focus gaps and now exercise both cleanup owners. No source comments or type suppressions were added. Written agent audit/review records are not human usability sessions.
