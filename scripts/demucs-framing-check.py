"""Show that the reference framing is the one the model responds to.

Runs one fixture through demucs-reference.py's pipeline with the metadata
framing and with single deliberate deviations, and reports how far the four
stems' sum lands from the mixture and how well the bass stem tracks the
synthesized bass line. A correct framing should score best on both.

usage: demucs-framing-check.py MODEL FIXTURE_DIR FIXTURE OUT_JSON
"""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort

spec = importlib.util.spec_from_file_location("reference", Path(__file__).with_name("demucs-reference.py"))
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)
baseline_stft, baseline_istft = reference.stft, reference.istft
SCALE = np.sqrt(reference.N_FFT)


def shifted_stft(x):
    full = np.pad(x, ((0, 0), (reference.HOP, 0)), mode="reflect")[:, :x.shape[1]]
    return baseline_stft(full)


VARIANTS = {
    "metadata": {},
    "unnormalizedStft": {"stft": lambda x: baseline_stft(x) * SCALE, "istft": lambda z, n: baseline_istft(z / SCALE, n)},
    "realImagSwapped": {"stft": lambda x: baseline_stft(x).imag + 1j * baseline_stft(x).real},
    "framesShiftedOneHop": {"stft": shifted_stft},
    "noTrackNormalization": {"normalize": False},
}


def main() -> None:
    model, fixtures, name, out = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4])
    reference.check_model(model)
    session = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
    frames = json.loads((fixtures / "fixtures.json").read_text())[name]["frames"]
    mix = np.fromfile(fixtures / f"{name}.mix.f32", dtype=np.float32).reshape(2, frames).astype(np.float64)
    bass = np.fromfile(fixtures / f"{name}.bass.f32", dtype=np.float32).reshape(2, frames)
    results = {}
    for variant, change in VARIANTS.items():
        reference.stft = change.get("stft", baseline_stft)
        reference.istft = change.get("istft", baseline_istft)
        stems, _ = reference.separate(session, mix, normalize=change.get("normalize", True))
        results[variant] = {
            "sumSnrDb": reference.snr(mix, stems.sum(0)),
            "bassCorrelation": float(np.corrcoef(stems[1].ravel(), bass.ravel())[0, 1]),
        }
        print(variant, json.dumps(results[variant]), flush=True)
    out.write_text(json.dumps({"fixture": name, "variants": results}, indent=2) + "\n")


if __name__ == "__main__":
    main()
