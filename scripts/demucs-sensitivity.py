"""Measure how much the reference stems move under float32-level disturbances.

Compares the reference against itself run with one ORT thread, with graph
optimizations off, and with the mixture perturbed by relative 1e-7 noise.
This bounds the agreement any other float32 runtime can be expected to reach.

usage: demucs-sensitivity.py MODEL FIXTURE_DIR OUT_JSON fixture [fixture ...]
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


def session(threads: int = 0, optimize: bool = True) -> ort.InferenceSession:
    options = ort.SessionOptions()
    options.intra_op_num_threads = threads
    if not optimize:
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
    return ort.InferenceSession(str(MODEL), options, providers=["CPUExecutionProvider"])


def main() -> None:
    global MODEL
    MODEL, fixtures, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    reference.check_model(MODEL)
    manifest = json.loads((fixtures / "fixtures.json").read_text())
    sources = ["drums", "bass", "other", "vocals"]
    baseline_session, single, unoptimized = session(), session(threads=1), session(optimize=False)
    results = {}
    for name in sys.argv[4:]:
        frames = manifest[name]["frames"]
        mix = np.fromfile(fixtures / f"{name}.mix.f32", dtype=np.float32).reshape(2, frames).astype(np.float64)
        noise = np.random.default_rng(1).standard_normal(mix.shape) * 1e-7 * np.abs(mix).max()
        baseline, _ = reference.separate(baseline_session, mix)
        variants = {
            "oneThread": reference.separate(single, mix)[0],
            "graphOptimizationOff": reference.separate(unoptimized, mix)[0],
            "inputNoise1e-7": reference.separate(baseline_session, mix + noise)[0],
        }
        results[name] = {
            variant: {s: {"maxAbs": float(np.abs(stems[i] - baseline[i]).max()), "snrDb": reference.snr(baseline[i], stems[i])}
                      for i, s in enumerate(sources)}
            for variant, stems in variants.items()
        }
        print(name, json.dumps({v: {s: round(x["snrDb"], 1) for s, x in r.items()} for v, r in results[name].items()}), flush=True)
    out.write_text(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    main()
