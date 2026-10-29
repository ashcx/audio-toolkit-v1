import { InferenceRunner } from "../src/inference/runner";
export async function runInferenceProbe({ repeats = 5, frames = 485100 }: { repeats?: number; frames?: number }) {
  const runner = new InferenceRunner(), summaries = [];
  try {
    for (let index = 0; index < repeats; index++) {
      const planes = [Float32Array.from({ length: frames }, (_, frame) => .1 * Math.sin(frame * 2 * Math.PI * 440 / 44100))];
      const result = await runner.run(planes, () => undefined);
      summaries.push({ voiceFrames: result.planes[0].length, finite: result.planes.every(plane => plane.every(Number.isFinite)), backend: result.backend });
      console.log("isolation-part", index + 1);
    }
    return { type: "done", summaries };
  } catch (error) {
    return { type: "error", message: error instanceof Error ? error.message : String(error) };
  } finally { runner.stop(); }
}
