export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
export function formatDuration(duration: number | null): string {
  if (duration === null) return "Duration unknown";
  const total = Math.round(duration);
  const seconds = (total % 60).toString().padStart(2, "0");
  const minutes = Math.floor(total / 60);
  return minutes < 60
    ? `${minutes}:${seconds}`
    : `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, "0")}:${seconds}`;
}
