// The benchmark build (scripts/demucs-bench-prepare.mjs) aliases these to a copy of vendor/neural whose hybrid stride reads globalThis.__demucsStride.
declare module "demucs-neural-stride";
declare module "demucs-ort-webgpu" {
  export const env: { webgpu: { profiling: { mode: "off" | "default" } } };
}
