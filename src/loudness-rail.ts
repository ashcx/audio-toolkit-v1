export const LOUDNESS_MIN = -30;
export const LOUDNESS_MAX = -8;
export const LOUDNESS_STEP = 0.5;
export type LoudnessMark = Readonly<{
  value: number;
  label: string;
  kind: "delivery" | "playback" | "limit";
}>;
export const LOUDNESS_MARKS: readonly LoudnessMark[] = [
  { value: -23, label: "EBU R 128 delivery", kind: "delivery" },
  { value: -16, label: "Podcast reference", kind: "playback" },
  { value: -14, label: "Streaming playback", kind: "playback" },
  { value: -9.5, label: "Loud playback", kind: "playback" },
  { value: -8, label: "Tool maximum", kind: "limit" },
];
// The rail is deliberately denser around normal speech levels. These anchors
// keep every 0.5 LUFS value reachable while giving the useful range more travel.
const ANCHORS = [
  { value: LOUDNESS_MIN, position: 0 },
  { value: -23, position: 0.18 },
  { value: -16, position: 0.44 },
  { value: -14, position: 0.55 },
  { value: -9.5, position: 0.8 },
  { value: LOUDNESS_MAX, position: 1 },
] as const;
const MAGNET_ZONE = 0.025;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function quantizeLufs(value: number): number {
  return clamp(Math.round(value / LOUDNESS_STEP) * LOUDNESS_STEP, LOUDNESS_MIN, LOUDNESS_MAX);
}

export function positionForLufs(value: number): number {
  if (!Number.isFinite(value)) return positionForLufs(-14);
  const lufs = clamp(value, LOUDNESS_MIN, LOUDNESS_MAX);
  for (let index = 1; index < ANCHORS.length; index++) {
    const previous = ANCHORS[index - 1];
    const next = ANCHORS[index];
    if (lufs <= next.value) {
      const fraction = (lufs - previous.value) / (next.value - previous.value);
      return previous.position + fraction * (next.position - previous.position);
    }
  }
  return 1;
}

export function lufsForPosition(position: number): number {
  const point = clamp(position, 0, 1);
  for (let index = 1; index < ANCHORS.length; index++) {
    const previous = ANCHORS[index - 1];
    const next = ANCHORS[index];
    if (point <= next.position) {
      const fraction = (point - previous.position) / (next.position - previous.position);
      return quantizeLufs(previous.value + fraction * (next.value - previous.value));
    }
  }
  return LOUDNESS_MAX;
}

export function lufsFromPosition(position: number): number {
  const point = clamp(position, 0, 1);
  const mark = LOUDNESS_MARKS.find(
    (candidate) => Math.abs(point - positionForLufs(candidate.value)) <= MAGNET_ZONE,
  );
  return mark?.value ?? lufsForPosition(point);
}

export function stepLufs(value: number, steps: number): number {
  return quantizeLufs(value + steps * LOUDNESS_STEP);
}
