"""Expose compute-node outputs of htdemucs_fp16.onnx for runtime bisection.

Writes diagnostic copies of the model, each with a batch of intermediate
outputs added, plus native ORT CPU fingerprints of those outputs on one
dumped window: strided samples and RMS. The browser check computes the same
fingerprints with ORT-Web so the first diverging node can be found.

usage: demucs-node-probe.py MODEL TENSOR_DIR FIXTURE OUT_DIR
"""
import json
import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort

SHAPES = {"spec_real": (1, 2, 2048, 336), "spec_imag": (1, 2, 2048, 336), "audio": (1, 2, 343980)}
OPS = {"Conv", "ConvTranspose", "MatMul", "Gemm", "Softmax", "Erf", "InstanceNormalization", "LayerNormalization",
       "Sigmoid", "Sqrt", "Div", "Pow", "ReduceMean", "Sin", "Cos"}
SAMPLES, BATCH = 4096, 40


def fingerprint(value: np.ndarray) -> dict:
    flat = value.astype(np.float32).ravel()
    index = np.linspace(0, flat.size - 1, min(SAMPLES, flat.size)).astype(np.int64)
    return {"shape": list(value.shape), "rms": float(np.sqrt(np.mean(flat.astype(np.float64) ** 2))),
            "samples": flat[index].tolist()}


def main() -> None:
    model_path, tensors, name, out = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4])
    out.mkdir(parents=True, exist_ok=True)
    model = onnx.load(str(model_path))
    names = [n.output[0] for n in model.graph.node if n.op_type in OPS]
    ops = {n.output[0]: n.op_type for n in model.graph.node}
    feeds = {k: np.fromfile(tensors / f"{name}.{k}.f32", dtype=np.float32).reshape(s) for k, s in SHAPES.items()}
    batches = []
    for number, start in enumerate(range(0, len(names), BATCH)):
        batch = names[start:start + BATCH]
        del model.graph.output[3:]
        model.graph.output.extend(onnx.ValueInfoProto(name=n) for n in batch)
        file = f"diag-{number:02d}.onnx"
        onnx.save(model, str(out / file))
        session = ort.InferenceSession(str(out / file), providers=["CPUExecutionProvider"])
        values = session.run(batch, feeds)
        batches.append({"file": file, "nodes": [{"name": n, "op": ops[n], **fingerprint(v)} for n, v in zip(batch, values)]})
        print(file, len(batch), flush=True)
    (out / f"{name}.nodes.json").write_text(json.dumps({"fixture": name, "batches": batches}) + "\n")


if __name__ == "__main__":
    main()
