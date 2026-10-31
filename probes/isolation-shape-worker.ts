import { load } from "../vendor/neural/neural.js";
self.onmessage = async () => {
  let session: Awaited<ReturnType<typeof load>> | null = null;
  try {
    const base = new URL(import.meta.env.BASE_URL + "vendor/neural/", self.location.href);
    const response = await fetch(new URL("scnet.int8.onnx", base));
    if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
    session = await load(await response.arrayBuffer(), { backend: "wasm", wasmPaths: base.href, threads: 1, sessionOptions: { enableCpuMemArena: false, enableMemPattern: false } });
    const results = [];
    for (const seconds of [15, 22]) {
      const frames = Math.floor(seconds * 44100 / 1024) + 1;
      try {
        await session.run({ mix_spec: { data: new Float32Array(4 * 2049 * frames), dims: [1, 4, 2049, frames], type: "float32" } });
        results.push({ seconds, frames, rejected: false });
      } catch (error) { results.push({ seconds, frames, rejected: true, message: String(error) }); }
    }
    self.postMessage({ inputs: session.inputs, results });
  } catch (error) { self.postMessage({ error: String(error) }); }
  finally { session?.free(); }
};
