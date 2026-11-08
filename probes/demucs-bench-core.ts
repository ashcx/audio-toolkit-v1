import * as vendored from "../vendor/neural/neural.js";
import * as stridedModule from "demucs-neural-stride";
import { DEMUCS_MODEL, demucsHybridSession } from "../src/inference/demucs-session";

type Provider = "webgpu" | "wasm";
export type DemucsBenchRequest = {
  planes: Float32Array<ArrayBuffer>[];
  provider: Provider;
  overlap: number;
  modelUrl: string;
  wasmPaths: string;
  failGpu?: "session" | "run";
  vendored?: boolean;
  retain?: boolean;
  profile?: boolean;
};
export type DemucsBenchTimings = {
  fetchMs: number; sessionMs: number; separateMs: number; inferenceMs: number; adapterMs: number;
  normalizeAndTransformsMs: number; accompanimentMs: number; windows: number; gpuDispatches: number; reusedSession: boolean;
};
export type DemucsBenchReply =
  | { kind: "phase"; phase: "fetch" | "session" | "separate" }
  | { kind: "progress"; chunk: number; total: number }
  | { kind: "done"; vocals: Float32Array<ArrayBuffer>[]; accompaniment: Float32Array<ArrayBuffer>[]; provider: Provider; timings: DemucsBenchTimings; postedAt: number }
  | { kind: "error"; provider: Provider; stage: "fetch" | "session" | "run"; message: string };

type Neural = typeof vendored;
const strided = stridedModule as Neural;
type Post = (message: DemucsBenchReply, transfer?: Transferable[]) => void;
let dispatches = 0;
if (typeof GPUComputePassEncoder !== "undefined") {
  const dispatch = GPUComputePassEncoder.prototype.dispatchWorkgroups;
  GPUComputePassEncoder.prototype.dispatchWorkgroups = function (...args: Parameters<typeof dispatch>) { dispatches++; return dispatch.apply(this, args); };
}
let retained: { provider: Provider; session: Awaited<ReturnType<Neural["load"]>> } | null = null;

async function modelBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), value => value.toString(16).padStart(2, "0")).join("");
  if (bytes.length !== DEMUCS_MODEL.bytes || hash !== DEMUCS_MODEL.sha256) throw new Error("Demucs model bytes or hash mismatch");
  return bytes;
}

