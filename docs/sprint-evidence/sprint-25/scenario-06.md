# Scenario 25-06. Status, actions and narrow widths

The Export footer placed status on the left and `Clear all`, `Save to device`, `Export` on the right in that order. It reported `2/2 done` and the note "Clear all removes unsaved exports. Saved downloads stay on your device." Long text wrapped inside the status area.

At 390 px the status stacked above the action group. At 320 px the actions wrapped in the same order and the document did not overflow horizontally. Light and dark themes both rendered, including 390 dark and 320 light captures.

Clear all moved focus to the file picker. A 120-character unbroken token injected into the status area wrapped inside 320 px rather than widening the document. The same check ran the previous-export player and confirmed its accessible name said `Play previous export tone.wav`.

Evidence: `captures/07-error-320-light.png`, `captures/07-error-320-dark.png`, `captures/07b-long-token-320-dark.png`, `captures/08-export-320-dark.png`, `captures/02-intake-390.png`, `captures/02c-intake-390-dark.png`, `result.json` (`actions`).
