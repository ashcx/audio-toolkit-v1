"""Dump the first model window's input and output tensors for one fixture.

The browser check compares its own feeds and raw ORT-Web outputs with these,
which separates pipeline differences from runtime kernel differences.

usage: demucs-tensors.py MODEL FIXTURE_DIR FIXTURE OUT_DIR
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


def main() -> None:
    model, fixtures, name, out = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4])
    out.mkdir(parents=True, exist_ok=True)
    reference.check_model(model)
    frames = json.loads((fixtures / "fixtures.json").read_text())[name]["frames"]
    mix = np.fromfile(fixtures / f"{name}.mix.f32", dtype=np.float32).reshape(2, frames).astype(np.float64)
    ref = mix.mean(0)
    normalized = (mix - ref.mean()) / ref.std(ddof=1)
    length = min(reference.SEGMENT, frames)
    start = -((reference.SEGMENT - length) // 2)
    window = np.zeros((2, reference.SEGMENT))
    window[:, -start:-start + length] = normalized[:, :length]
    z = reference.stft(window)
    feeds = {"spec_real": z.real[None].astype(np.float32), "spec_imag": z.imag[None].astype(np.float32),
             "audio": window[None].astype(np.float32)}
    session = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
    outputs = dict(zip([o.name for o in session.get_outputs()], session.run(None, feeds)))
    for key, value in {**feeds, **outputs}.items():
        value.astype(np.float32).tofile(out / f"{name}.{key}.f32")
    (out / f"{name}.json").write_text(json.dumps({key: list(value.shape) for key, value in {**feeds, **outputs}.items()}) + "\n")


if __name__ == "__main__":
    main()
