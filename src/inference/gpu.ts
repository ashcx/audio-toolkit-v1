export type GpuSupport = { usable: true } | { usable: false; reason: string };

/** A WebGPU adapter that is real hardware: not missing, not the browser's fallback adapter and not SwiftShader. */
export async function usableGpu(): Promise<GpuSupport> {
  const gpu = "gpu" in navigator ? navigator.gpu : null;
  if (!gpu || typeof gpu !== "object" || !("requestAdapter" in gpu) || typeof gpu.requestAdapter !== "function") return { usable: false, reason: "This browser does not offer WebGPU." };
  const adapter: unknown = await gpu.requestAdapter().catch(() => null);
  if (!adapter || typeof adapter !== "object") return { usable: false, reason: "This browser found no usable GPU." };
  const info = "info" in adapter ? adapter.info : null;
  if (info && typeof info === "object" && (("isFallbackAdapter" in info && info.isFallbackAdapter === true) || ("architecture" in info && info.architecture === "swiftshader"))) return { usable: false, reason: "This browser offers only a software GPU." };
  return { usable: true };
}
