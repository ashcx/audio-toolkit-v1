# Sprint 25 owner brief

Worktree: `/private/tmp/audio-sprint25`, branch `codex/sprint-25-playback`, base `4d4395a` (origin/main).
Read `/Users/macbook/Documents/test/audio-toolkit-v1/todo/sprint-25-compact-playback.md` and `.audit/feature-map.md`.
Do not touch the main checkout. `node_modules` is symlinked. Do not install packages. Do not push, create a PR, merge or deploy.

## Data shape

- Delete the per-file trim override path. `snapshotForFile(recipe, entry)` and
  `automaticExport(draft, files)` lose their override parameter. `resolveTrim` stays.
- Add `src/file-summary.ts` with pure helpers used by the UI and tests:
  - `fileMetadata(entry, trim)` returns `{ primary, secondary? }` where a no-op trim
    is duration-only and a changed trim is `kept · start to end`, both mm:ss.
  - `showsPreview(stepCount, hasCurrentExport)` is false for an empty recipe or a
    completed export matching the current recipe.
  - `exportStatus(jobs)` returns `1/1 processing`, `1/1 done`, or a mixed status.
- `FileRow` owns a source object URL (`URL.createObjectURL(entry.file)`), revoked on
  unmount. Render a native `<audio controls preload="none">` after intake, no autoplay,
  labelled Original. If `canPlayType` rejects the source, render a useful explanation
  and no broken player.
- After a completed export render its `<audio>` directly, labelled `Exported audio`
  (or `Exported audio · no re-encoding` for stream copy). When the recipe changed,
  label it `Previous export` and make the download name/label say previous.
- Preview renders only when `showsPreview`. While a preview is ready, replace the
  ordinary original player with the excerpt comparison so the original is not
  duplicated. Preview labels are Original and Processed preview.
- Download is an icon button immediately left of remove, only for a completed export.
  Both playback and download use the same completed job output.
- Only one player plays at a time.

## Workspace and footer

- Keep Files left, Recipe right, equal desktop widths, Export under Recipe.
- Rename Trim to Trim all everywhere (menu, heading, pencil label, summary, validation,
  aria labels). Remove the per-file Trim button and editor. Add the scope sentence
  beside the control and verify end clamping against `resolveTrim`.
- Build one batch trim rule. Invalid per-file ranges stay visible and never export an
  untrimmed file. Record that no persisted override state exists.
- Rebuild `.run-actions` as `.export-footer` with a left `.export-status` and a right
  `.export-actions`. Actions in order: Clear all, Save to device, Export. Save results
  becomes Save to device with ZIP/folder choices beneath it. Move cancel, retry,
  cleanup and progress text into the status area. Long errors wrap. At <= 800 px stack
  status above actions and let actions wrap in the same order.
- Clear all removes files, previews, results and temporary outputs while keeping the
  recipe and export preferences. If work is active, cancel and finish cleanup first.
  If cleanup fails, keep the retry path. Explain that unsaved exports are removed and
  saved downloads stay.

## Verification

- Tests: add `tests/workspace-layout.test.mjs` for the pure helpers. Update recipe,
  preview and export-default tests for the removed override parameter. Keep the full
  suite and build green.
- Browser: run the dev server on 5183 and drive system Chrome. Capture 1440 and 390
  widths in both themes for: intake, empty recipe, recipe added, preview running and
  ready, cancelled preview, exported, edited-after-export, failed export, removed file,
  unsupported source, long filename, long error, keyboard focus, Clear all idle and
  during work. Assert no page errors, no horizontal overflow, one playing element at a
  time, and download bytes match the completed output.
- Update `scripts/format-check.mjs` for the new Download accessible name, Save to device,
  and status text. Update any other script that names the old controls.
- Save captures under `docs/sprint-evidence/sprint-25/captures/` in the worktree.
- Commit in small ordered commits. Leave `git status --short` empty. Report commands,
  results, verified vs unverified, and gaps in under 40 lines.
