# Sprint18–20 technical delivery

The user resumed all remaining sprints. Technical implementation and independent Terra/Luna review are delivered, with one draft PR per sprint. No merge/deployment was performed. Broad physical/listening/licensing release acceptance remains open.

- Sprint18 [PR20](https://github.com/ashcx/audio-toolkit-v1/pull/20) compact workspace/direct Export/Settings, reused reviewed implementation47049c9.
- Sprint19 [PR21](https://github.com/ashcx/audio-toolkit-v1/pull/21) sliders/precise inputs, native channel choices, mouse/touch grips, keyboard ordering/announcements and visual trim. Implementation1647def; dependency bookkeeping61c337d.
- Sprint20 [PR22](https://github.com/ashcx/audio-toolkit-v1/pull/22) optional safe folder saving with retained ZIP/individual downloads. Implementation8f8f0f0; latest branch commit records delivery.

Current branch `codex/sprint-20-output-delivery` includes earlier dependencies. Preserve inherited USER changes, deleted `todo/sprint-12-unfinished.md` and untracked root/todo `.DS_Store`. They are excluded from our commits. No new implementation remains queued.

76normal tests, build and static audit pass. Real Chrome exercised mixed inputs, precise recipe/keyboard/mouse/emulated touch, trim grids and ZIP. User selected `.artifacts/s20-folder`; parent verified two native WAVs72000frames/48kHz/stereo, byte-identical to ZIP entries, with existing.txt unchanged. Actual OPFS independently verifies bounded writes/cancel/cleanup. See [Sprint20 coverage](docs/sprint-evidence/sprint-20/coverage.md), [review](docs/sprint-evidence/sprint-20/interrogate.md), [roadmap](TODO.md) and [decision trail](docs/sprint-evidence/decisions.tsv).

The final report-reset UI check completed after user cancellation of the native folder chooser. Parent verified Clear results removed cancellation status and downloads, then a fresh Export produced a new download. No native action remains pending. Controlled tab1960878826 serves preview4184. Native folder/confirm dialogs require manual dismissal when browser control cannot reach them. Keep the saved native test files available.

Remaining acceptance includes actual unsupported-browser UI, physical touch/Safari/Android/screen-reader, full standalone browser reruns, native exit prompt, simultaneous multi-touch, human listening, thermal/peak process memory/CPU comparison and model weight/compiled notice audit. Sprint19/20 broad exit boxes stay open for these facts. Consult owning evidence before closing them.

Use local Node22.23.1 at `.artifacts/tooling/node_modules/node/bin/node`; default Node is unsuitable for Vite. Use codex-chrome for browser control; file URL access is enabled. Preview4184 remains; temporary Vite5184 is stopped at delivery. Private fixtures/saved native test media remain ignored under `.artifacts/`.
