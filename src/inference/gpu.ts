export type GpuSupport = { usable: true } | { usable: false };

export async function usableGpu(): Promise<GpuSupport> {
  const gpu = "gpu" in navigator ? navigator.gpu : null;
  if (!gpu || typeof gpu !== "object" || !("requestAdapter" in gpu) || typeof gpu.requestAdapter !== "function") return { usable: false };
  const adapter: unknown = await gpu.requestAdapter().catch(() => null);
  if (!adapter || typeof adapter !== "object") return { usable: false };
  const info = "info" in adapter ? adapter.info : null;
  if (info && typeof info === "object" && (("isFallbackAdapter" in info && info.isFallbackAdapter === true) || ("architecture" in info && info.architecture === "swiftshader"))) return { usable: false };
  return { usable: true };
}
