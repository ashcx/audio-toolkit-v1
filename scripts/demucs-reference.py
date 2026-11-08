"""Independent numpy reference for htdemucs_fp16.onnx (Demucs v4 hybrid).

Follows upstream demucs: track-level mono mean/std normalization, the model's
_spec/_ispec framing done outside the graph, 25% overlap with triangular
weights, and centered zero padding for the last short chunk.

usage: demucs-reference.py MODEL FIXTURE_DIR OUT_DIR [fixture ...]
"""
import hashlib
import json
import math
import sys
import time
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort

MODEL_BYTES = 85034606
MODEL_SHA256 = "742a4f8594a48d6306da303b8b2dd8be2b54389b88557db034408b436effd775"
EXPECTED_META = {
    "sources": '["drums", "bass", "other", "vocals"]', "sample_rate": "44100", "audio_channels": "2",
    "segment_samples": "343980", "stft_n_fft": "4096", "stft_hop_length": "1024", "stft_win_length": "4096",
    "stft_normalized": "true", "stft_window": "hann", "external_normalization": "true",
    "stft_pad_samples": "1536", "stft_frame_trim": "2",
}
N_FFT, HOP, SEGMENT, PAD, TRIM, OVERLAP = 4096, 1024, 343980, 1536, 2, 0.25
FRAMES = math.ceil(SEGMENT / HOP)
WINDOW = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(N_FFT) / N_FFT)