export async function runDemucs(data: DemucsBenchRequest, post: Post) {
  const { provider } = data, neural: Neural = data.vendored ? vendored : strided;
  let stage: "fetch" | "session" | "run" = "fetch";
  try {
    const timings: DemucsBenchTimings = { fetchMs: 0, sessionMs: 0, separateMs: 0, inferenceMs: 0, adapterMs: 0, normalizeAndTransformsMs: 0, accompanimentMs: 0, windows: 0, gpuDispatches: 0, reusedSession: false };
    let session = retained?.provider === provider ? retained.session : null;
    timings.reusedSession = session !== null;
    if (!session) {
      retained?.session.free(); retained = null;
      post({ kind: "phase", phase: "fetch" });
      let started = performance.now();
      const bytes = await modelBytes(data.modelUrl);
      timings.fetchMs = performance.now() - started;
      stage = "session"; post({ kind: "phase", phase: "session" });
      if (provider === "webgpu" && data.failGpu === "session") throw new Error("Injected WebGPU session failure");
      if (data.profile && provider === "webgpu") {
        const ort = await import("demucs-ort-webgpu");
        ort.env.webgpu.profiling = { mode: "default" };
      }
      started = performance.now();
      session = await neural.load(bytes, {
        backend: provider, executionProviders: provider === "wasm" ? ["wasm"] : ["webgpu", "wasm"], wasmPaths: data.wasmPaths, threads: 1,
        sessionOptions: { enableCpuMemArena: false, enableMemPattern: false, ...(data.profile ? { logSeverityLevel: 0, logVerbosityLevel: 0 } : {}) },
      });
      timings.sessionMs = performance.now() - started;
      if (data.retain) retained = { provider, session };
    }
    stage = "run"; post({ kind: "phase", phase: "separate" });
    const raw = session;
    const timedRaw = {
      inputs: raw.inputs, outputs: raw.outputs, backend: raw.backend, free() {},
      async run(feeds: Parameters<typeof raw.run>[0]) {
        if (provider === "webgpu" && data.failGpu === "run") throw new Error("Injected WebGPU run failure");
        const started = performance.now();
        try { return await raw.run(feeds); } finally { timings.inferenceMs += performance.now() - started; timings.windows++; }
      },
    };
    const adapter = demucsHybridSession(timedRaw);
    const timedAdapter = {
      ...adapter,
      async run(feeds: Parameters<typeof adapter.run>[0]) {
        const started = performance.now();
        try { return await adapter.run(feeds); } finally { timings.adapterMs += performance.now() - started; }
      },
    };
    (globalThis as { __demucsStride?: number }).__demucsStride = 1 - data.overlap;
    const before = dispatches, started = performance.now();
    const result = await neural.separate(data.planes, {
      sampleRate: 44100, model: "htdemucs", weights: self.location.href, session: () => timedAdapter,
      progress: ({ chunk, totalChunks }) => post({ kind: "progress", chunk, total: totalChunks }),
    });
    timings.separateMs = performance.now() - started;
    timings.gpuDispatches = dispatches - before;
    timings.adapterMs -= timings.inferenceMs;
    timings.normalizeAndTransformsMs = timings.separateMs - timings.inferenceMs - timings.adapterMs;
    const accompanimentStarted = performance.now();
    const frames = data.planes[0].length, { drums, bass, other, vocals } = result.stems;
    const stems = [drums, bass, other, vocals];
    if (stems.some(stem => !stem || stem.length !== data.planes.length || stem.some(plane => plane.length !== frames))) throw new Error("Demucs returned incomplete stems");
    const accompaniment = data.planes.map((_, channel) => {
      const sum = new Float32Array(frames), d = drums[channel], b = bass[channel], o = other[channel];
      for (let i = 0; i < frames; i++) sum[i] = d[i] + b[i] + o[i];
      return sum;
    });
    const voice = vocals.map(plane => new Float32Array(plane.buffer as ArrayBuffer, plane.byteOffset, plane.length));
    timings.accompanimentMs = performance.now() - accompanimentStarted;
    if (!data.retain) { session.free(); retained = null; }
    post({ kind: "done", vocals: voice, accompaniment, provider, timings, postedAt: performance.timeOrigin + performance.now() }, [...voice, ...accompaniment].map(plane => plane.buffer));
  } catch (error) {
    post({ kind: "error", provider, stage, message: error instanceof Error ? error.message : String(error) });
  }
}

/** Unreported SCNet profile: one shipped-size window through the same separate() call and session options as src/inference/worker.ts. */
export async function profileScnet(planes: Float32Array<ArrayBuffer>[], modelUrl: string, wasmPaths: string, provider: Provider) {
  const ort = provider === "webgpu" ? await import("demucs-ort-webgpu") : null;
  if (ort) ort.env.webgpu.profiling = { mode: "default" };
  const bytes = new Uint8Array(await (await fetch(modelUrl)).arrayBuffer());
  let started = performance.now();
  const session = await strided.load(bytes, { backend: provider, executionProviders: provider === "wasm" ? ["wasm"] : ["webgpu", "wasm"], wasmPaths, threads: 1, sessionOptions: { enableCpuMemArena: false, enableMemPattern: false, logSeverityLevel: 0, logVerbosityLevel: 0 } });
  const sessionMs = performance.now() - started;
  let inferenceMs = 0, runs = 0;
  const before = dispatches;
  started = performance.now();
  await strided.separate(planes, {
    sampleRate: 44100, model: "scnet", targets: ["vocals"], step: 1, standardize: false,
    session: async () => ({
      inputs: session.inputs.map((input: { name: string }) => ({ name: input.name })), outputs: session.outputs,
      async run(feeds: Record<string, { data: Float32Array; dims: number[]; type: string }>) {
        const t = performance.now();
        try { return await session.run(feeds as Parameters<typeof session.run>[0]) as Record<string, { data: Float32Array; dims: number[] }>; }
        finally { inferenceMs += performance.now() - t; runs++; }
      },
    }),
  });
  const separateMs = performance.now() - started;
  session.free();
  return { sessionMs, separateMs, inferenceMs, runs, gpuDispatches: dispatches - before };
}
