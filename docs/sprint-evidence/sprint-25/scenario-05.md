# Scenario 25-05. Clear all

Chrome ran Clear all from three states: completed export, active 60 s export, and after removing a previewed file. In each case the file list emptied, the recipe and MP3 format preference remained, and the temporary storage directory count returned to 0. Source files on disk and saved downloads are never touched.

The clear path cancels the preview, archive and folder work, then waits for Batch to become idle before clearing jobs and files. If temporary cleanup fails, the existing cleanup counter and Retry cleanup control remain outside the file list. This run did not simulate that failure; it is recorded as a gap in `verification.md`.

Evidence: `captures/06-cleared.png`, `result.json` (`status`, `storageAfterClear`), `scripts/sprint-25-check.mjs`.
