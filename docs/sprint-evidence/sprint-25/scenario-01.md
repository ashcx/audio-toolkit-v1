# Scenario 25-01. Intake with no recipe

Chrome loaded `tone.wav` and `tone.mp3` with an empty recipe. Each row showed the filename, `00:02`, and a native original player. No Preview button appeared. No export job, worker decode for export, or background isolation started. The only workers were the existing intake inspection.

Evidence: `captures/01-intake-desktop.png`, `captures/02-intake-390.png`, `result.json` (`metaText`).
