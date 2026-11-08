import { inspectMedia, createFileId } from "../src/media";
import { recipeSchema, newStep, snapshotForFile } from "../src/recipe";
import { compilePlan } from "../src/planner";
import { processAudio } from "../src/process-audio";
import { runDemucs, type DemucsBenchReply, type DemucsBenchRequest, type DemucsBenchTimings } from "./demucs-bench-core";

type Planes = Float32Array<ArrayBuffer>[];
type Candidate = "app" | "demucs-webgpu" | "demucs-wasm";
export type RunSpec = {
  candidate: Candidate;
  overlap?: number;
  retain?: boolean;
  vendored?: boolean;
  failGpu?: "session" | "run";
  cancel?: "fetch" | "session" | "first-window";
};
type Mark = { at: number; event: string };

const base = new URL(import.meta.env.BASE_URL, location.href);
let input: { name: string; planes: Planes } | null = null;
let last: { vocals: Planes; accompaniment: Planes } | null = null;
let retainedWorker: Worker | null = null;
let current: { marks: Mark[]; start: number } | null = null;

async function load(name: string) {
  if (input?.name === name) return input.planes[0].length;
  input = null;
  const manifest = await (await fetch(new URL("bench/inputs.json", base))).json();
  const frames: number = manifest[name].frames;
  const response = await fetch(new URL(`bench/${name}.f32`, base));
  if (!response.ok) throw new Error(`Input HTTP ${response.status}`);
  const data = new Float32Array(await response.arrayBuffer());
  if (data.length !== 2 * frames) throw new Error(`${name} has ${data.length} samples`);
  input = { name, planes: [data.slice(0, frames), data.slice(frames)] };
  return frames;
}

function demucsWorker(request: Omit<DemucsBenchRequest, "planes">, planes: Planes, marks: Mark[], start: number, cancel: RunSpec["cancel"], retain: boolean) {
  const worker = retain && retainedWorker ? retainedWorker : new Worker(new URL("./demucs-bench-worker.ts", import.meta.url), { type: "module", name: "demucs-bench" });
  if (retain) retainedWorker = worker;
  const copy = planes.map(plane => new Float32Array(plane));
  return new Promise<Extract<DemucsBenchReply, { kind: "done" | "error" }> & { receivedAt?: number; worker: Worker }>((resolve, reject) => {
    const stop = (reason: string) => { marks.push({ at: performance.now() - start, event: "stop" }); worker.terminate(); if (retainedWorker === worker) retainedWorker = null; reject(new DOMException(reason, "AbortError")); };
    worker.onmessage = ({ data }: MessageEvent<DemucsBenchReply>) => {
      marks.push({ at: performance.now() - start, event: data.kind === "phase" ? data.phase : data.kind === "progress" ? `window ${data.chunk}/${data.total}` : data.kind });
      if (data.kind === "phase" && cancel === data.phase) stop("Cancelled during " + data.phase);
      else if (data.kind === "progress" && cancel === "first-window" && data.chunk === 2) stop("Cancelled after first window");
      else if (data.kind === "done" || data.kind === "error") {
        if (!retain) worker.terminate();
        resolve({ ...data, receivedAt: performance.timeOrigin + performance.now(), worker });
      }
    };
    worker.onerror = event => { event.preventDefault(); worker.terminate(); reject(new Error(event.message || "Demucs worker failed")); };
    worker.postMessage({ ...request, planes: copy, retain } satisfies DemucsBenchRequest, copy.map(plane => plane.buffer));
  });
}