def stft(x: np.ndarray) -> np.ndarray:
    """(C, SEGMENT) -> complex (C, N_FFT/2, FRAMES), HTDemucs._spec."""
    padded = np.pad(x, ((0, 0), (PAD, PAD + FRAMES * HOP - x.shape[1])), mode="reflect")
    centered = np.pad(padded, ((0, 0), (N_FFT // 2, N_FFT // 2)), mode="reflect")
    count = 1 + (centered.shape[1] - N_FFT) // HOP
    index = np.arange(count)[:, None] * HOP + np.arange(N_FFT)[None, :]
    spectrum = np.fft.rfft(centered[:, index] * WINDOW, axis=-1) / math.sqrt(N_FFT)
    return spectrum[:, TRIM:TRIM + FRAMES, :N_FFT // 2].transpose(0, 2, 1)


def istft(z: np.ndarray, length: int) -> np.ndarray:
    """complex (..., N_FFT/2, FRAMES) -> (..., length), HTDemucs._ispec."""
    lead = z.shape[:-2]
    full = np.zeros(lead + (N_FFT // 2 + 1, FRAMES + 2 * TRIM), dtype=np.complex128)
    full[..., :N_FFT // 2, TRIM:TRIM + FRAMES] = z
    frames = np.fft.irfft(full.swapaxes(-1, -2) * math.sqrt(N_FFT), n=N_FFT, axis=-1) * WINDOW
    count = frames.shape[-2]
    total = (count - 1) * HOP + N_FFT
    signal = np.zeros(lead + (total,))
    envelope = np.zeros(total)
    for frame in range(count):
        signal[..., frame * HOP:frame * HOP + N_FFT] += frames[..., frame, :]
        envelope[frame * HOP:frame * HOP + N_FFT] += WINDOW ** 2
    keep = FRAMES * HOP + 2 * PAD
    signal = signal[..., N_FFT // 2:N_FFT // 2 + keep] / envelope[N_FFT // 2:N_FFT // 2 + keep]
    return signal[..., PAD:PAD + length]


def check_model(path: Path) -> dict:
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    assert len(data) == MODEL_BYTES and digest == MODEL_SHA256, f"model bytes {len(data)} sha256 {digest}"
    meta = {p.key: p.value for p in onnx.load_from_string(data).metadata_props}
    for key, value in EXPECTED_META.items():
        assert meta.get(key) == value, f"metadata {key}={meta.get(key)!r}, expected {value!r}"
    assert json.loads(meta["sources"]) == ["drums", "bass", "other", "vocals"]
    assert FRAMES == 336
    return {"bytes": len(data), "sha256": digest, "metadata": meta}


def run_segment(session: ort.InferenceSession, chunk: np.ndarray) -> np.ndarray:
    z = stft(chunk)
    out_real, out_imag, out_wave = session.run(None, {
        "spec_real": z.real[None].astype(np.float32),
        "spec_imag": z.imag[None].astype(np.float32),
        "audio": chunk[None].astype(np.float32),
    })
    assert out_real.shape == (1, 4, 2, N_FFT // 2, FRAMES), out_real.shape
    assert out_wave.shape == (1, 4, 2, SEGMENT), out_wave.shape
    spectral = istft(out_real[0].astype(np.float64) + 1j * out_imag[0].astype(np.float64), SEGMENT)
    return spectral + out_wave[0]


def separate(session: ort.InferenceSession, mix: np.ndarray, normalize: bool = True) -> tuple[np.ndarray, int]:
    channels, length = mix.shape
    reference = mix.mean(0)
    mean, std = (reference.mean(), reference.std(ddof=1)) if normalize else (0.0, 1.0)
    normalized = (mix - mean) / std
    half = SEGMENT // 2
    weight = np.concatenate([np.arange(1, half + 1), np.arange(SEGMENT - half, 0, -1)]).astype(np.float64)
    weight /= weight.max()
    stride = int((1 - OVERLAP) * SEGMENT)
    out = np.zeros((4, channels, length))
    total = np.zeros(length)
    offsets = range(0, length, stride)
    for offset in offsets:
        chunk_length = min(SEGMENT, length - offset)
        start = offset - (SEGMENT - chunk_length) // 2
        window = np.zeros((channels, SEGMENT))
        lo, hi = max(0, start), min(length, start + SEGMENT)
        window[:, lo - start:hi - start] = normalized[:, lo:hi]
        trim = (SEGMENT - chunk_length) // 2
        stems = run_segment(session, window)[..., trim:trim + chunk_length]
        out[..., offset:offset + chunk_length] += weight[:chunk_length] * stems
        total[offset:offset + chunk_length] += weight[:chunk_length]
    return out / total * std + mean, len(offsets)


def snr(reference: np.ndarray, estimate: np.ndarray) -> float:
    noise = np.sum((reference - estimate) ** 2)
    return float("inf") if noise == 0 else float(10 * np.log10(np.sum(reference ** 2) / noise))


def main() -> None:
    model, fixtures, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    model_report = check_model(model)
    session = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
    manifest = json.loads((fixtures / "fixtures.json").read_text())
    names = sys.argv[4:] or list(manifest)
    t = np.arange(SEGMENT) / 44100
    probe = np.stack([np.sin(2 * np.pi * 440 * t), np.sin(2 * np.pi * 1000 * t + 1)])
    interior = slice(N_FFT, SEGMENT - N_FFT)
    report = {"model": model_report, "onnxruntime": ort.__version__, "numpy": np.__version__,
              "stftRoundTripInteriorMaxAbs": float(np.abs(istft(stft(probe), SEGMENT) - probe)[:, interior].max()),
              "inputs": [[i.name, i.shape] for i in session.get_inputs()],
              "outputs": [[o.name, o.shape] for o in session.get_outputs()], "fixtures": {}}
    sources = json.loads(model_report["metadata"]["sources"])
    for name in names:
        frames = manifest[name]["frames"]
        mix = np.fromfile(fixtures / f"{name}.mix.f32", dtype=np.float32).reshape(2, frames).astype(np.float64)
        started = time.perf_counter()
        stems, segments = separate(session, mix)
        residual = mix - stems.sum(0)
        truth = {s: np.fromfile(fixtures / f"{name}.{s}.f32", dtype=np.float32).reshape(2, frames) for s in sources}
        correlation = {
            stem: {s: float(np.corrcoef(stems[i].ravel(), truth[s].ravel())[0, 1]) for s in sources}
            for i, stem in enumerate(sources)
        }
        tail = min(4410, frames)
        report["fixtures"][name] = {
            "frames": frames, "segments": segments, "outputFrames": stems.shape[-1],
            "finite": bool(np.isfinite(stems).all()),
            "sumMaxAbsError": float(np.abs(residual).max()), "sumSnrDb": snr(mix, stems.sum(0)),
            "tailRms": {s: float(np.sqrt(np.mean(stems[i][:, -tail:] ** 2))) for i, s in enumerate(sources)},
            "mixTailRms": float(np.sqrt(np.mean(mix[:, -tail:] ** 2))),
            "correlationWithSynthComponent": correlation,
            "cpuSeconds": round(time.perf_counter() - started, 1),
        }
        for i, s in enumerate(sources):
            stems[i].astype(np.float32).tofile(out / f"{name}.{s}.f32")
        print(name, json.dumps(report["fixtures"][name]["sumSnrDb"]), flush=True)
    (out / "reference.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
