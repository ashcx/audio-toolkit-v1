# Sprint 9 independent review, partial

Intent: deliver a browser-local, bounded voice/music recipe stage that preserves batch, source-time, lifecycle and privacy guarantees.

Scope: main e9aef30 and current uncommitted Sprint 9 changes, including new inference and PCM source, tests, vendor provenance, planning and evidence. Parent controlled build/browser operations; no browser or build was run in this review. This is a partial review, not a final Done verdict.

Verified findings: none from this pass. This is not a claim that untested paths pass.

Checks: `node --test tests/*.test.mjs` passed 38/38. Read the changed batch, planner, PCM worker, replay/checkpoint and process-audio integration, inference client/runner/worker and isolation/window implementation, deterministic tests, architecture, coverage, story evidence and relevant requirements and Sprint 4/5/6/8 contracts. Examined current desktop Chromium and mobile dark WebKit screenshots. Inspected scoped changes and new source for comments and lint/TypeScript suppressions; no new application comments or suppression claims were found, so there were no deletions, holds or encoding offers. No implementation files changed.

Dropped hypothesis: external normalization centers the source but does not add the mean to the voice output. Extracting `_e` from the pinned vendor bundle with `node -e "const s=require('fs').readFileSync('vendor/neural/neural.js','utf8');let i=s.indexOf('function _e(');console.log(s.slice(i,i+550))"` shows its separate output scaling multiplies by deviation without adding the mean. Thus this is consistent with the pinned upstream behavior and is not a verified defect.

Outstanding factual gates: lawful music and live/event listening, physical GPU execution, inherited actual-product regression checks, current WebKit output discrepancy, and final source/evidence refresh. Physical devices are separately deferred to Sprint 12 by the user. Do not infer acceptance or audible quality from synthetic reconstruction and unit tests. The current screenshots are historical and do not independently establish interaction, keyboard, touch, recovery or final implementation behavior.

Limits: no independent browser or hardware execution in this pass; did not reproduce the WebKit difference, determine its cause, assess audible separation or verify final deployment. Source and evidence may continue to change under the parent. The no-comments lens was performed as part of this independent reviewer under the parent instruction; no separate comment-sicko worker was dispatched and no implementation fixes were authorized.