async function demucs(planes: Planes, provider: "webgpu" | "wasm", spec: RunSpec, marks: Mark[], start: number) {
  const request = { provider, overlap: spec.overlap ?? 0.25, modelUrl: new URL("models/htdemucs_fp16.onnx", base).href, wasmPaths: new URL("vendor/neural/", base).href, failGpu: spec.failGpu, vendored: spec.vendored };
  let attempts = 1, reply = await demucsWorker(request, planes, marks, start, spec.cancel, spec.retain ?? false);
  if (reply.kind === "error" && reply.provider === "webgpu" && reply.stage !== "fetch") {
    marks.push({ at: performance.now() - start, event: `fallback after ${reply.stage}: ${reply.message}` });
    attempts++; reply = await demucsWorker({ ...request, provider: "wasm" }, planes, marks, start, spec.cancel, false);
  }
  if (reply.kind === "error") throw new Error(`${reply.stage}: ${reply.message}`);
  const transferMs = reply.receivedAt! - reply.postedAt;
  return { vocals: reply.vocals, accompaniment: reply.accompaniment, windows: reply.timings.windows, loads: attempts - (reply.timings.reusedSession ? 1 : 0), backends: [reply.provider], attempts, timings: { ...reply.timings, transferMs } as DemucsBenchTimings & { transferMs: number } };
}

function wavFile(planes: Planes, name: string) {
  const frames = planes[0].length, view = new DataView(new ArrayBuffer(44 + frames * 4));
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, 36 + frames * 4, true); text(8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, 44100, true); view.setUint32(28, 44100 * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, frames * 4, true);
  for (let i = 0; i < frames; i++) for (let c = 0; c < 2; c++) view.setInt16(44 + (2 * i + c) * 2, Math.max(-32768, Math.min(32767, Math.round(planes[c][i] * 32767))), true);
  return new File([view.buffer], name, { type: "audio/wav" });
}

/** The shipped app path: processAudio from a 16-bit WAV file through decode, checkpoints, Demucs isolation and WAV encoding (music kept). */
async function app(planes: Planes, marks: Mark[], start: number) {
  const file = wavFile(planes, "input.wav"), signal = new AbortController().signal;
  const inspection = await inspectMedia(file, signal);
  if (inspection.kind !== "ready") throw new Error(inspection.message);
  const recipe = recipeSchema.parse({ version: 1, steps: [{ ...newStep("isolation"), keep: "music" }], export: { format: "wav" } });
  const snapshot = snapshotForFile(recipe, { id: createFileId(), file, inspection });
  if (snapshot.kind !== "ready") throw new Error(snapshot.message);
  const plan = compilePlan(snapshot.snapshot, inspection.metadata);
  if (plan.kind !== "pcm") throw new Error("Not a PCM plan");
  const appStart = performance.now();
  marks.push({ at: appStart - start, event: "processAudio start" });
  const output = await processAudio(file, plan, signal, "music.wav", event => marks.push({ at: performance.now() - start, event: event.kind === "phase" ? event.phase : event.kind }));
  const appMs = performance.now() - appStart, bytes = output.output.file.size;
  await output.output.release();
  return { appMs, bytes, stats: output.stats };
}

async function digest(planes: Planes) {
  const bytes = new Uint8Array(planes.reduce((sum, plane) => sum + plane.byteLength, 0));
  let offset = 0; for (const plane of planes) { bytes.set(new Uint8Array(plane.buffer, plane.byteOffset, plane.byteLength), offset); offset += plane.byteLength; }
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), value => value.toString(16).padStart(2, "0")).join("");
}

function summarize(planes: Planes, frames: number) {
  let energy = 0, finite = true, peak = 0;
  for (const plane of planes) for (const value of plane) { if (!Number.isFinite(value)) finite = false; energy += value * value; peak = Math.max(peak, Math.abs(value)); }
  return { channels: planes.length, frames: planes.map(plane => plane.length), complete: planes.length === 2 && planes.every(plane => plane.length === frames), finite, rms: Math.sqrt(energy / (planes.length * frames)), peak };
}

