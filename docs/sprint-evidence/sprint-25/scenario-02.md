# Scenario 25-02. Recipe, preview, export and edit

Chrome added Trim all 00:00 to 00:01 and Gain. Preview appeared. The excerpt comparison showed `Original excerpt` and `Processed preview`; the ordinary original player was replaced so the original was not duplicated. Playing Processed paused Original.

After export, the row showed `Exported audio` and a direct player with no `Listen` disclosure. Editing Gain relabelled the retained output `Previous export` and returned Preview. The retained player's accessible name changed to `Play previous export tone.wav`. The stream-copy path on `video.mkv` showed `Exported audio` and `No re-encoding.`

The check also started a preview on a 60 s excerpt and clicked `Cancel preview`. The panel cleared, no temporary output remained, and the recipe stayed intact.

Evidence: `captures/03-preview-desktop.png`, `captures/03b-preview-cancelled.png`, `captures/04-export-desktop.png`, `captures/05-previous-export.png`, `captures/09-stream-copy.png`.
