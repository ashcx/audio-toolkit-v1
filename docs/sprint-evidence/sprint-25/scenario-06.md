# Scenario 25-06. Status, actions and narrow widths

The Export footer placed status on the left and `Clear all`, `Save to device`, `Export` on the right in that order. It reported `2/2 done` and the note "Clear all removes unsaved exports. Saved downloads stay on your device." Long text wrapped inside the status area.

At 390 px the status stacked above the action group. At 320 px the actions wrapped in the same order and the document did not overflow horizontally. Light and dark themes both rendered. The rail, native players and buttons retain focus styles; a separate keyboard-only pass was not run in this sprint.

Evidence: `captures/07-error-320-dark.png`, `captures/08-export-320-dark.png`, `captures/02-intake-390.png`, `result.json` (`actions`).
