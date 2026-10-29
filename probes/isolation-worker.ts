import { separate, load } from "../vendor/neural/neural.js";

self.onmessage = async ({ data }) => {
  let session: Awaited<ReturnType<typeof load>> | null = null;
  try {
    const base = new URL(import.meta.env.BASE_URL + "vendor/neural/", self.location.href);
    const response = await fetch(new URL("scnet.int8.onnx", base));
    if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
    if (hash !== "3f049a0e4ce3c08264a6212a50445ba77f02a517cd4c6dc86cbe1ca130176d67") throw new Error("Model hash mismatch");
    session = await load(bytes, { backend: "wasm", wasmPaths: base.href, threads: 1, sessionOptions: { enableCpuMemArena: false, enableMemPattern: false } });
    const borrowed = { run: session.run, inputs: session.inputs.map(input => ({ name: input.name })), outputs: session.outputs };
    const summaries = [];
    const frames = data.frames ?? 44100;
    for (let index = 0; index < (data.repeats ?? 1); index++) {
      const channels = [Float32Array.from({ length: frames }, (_, i) => .1 * Math.sin(i * 2 * Math.PI * 440 / 44100))];
      const { stems, residual } = await separate(channels, { sampleRate: 44100, model: "scnet", targets: ["vocals"], step: .5, session: () => borrowed });
      summaries.push({ voiceFrames: stems.vocals[0].length, musicFrames: residual[0].length, finite: [...stems.vocals, ...residual].every(plane => plane.every(Number.isFinite)) });
      self.postMessage({ type: "part", index: index + 1 });
    }
    self.postMessage({ type: "done", hash, ...summaries[0], summaries });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  } finally {
    session?.free();
  }
};
