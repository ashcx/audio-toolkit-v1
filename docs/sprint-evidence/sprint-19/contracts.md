# Sprint19 contracts and execution plan

User resumed Sprints18–20 on 2026-10-30. Sprint18 implementation47049c9 and draft PR20 remain the dependency. Its independent review passes the tested technical scope. Physical/device/screen-reader, listening/model rights and broader release gaps remain unverified; parameter, ordering and trim UI work does not change those processing/model contracts.

RecipeDraft and stable step IDs remain authoritative. Numeric validation and executed ordering remain unchanged. Pointer gestures have one idle/pressing/dragging session; cancellation never changes order. Keyboard/touch Up/Down remain available and announce resulting position. Native range controls supplement precise numeric fields. Batch timeline uses the longest inspected duration as a labelled reference; per-file timeline uses that file's duration. Unknown duration offers numeric controls only. No waveform claim or decode is introduced.

## Throughput checkpoint

- Blocking first steps. Inspect recipe/file/trim consumers, confirm previous PR/review, freeze these contracts before implementation.
- Independent workstreams. No implementation fan-out, per Scrum policy. Independent Terra/Luna review follows integrated verification.
- Shared mutable state. Main instance owns this branch/build/browser. Reviewers read only and use scratch space.
- Smallest safe decomposition. Parameters, ordering, trim run sequentially with one shared RecipeDraft owner. No processing or dependency changes.

## Planning

Commit S19-US01 and US02 at6 points; US03 remains required3-point stretch. Run real Chrome product journeys, normal tests/build/static audit, self-review and bounded independent review before the sprint PR. Physical touch and screen-reader evidence cannot be inferred from emulation. Retain these acceptance gaps explicitly.
