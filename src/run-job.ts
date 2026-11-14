import type { JobRunner } from "./batch";
export const runJob: JobRunner = async (spec, signal, phase, lease) => {
  if (spec.plan.kind === "copy") {
    const { copyAudio } = await import("./copy-audio");
    return { output: await copyAudio(spec.entry.file, spec.plan, signal, spec.name, phase), report: { kind: "copy" } };
  }
  const { processAudio } = await import("./process-audio");
  const result = await processAudio(spec.entry.file, spec.plan, signal, spec.name, phase, lease);
  return { output: result.output, report: { kind: "pcm", stats: result.stats } };
};
