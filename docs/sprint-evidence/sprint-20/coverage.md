# Sprint20 coverage and self-review

Base61c337d, reviewed Sprint19 technical candidate submitted as draft PR21. User resumed18–20 and requested PR per sprint. Main instance implemented sequentially. Physical/assistive/listening/model-rights and standalone-matrix release gaps remain factual observations, independent of optional output delivery. Sprint20 does not change DSP/model/source-time or ZIP implementation.

| Acceptance | Result | Evidence |
|---|---|---|
| US01 optional picker and actual selected-folder writes | VERIFIED user-assisted native selection in Mac Chrome | native-folder.json; captures/native-folder-success.png |
| Successful saved output accuracy | VERIFIED filesystem/ZIP byte comparison |2WAVs,72000frames/stereo48kHz, SHA256 equal ZIP; existing sentinel unchanged |
| Native picker cancellation preserves outputs | VERIFIED actual Chrome | folder.md; initial desktoplight/dark captures |
| Safe names/collisions/failure/partial cleanup/cancellation | VERIFIED boundary tests; real OPFS integration | tests/folder-save.test.mjs; opfs-chrome.json |
| Busy locking/report lifecycle | Automated owner tests and source inspection; actual cancellation/success | originals never released by folder owner; reset report on completed-output source changes |
| US02 ZIP/individual fallback, corrupt file exclusion | VERIFIED actual production Chrome/physical ZIP | zip-download.json; downloads.md |
| Unsupported-browser UI | NOT VERIFIED actual environment | runtime capability gate reviewed; raw-CDP override method unavailable, no override installed |
| US03 mixed intake/edit/reorder/trim/export/delivery | VERIFIED actual Mac Chrome and emulated widths | integrated.md; captures desktop/mobile light/dark; inherited unchanged19 pointer/keyboard evidence |
| Normal checks |76tests/build/static PASS | unit.txt/build.txt/static.txt |
| Physical touch/screen-reader/Safari/Android/full standalone matrix/native exit prompt | NOT VERIFIED | release-acceptance.md and prior records |

Self-review. Folder operation is independent of result ownership and uses one AbortController/session. Picker stays in user activation; stale reports reset on completed-output source changes, without resetting active writes. Chunking is bounded1MiB. Only the current attempt's created partial file is removed; completed saves and original temporary outputs are retained. Retry uses a new batch folder. No handles are persisted. Ordinary destination collisions are protected; an adversarial external writer race remains outside the documented atomicity guarantee because the API has no exclusive file-create primitive.

Tests verify existing data/batch-name/output-name collisions, duplicates/traversal, actual pending-write cancellation, permission/close/write/cleanup errors, per-file continuation, owner overlap/pickercancel/report reset. Real browser OPFS verifies API compatibility and exact chunk bytes; cleanup must finish before probe reports passed. Native folder success is separately user-assisted and parent verified. No physical-device or broad performance claim.

Independent review caught an accidental replacement of release-acceptance.md with architecture text. Parent reproduced diff, restored the full prior document and appended new evidence. A final comparison must retain all original device/listening/deployment gates. Luna's pending-native/absent-coverage notes were true at the earlier snapshot; this matrix and revised folder/download/integrated records reconcile them. Final review disposition belongs in interrogate.md.

Written planning/review/retrospective records are agent-run, no human meetings claimed. Retrospective: keep file-system failure policy testable outside UI, and compare document content before committing multi-file edits. Recovery acceptance remains actual unsupported browsers and physical/assistive matrix. No merge/deploy or full release acceptance.
