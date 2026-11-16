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
