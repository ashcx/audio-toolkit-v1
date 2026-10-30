# Sprint20 delivery contracts and plan

Goal. Save completed outputs to a chosen folder when supported, preserving individual/ZIP downloads and accurate failure recovery. Sprint19 review, implementation1647def and PR21 entry gate were verified; this contract was frozen before implementation.

Boundary Discipline keeps browser capability/picker/permission handling outside the file-copy operation. Saved outputs are immutable Files from completed jobs only. A folder-save session owns one AbortController and discriminated choosing/saving/result state. Starting it locks export/clear/remove/archive mutation until pending writes/abort finish. It never releases temporary outputs or object URLs. Picker is invoked directly from the user gesture, no permission/handle persistence and no server upload.

Choose a fresh UUID-named batch directory inside the granted folder. Never reuse an existing batch directory or silently truncate an existing file. Validate output basenames and reject duplicate/case-folded names before writes. Browser APIs offer no atomic exclusive file creation; the fresh random child and checking destinations before create avoid ordinary collisions, not a guarantee against an adversarial concurrent external filesystem writer. Successful writes commit only on close; cancellation/error aborts and removes only this attempt's created partial file. A cleanup failure reports its exact path and leaves original downloads available. Do not delete prior completed user files or batch folders. Per-file errors continue to later files; cancellation stops new files. Report saved/failed/unattempted counts and location. Retry starts a new batch, preserving prior successful saves.

## Throughput checkpoint

- Blocking first steps. Verify Sprint19 technical review/PR, freeze output naming/write/cleanup contract before implementation.
- Independent workstreams. Main instance sequential delivery implementation, tests, actual Chrome integrated journeys, then Terra/Luna review.
- Shared mutable state. One session owns writes; existing results are locked and retained while busy. Reviewers use scratch only.
- Smallest safe decomposition. Folder operation, hook/UI and integrated fallback checks are one sequential unit; archive behavior remains unchanged.

## Planning

S20-US01/02 committed6 points; integrated US03 required3-point stretch. Unit checks cover cancellation, denied picker, collisions, partial writes/cleanup and duplicate names through filesystem boundary doubles. Actual Chrome must establish real capability/picker/output behavior where browser tools permit. Unsupported browsers are detected at runtime and retain ZIP/individual controls, not inferred from a browser family name. Record physical-device, native picker and screen-reader limitations honestly. No merge/deployment.

Sources inspected. Chrome official File System Access guidance and WHATWG File System Standard were checked for picker user activation, directory handles and writable close/abort semantics. https://developer.chrome.com/docs/capabilities/web-apis/file-system-access and https://fs.spec.whatwg.org/ .
