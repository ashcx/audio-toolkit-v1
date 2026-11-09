"""Deterministic synthetic stereo mixtures for numeric Demucs checks.

Each fixture is planar float32 (channel 0 then channel 1) plus the four
synthesized components, so stem order can be checked by correlation.
These signals test numeric agreement, not separation quality.
"""
import json
import sys
from pathlib import Path

import numpy as np

RATE = 44100
SEGMENT = 343980
FIXTURES = {"long": 1323001, "segment": SEGMENT, "short": 100000, "tiny": 4000}


def components(frames: int, seed: int) -> dict[str, np.ndarray]:
    rng = np.random.default_rng(seed)
    t = np.arange(frames) / RATE
    beat = 0.5
    bass_notes = np.array([55.0, 55.0, 73.42, 65.41])
    note = bass_notes[(t // beat).astype(int) % len(bass_notes)]
    bass_phase = 2 * np.pi * np.cumsum(note) / RATE
    bass = 0.35 * (np.sin(bass_phase) + 0.3 * np.sin(2 * bass_phase))
    bass = np.stack([bass, bass])

    hits = np.zeros(frames)
    for start in range(0, frames, int(beat * RATE / 2)):
        length = min(int(0.08 * RATE), frames - start)
        hits[start:start + length] = np.exp(-np.arange(length) / (0.015 * RATE))
    drums = 0.4 * rng.standard_normal((2, frames)) * hits

    vowel = 220.0 * (1 + 0.02 * np.sin(2 * np.pi * 5 * t))
    phase = 2 * np.pi * np.cumsum(vowel) / RATE
    lead = np.zeros(frames)
    for harmonic in range(1, 25):
        frequency = harmonic * 220.0
        weight = sum(np.exp(-((frequency - formant) / 90.0) ** 2) for formant in (700.0, 1200.0, 2600.0))
        lead += (weight + 0.02) / harmonic * np.sin(harmonic * phase)
    gate = (np.sin(2 * np.pi * 0.25 * t) > -0.3).astype(float)
    lead = 0.3 * lead / max(1e-9, np.abs(lead).max()) * gate
    vocals = np.stack([0.9 * lead, 1.1 * lead])

    chord = sum(np.sin(2 * np.pi * f * t + p) for f, p in ((261.63, 0.0), (329.63, 1.0), (392.0, 2.0)))
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t)
    pad = 0.08 * chord * swell
    other = np.stack([pad, np.roll(pad, 200)])
    return {"drums": drums, "bass": bass, "other": other, "vocals": vocals}


def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for index, (name, frames) in enumerate(FIXTURES.items()):
        parts = components(frames, seed=27 + index)
        mix = sum(parts.values()).astype(np.float32)
        mix.tofile(out / f"{name}.mix.f32")
        for source, signal in parts.items():
            signal.astype(np.float32).tofile(out / f"{name}.{source}.f32")
        manifest[name] = {"frames": frames, "channels": 2, "sampleRate": RATE, "peak": float(np.abs(mix).max())}
    (out / "fixtures.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest))


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else ".artifacts/sprint-27/fixtures"))
