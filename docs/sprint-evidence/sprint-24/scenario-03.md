# Scenario 03. Recipe migration and new-step defaults

Date: 2026-10-31. Branch: `codex/sprint-24-loudness`.

- `recipeSchema.version` stays `1`.
- `mode: z.enum(["loudness", "peak"]).default("peak")` keeps legacy `{ kind: "normalize", targetDbfs }` steps as peak recipes. `tests/recipe.test.mjs` parses a legacy step and asserts `mode === "peak"` with the same target.
- New normalize steps are `{ mode: "loudness", targetLufs: -14, ceilingDbtp: -0.3 }`.
- Loudness accepts -30 to -8 in 0.5 LUFS steps. Ceiling accepts -6 to 0 in 0.1 dB steps. Peak accepts -60 to 0.
- `superRefine` rejects mixed fields in both directions: loudness with `targetDbfs`, and peak with `targetLufs` or `ceilingDbtp`. It also rejects missing mode-specific fields.
- Compressor steps are `{ enabled, amount, preset }`, default `{ enabled: false, amount: 50, preset: "speech" }`, with amount bounded to 0..100.
- Planner behavior: a disabled or zero-amount compressor is a bypass and can still stream-copy; an enabled compressor changes the signal and reports "Compression requires re-encoding."
- Browser Peak-mode evidence: `captures/02-peak-mode.png`.

Commands: `npm test` (116 tests pass) includes the migration, mixed-field, bounds and planner cases.