async function run(spec: RunSpec) {
  if (!input) throw new Error("Load an input first");
  const planes = input.planes, frames = planes[0].length, marks: Mark[] = [], start = performance.now();
  current = { marks, start };
  if (spec.candidate === "app") {
    const result = await app(planes, marks, start), wallMs = result.appMs;
    const expectedBytes = 44 + frames * 4, complete = result.bytes === expectedBytes;
    return { ...spec, input: input.name, frames, audioSeconds: frames / 44100, wallMs, realTimeFactor: frames / 44100 / (wallMs / 1000), windows: result.stats.isolationWindows, loads: result.stats.isolationLoads, backends: result.stats.isolationBackends, attempts: 1, timings: null, marks, stats: result.stats,
      vocals: { complete, finite: true, rms: 1, note: "processAudio keeps music only; vocals not exported" }, accompaniment: { complete, finite: true, rms: 1, wavBytes: result.bytes, expectedBytes, note: "output WAV size checked, samples not decoded" }, vocalsPlusAccompanimentMaxError: null };
  }
  const result = await demucs(planes, spec.candidate === "demucs-webgpu" ? "webgpu" : "wasm", spec, marks, start);
  const wallMs = performance.now() - start;
  last = { vocals: result.vocals, accompaniment: result.accompaniment };
  let mixError = 0;
  for (let channel = 0; channel < 2; channel++) for (let i = 0; i < frames; i++) mixError = Math.max(mixError, Math.abs(result.vocals[channel][i] + result.accompaniment[channel][i] - planes[channel][i]));
  return {
    ...spec, input: input.name, frames, audioSeconds: frames / 44100, wallMs, realTimeFactor: frames / 44100 / (wallMs / 1000),
    windows: result.windows, loads: result.loads, backends: result.backends, attempts: "attempts" in result ? result.attempts : 1,
    timings: "timings" in result ? result.timings : null, marks,
    vocals: { ...summarize(result.vocals, frames), sha256: await digest(result.vocals) },
    accompaniment: { ...summarize(result.accompaniment, frames), sha256: await digest(result.accompaniment) },
    vocalsPlusAccompanimentMaxError: mixError,
  };
}

/** Like run, but reports a rejection with its timing instead of throwing, for cancellation and fallback checks. */
async function attempt(spec: RunSpec) {
  try { return { ok: true, record: await run(spec) }; }
  catch (error) {
    const rejectedAt = current ? performance.now() - current.start : null;
    return { ok: false, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error), rejectedAt, marks: current?.marks ?? [] };
  }
}

/** Unreported profiling run: Demucs on this page's thread so the driver's CPU profiler sees it, with ORT WebGPU kernel profiling on. */
async function profile(provider: "webgpu" | "wasm") {
  if (!input) throw new Error("Load an input first");
  const marks: Mark[] = [], start = performance.now();
  const reply = await new Promise<DemucsBenchReply>(resolve => runDemucs({
    planes: input!.planes.map(plane => new Float32Array(plane)), provider, overlap: 0.25, profile: true,
    modelUrl: new URL("models/htdemucs_fp16.onnx", base).href, wasmPaths: new URL("vendor/neural/", base).href,
  }, message => { marks.push({ at: performance.now() - start, event: message.kind }); if (message.kind === "done" || message.kind === "error") resolve(message); }));
  if (reply.kind !== "done") throw new Error(reply.kind === "error" ? reply.message : "Profile failed");
  return { wallMs: performance.now() - start, timings: reply.timings };
}

function wav(which: "vocals" | "accompaniment") {
  if (!last) throw new Error("No output yet");
  const planes = last[which], frames = planes[0].length, view = new DataView(new ArrayBuffer(44 + frames * 4));
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, 36 + frames * 4, true); text(8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, 44100, true); view.setUint32(28, 44100 * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, frames * 4, true);
  for (let i = 0; i < frames; i++) for (let c = 0; c < 2; c++) view.setInt16(44 + (2 * i + c) * 2, Math.max(-32768, Math.min(32767, Math.round(planes[c][i] * 32767))), true);
  const bytes = new Uint8Array(view.buffer); let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function gpu() {
  const adapter = await navigator.gpu?.requestAdapter().catch(() => null);
  if (!adapter) return null;
  const { vendor, architecture, device, description, isFallbackAdapter } = adapter.info as GPUAdapterInfo & { isFallbackAdapter?: boolean };
  return { vendor, architecture, device, description, isFallbackAdapter: isFallbackAdapter ?? null, timestampQuery: adapter.features.has("timestamp-query") };
}

Object.assign(window, { bench: { load, run, attempt, wav, gpu, profile, release: () => { retainedWorker?.terminate(); retainedWorker = null; last = null; } } });
document.querySelector("#status")!.textContent = "Ready";
