"""Report how ill-conditioned each normalization node's input is for one window.

For InstanceNormalization (per channel over the rest) and LayerNormalization
(over the last axis), a large mean^2/variance ratio means a single-pass
E[x^2]-E[x]^2 variance in float32 loses most of its precision.

usage: demucs-norm-conditioning.py MODEL TENSOR_DIR FIXTURE OUT_JSON
"""
import json
import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort

SHAPES = {"spec_real": (1, 2, 2048, 336), "spec_imag": (1, 2, 2048, 336), "audio": (1, 2, 343980)}


def main() -> None:
    model_path, tensors, name, out = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4])
    model = onnx.load(str(model_path))
    nodes = [n for n in model.graph.node if n.op_type in ("InstanceNormalization", "LayerNormalization")]
    feeds = {k: np.fromfile(tensors / f"{name}.{k}.f32", dtype=np.float32).reshape(s) for k, s in SHAPES.items()}
    report = []
    for start in range(0, len(nodes), 12):
        batch = nodes[start:start + 12]
        del model.graph.output[3:]
        model.graph.output.extend(onnx.ValueInfoProto(name=n.input[0]) for n in batch)
        session = ort.InferenceSession(model.SerializeToString(), providers=["CPUExecutionProvider"])
        values = session.run([n.input[0] for n in batch], feeds)
        for node, value in zip(batch, values):
            value = value.astype(np.float64)
            axes = tuple(range(2, value.ndim)) if node.op_type == "InstanceNormalization" else (-1,)
            mean, var = value.mean(axis=axes), value.var(axis=axes)
            ratio = mean ** 2 / np.maximum(var, 1e-30)
            report.append({"node": node.name, "op": node.op_type, "shape": list(value.shape),
                           "maxMeanSquaredOverVariance": float(ratio.max()), "minVariance": float(var.min())})
    report.sort(key=lambda r: -r["maxMeanSquaredOverVariance"])
    out.write_text(json.dumps({"fixture": name, "nodes": report}, indent=2) + "\n")
    for r in report[:8]:
        print(r["op"], r["shape"], f"{r['maxMeanSquaredOverVariance']:.3g}", f"{r['minVariance']:.3g}")


if __name__ == "__main__":
    main()
