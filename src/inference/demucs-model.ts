export const DEMUCS_MODEL = {
  file: "htdemucs_fp16.onnx",
  bytes: 85034606,
  sha256: "742a4f8594a48d6306da303b8b2dd8be2b54389b88557db034408b436effd775",
  segment: 343980,
  stride: Math.floor(0.75 * 343980),
  sources: ["drums", "bass", "other", "vocals"],
  rate: 44100,
} as const;
export type DemucsSource = (typeof DEMUCS_MODEL.sources)[number];

const PROGRESS_STEP = 1024 * 1024;
type Pin = { bytes: number; sha256: string };

/** Downloads the model into one preallocated buffer, refusing anything that exceeds, falls short of, or hashes differently from the pin. */
export async function fetchModelBytes(url: URL | string, onProgress: (loaded: number, total: number) => void, pin: Pin = DEMUCS_MODEL) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error("Could not load the isolation model. Check your connection and retry.");
  const bytes = new Uint8Array(pin.bytes), reader = response.body.getReader();
  let received = 0, reported = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (received + value.length > pin.bytes) throw new Error("The isolation model could not be verified. Retry.");
      bytes.set(value, received);received += value.length;
      if (received - reported >= PROGRESS_STEP || received === pin.bytes) { onProgress(received, pin.bytes);reported = received; }
    }
  } finally { reader.releaseLock(); }
  if (received !== pin.bytes) throw new Error("The isolation model download is incomplete. Retry.");
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), value => value.toString(16).padStart(2, "0")).join("");
  if (hash !== pin.sha256) throw new Error("The isolation model could not be verified. Retry.");
  return bytes;
}
