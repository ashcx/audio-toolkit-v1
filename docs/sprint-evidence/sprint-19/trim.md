# Trim scope

Two inspected WAV fixtures are2s/4s. Batch timeline explicitly says longest file4.000s. Batch handles set0.25 and1.75. Individual2s file precise fields override0.5..1.5. Original source-time schema/resolveTrim and processing are unchanged. Timeline is a bounded range reference, no waveform or audio decode. Unknown durations omit the visual reference and keep precise fields. Numeric invalid values stay visible to validation rather than being silently corrected by the visual reference.

Independent review found that handles could meet and hide the invalid timeline. Both handlers now preserve a positive gap up to1ms, bounded by file duration. Actual Chrome keyboard End on start, then Home on end leaves1.999..2s, both handles available and Export enabled. Numeric fields still permit invalid drafts for explicit validation. See handle-boundary.json.
