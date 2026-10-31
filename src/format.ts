export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
export function formatDuration(duration: number | null): string {
  if (duration === null) return "Duration unknown";
  return formatTime(duration);
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const rounded = Number(seconds.toFixed(6));
  const whole = Math.floor(rounded);
  const fraction = (rounded - whole).toFixed(6).slice(1).replace(/0+$/, "").replace(/\.$/, "");
  const minutes = Math.floor(whole / 60);
  const clock = `${minutes < 60 ? minutes : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`}:${String(whole % 60).padStart(2, "0")}`;
  return clock + fraction;
}
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}
export function formatTrimTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const tenths = Math.round(seconds * 10);
  const whole = Math.floor(tenths / 10);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}${tenths % 10 ? `.${tenths % 10}` : ""}`;
}
export function parseClock(value: string): number | null {
  if (!value.trim()) return null;
  const text = value.trim();
  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d+)?$/.test(text)) return NaN;
  const parts = text.split(":").map(Number);
  if (parts.slice(1).some(part => part >= 60)) return NaN;
  const result = parts.reduce((total, part) => total * 60 + part, 0);
  return Number.isFinite(result) ? result : NaN;
}
