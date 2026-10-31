# Scenario 25-05. Clear all

Chrome ran Clear all from five states: completed export, active 60 s export, active preview on a 60 s file, cleanup-failure recovery, and after removing a previewed file. In each case the file list emptied, the recipe and format preference remained, and the temporary storage directory count returned to 0. Source files on disk and saved downloads are never touched.

A video-only batch auto-selected `Direct stream copy`; Clear all kept that visible choice. An explicit WAV choice also stayed WAV. The clear path freezes the visible export before it clears the files.

For cleanup failure, the check replaced `FileSystemDirectoryHandle.removeEntry` with a one-shot throwing stub, exported a file, and clicked Clear all. The status showed `Temporary files need cleanup.` and `Retry cleanup`. After restoring the method and retrying, the storage count returned to 0.

Focus moved to the file picker after Clear all, not to the document body. `captures/05b-cleanup-retry.png` shows the retry state.

Evidence: `captures/06-cleared.png`, `captures/06b-auto-format-cleared.png`, `captures/05b-cleanup-retry.png`, `result.json` (`status`, `storageAfterClear`), `scripts/sprint-25-check.mjs`.
