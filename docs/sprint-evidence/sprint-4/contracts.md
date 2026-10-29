# Sprint 4 contracts

`RecipeDraft` contains version 1, ordered stable-ID discriminated steps, and terminal export. Strict Zod parsing rejects unknown fields, duplicate IDs, nonfinite/out-of-range values, duplicate trim/isolation and invalid trim ranges. Gain/normalize/channel/resample repetitions are intentional. Export bitrate fields exist only for applicable formats. Draft invalidity stays editable and blocks snapshot creation.

`Recipe` is validated and deeply frozen. `snapshotForFile` accepts inspected stable-ID entries and optional trim overrides, then returns ready or a file-only failure. Blank start means zero; blank end means source end or unknown. Known duration clamps excessive end; start at/after effective end fails. Shared settings never mutate. Unknown duration remains nullable. Snapshots retain primary source start time and source-time trim bounds; the trim step stays at its configured position. A snapshot is not a planner capability guarantee. Original-copy eligibility is Sprint 5.

Per-file overrides are keyed by FileId, inherit until explicitly customized, reset independently, and clear on file removal or confirmed shared-trim removal. Cancel preserves them. No persisted user media, no migration, no processing or storage lifecycle changes in this increment.
