import { formatTime } from "./format.ts";
import type { ErrorCode } from "./errors.ts";
import type { JobOperation, JobPhase } from "./job-events.ts";
import type { EncodingMode } from "./encoding-modes.ts";
import type { ExportFormat, StepKind } from "./recipe.ts";

/** True minus sign. Level and loudness numbers read better with it than with a hyphen. */
export const minus = (value: number | string) => String(value).replace("-", "−");
const signed = (value: number) => (value > 0 ? `+${value}` : minus(value));

export type ErrorAction = "retry" | "try-again" | "remove" | "download";
export type ErrorEntry = Readonly<{ message: string; action?: ErrorAction }>;

const STEP_NAMES = {
  trim: "Trim all",
  gain: "Gain",
  normalize: "Normalize",
  compress: "Compressor",
  channels: "Channels",
  resample: "Sample rate",
  isolation: "Voice / music splitter",
  speech: "Remove background noise",
} as const satisfies Record<StepKind, string>;

const FORMAT_NAMES = {
  mp3: "MP3",
  m4a: "M4A",
  wav: "WAV",
  flac: "FLAC",
  opus: "Opus (.ogg)",
  original: "Keep original (no re-encoding)",
} as const satisfies Record<ExportFormat, string>;

const MODE_NAMES = {
  cbr: "Constant (CBR)",
  vbr: "Variable (VBR)",
} as const satisfies Record<EncodingMode, string>;

/** Each message says what happened and what to do. None shows raw browser or engine text. */
const ERRORS = {
  "file-unreadable": { message: "This file can't be read. Try another file.", action: "remove" },
  "file-no-audio": { message: "This file has no audio.", action: "remove" },
  "file-unsupported-audio": { message: "This file's audio format isn't supported.", action: "remove" },
  "trim-order": { message: "Start must be before the end." },
  "trim-past-end": { message: "Start is after the end of this file." },
  "time-invalid": { message: "Enter a time like 1:30." },
  "time-negative": { message: "Times can't be negative." },
  "gain-range": { message: "Gain must be between −12 and +12 dB." },
  "loudness-range": { message: "Loudness target must be between -30 and -8 LUFS." },
  "loudness-step": { message: "Loudness target must be in 0.5 LUFS steps." },
  "peak-range": { message: "Peak target must be between -60 and 0 dBFS." },
  "true-peak-range": { message: "True-peak target must be between -6 and 0 dBTP." },
  "true-peak-step": { message: "True-peak target must be in 0.1 dB steps." },
  "ceiling-range": { message: "True-peak ceiling must be between -6 and 0 dBTP." },
  "ceiling-step": { message: "True-peak ceiling must be in 0.1 dB steps." },
  "compression-range": { message: "Compression amount must be between 0 and 100." },
  "number-invalid": { message: "Enter a number." },
  "mp3-bitrate": { message: "MP3 at this sample rate supports up to 160 kbps. Lower the bitrate." },
  "aac-bitrate": { message: "This bitrate is too high for this audio. Lower the bitrate." },
  "wav-too-large": { message: "WAV files can't be larger than 4 GB. Choose another format or trim the audio." },
  "copy-unsupported": { message: "This file can't be kept as it is. Choose another format." },
  "model-download-failed": {
    message: "Couldn't download the voice/music model. Check your connection and try again.",
    action: "retry",
  },
  "model-damaged": { message: "The model download was damaged. Try again.", action: "retry" },
  "split-stalled": {
    message: "Voice / music splitting stopped responding. Try again, or try a shorter clip.",
    action: "retry",
  },
  "split-failed": { message: "Couldn't split voice and music. Try again.", action: "retry" },
  "range-no-audio": { message: "The selected part has no audio." },
  "range-too-short": { message: "The selected part is too short to split." },
  "processing-failed": { message: "Something went wrong with this file. Try again.", action: "retry" },
  "storage-full": { message: "Not enough space to finish. Free some space and try again.", action: "retry" },
  "storage-private-mode": { message: "This browser can't store large files in private mode. Try a normal window." },
  "storage-stuck": { message: "Couldn't free some storage.", action: "try-again" },
  "audio-unprocessable": { message: "This file's audio can't be processed.", action: "remove" },
  "audio-damaged": { message: "This file has damaged audio.", action: "remove" },
  "source-changed": { message: "The file changed. Remove it and add it again." },
  "preview-failed": { message: "Couldn't make a preview. Try again.", action: "retry" },
  "levels-failed": { message: "Couldn't measure this audio." },
  "folder-blocked": { message: "Couldn't save to that folder. Download the files instead.", action: "download" },
  "folder-no-space": { message: "Not enough space on that drive." },
  "folder-cancelled": { message: "Cancelled." },
  "zip-failed": { message: "Couldn't create the ZIP. Download the files one by one." },
  "names-unsafe": { message: "Some file names can't be saved together. Download them one by one." },
} as const satisfies Record<ErrorCode, ErrorEntry>;

const STAGE_BY_PHASE = {
  Preparing: "Preparing…",
  Reading: "Preparing…",
  Extracting: "Preparing…",
  Decoding: "Preparing…",
  "Analyzing for isolation": "Preparing…",
  "Loading isolation tools": "Preparing…",
  "Loading model": "Preparing…",
  Processing: "Processing…",
  Normalizing: "Processing…",
  "Processing / encoding": "Processing…",
  Separating: "Separating…",
  Encoding: "Saving…",
  Saving: "Saving…",
} as const satisfies Record<JobPhase, string>;

const MEGABYTE = 1_000_000;
const percent = (completed: number, total: number) =>
  total > 0 ? Math.max(0, Math.min(100, Math.floor((completed / total) * 100))) : 0;

export type FolderOutcome = Readonly<{ saved: number; failed: number; folder: string; cancelled: boolean }>;
type LoudnessNotes = Readonly<{ achievedLufs: number | null }>;

export const copy = {
  units: { db: "dB", dbtp: "dBTP", dbfs: "dBFS", lufs: "LUFS", percent: "%" },
  unset: "Unset",
  /** A level, gain or loudness number with a true minus sign and at most one decimal. */
  number: (value: number) => minus(Number(value.toFixed(1))),
  slider: (label: string) => `${label} slider`,
  steps: {
    names: STEP_NAMES,
    heading: "Steps",
    hint: "Steps run from top to bottom.",
    empty: "Add a step to change your audio. Steps run from top to bottom.",
    addStep: "Add step",
    remove: "Remove",
    moveUp: "Up",
    moveDown: "Down",
    moreActions: (step: string) => `More actions for ${step}`,
    removeStep: (step: string) => `Remove ${step}`,
    moveStepUp: (step: string) => `Move ${step} up`,
    moveStepDown: (step: string) => `Move ${step} down`,
    settings: (step: string) => `${step} settings`,
    drag: (step: string) => `Drag ${step}`,
    moved: (step: string, position: number, count: number) => `${step} moved to position ${position} of ${count}.`,
    reorderHelp: "Drag to reorder, or use Arrow Up and Arrow Down on the grip. More actions also has move controls.",
  },
  trim: {
    prefix: "Trim all",
    hint: "Applies to every file.",
    start: "Start",
    end: "End",
    to: "to",
    unknownDuration: "Duration unknown",
    setRange: "Set range",
    startField: (prefix: string) => `${prefix} start (time)`,
    endField: (prefix: string) => `${prefix} end (time)`,
    startHandle: (prefix: string) => `${prefix} start handle`,
    endHandle: (prefix: string) => `${prefix} end handle`,
    summary(range: Readonly<{ start: number | null; end: number | null }>) {
      const { start, end } = range;
      if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return copy.trim.setRange;
      if (!start && end === null) return "Whole file";
      return `${formatTime(start ?? 0)} to ${end === null ? "End" : formatTime(end)}`;
    },
  },
  gain: {
    label: "Gain (dB)",
    warning: "Loud peaks may distort.",
    setGain: "Set gain",
    summary(db: number) {
      if (!Number.isFinite(db)) return copy.gain.setGain;
      return `${signed(db)} dB${db > 0 ? " · May distort" : ""}`;
    },
  },
  normalize: {
    modeLegend: "Mode",
    modes: { loudness: "Loudness", peak: "Peak" },
    loudnessTarget: "Loudness target",
    ceiling: "True-peak ceiling (dBTP)",
    peakTarget: "Peak target (dBTP)",
    legacyPeakTarget: "Legacy peak target (dBFS)",
    useTruePeak: "Use a true-peak target",
    loudnessExplainer: "Loudness is raised until it reaches the target or the peak ceiling.",
    peakExplainer: "Raises the loudest peak to this level.",
    setPeak: "Set peak target",
    setLoudness: "Set loudness target",
    marks: { "-23": "Broadcast", "-16": "Podcast", "-14": "Streaming", "-9.5": "Loud", "-8": "Maximum" } as Readonly<Record<string, string>>,
    markValue: (value: number) => minus(value),
    marksDescription: (marks: readonly Readonly<{ value: number; label: string }>[]) =>
      `Reference marks. ${marks.map(mark => `${minus(mark.value)} LUFS, ${mark.label}`).join("; ")}.`,
    summary(step: {
      mode?: "loudness" | "peak";
      targetDbtp?: number;
      targetDbfs?: number;
      targetLufs?: number;
      ceilingDbtp?: number;
    }) {
      if ((step.mode ?? "peak") === "peak") {
        if (Number.isFinite(step.targetDbtp)) return `Peak · ${minus(step.targetDbtp as number)} dBTP`;
        return Number.isFinite(step.targetDbfs)
          ? `Peak · ${minus(step.targetDbfs as number)} dBFS (legacy)`
          : copy.normalize.setPeak;
      }
      return Number.isFinite(step.targetLufs) && Number.isFinite(step.ceilingDbtp)
        ? `Loudness · ${minus(step.targetLufs as number)} LUFS · ${minus(step.ceilingDbtp as number)} dBTP`
        : copy.normalize.setLoudness;
    },
  },
  levels: {
    heading: "Your audio",
    peak: "Peak",
    average: "Average",
    unit: "dBFS",
    empty: "Add a file to see its levels.",
    measuring: "Measuring…",
    /** A measured level with one decimal, so a steady reading never changes width. */
    value(db: number | null) {
      if (db === null) return "−∞";
      const text = db.toFixed(1);
      return Number(text) === 0 ? "0.0" : minus(text);
    },
  },
  compressor: {
    amount: "Amount",
    gentle: "Gentle",
    strong: "Strong",
    amountLabel: "Compression amount",
    preset: "Preset",
    presets: { speech: "Speech", music: "Music" },
    hint: "Turns loud parts down so quiet and loud parts sound more even.",
    summary: (step: { preset: "speech" | "music"; amount: number }) =>
      `${copy.compressor.presets[step.preset]} · ${step.amount}%`,
  },
  channels: {
    label: "Channels",
    options: { original: "Unchanged", mono: "Mono", stereo: "Stereo" },
    summary: { original: "Keep unchanged", mono: "Mono", stereo: "Stereo" },
  },
  sampleRate: {
    label: "Sample rate",
    keep: "Keep unchanged",
    summary: (rateHz: number | "original") => (rateHz === "original" ? copy.sampleRate.keep : `${rateHz / 1000} kHz`),
  },
  splitter: {
    label: "Keep",
    options: { voice: "Voice", music: "Music" },
    summary: { voice: "Keep voice", music: "Keep music" },
    hint: "Voice: removes the music and keeps the vocals. Music: removes the vocals and keeps the music. Some leftover sound is normal.",
    slowDevice: "This device has no graphics acceleration, so splitting will be slow (roughly 1½ minutes or more per minute of audio).",
  },
  noise: {
    label: "Quality",
    options: { standard: "Standard", detailed: "Detailed" },
    summary: { standard: "Standard", detailed: "Detailed" },
    hint: "Standard: faster, good for most recordings. Detailed: slower, more thorough on noisy recordings.",
  },
  export: {
    heading: "Export",
    formatLabel: "Format",
    formats: FORMAT_NAMES,
    modeLabel: "Encoding mode",
    modes: MODE_NAMES,
    bitrateLabel: "Bitrate (kbps)",
    keepOriginalHint: "Keeps the file's own audio as it is. Steps that change the sound need another format.",
    exportButton: "Export",
    clearAll: "Clear all",
    clearAllTooltip: "Removes loaded files and unsaved exports. Files saved to your device stay.",
    cancelAll: "Cancel all",
    retryFailed: "Retry failed",
    keepOpen: "Keep this tab open until it finishes.",
    clearing: "Clearing…",
    exporting: (current: number, total: number) => `Exporting ${current} of ${total}`,
  },
  delivery: {
    saveToDevice: "Save to device",
    createZip: "Create ZIP",
    downloadZip: "Download ZIP",
    saveToFolder: "Save to folder",
    discard: "Discard exports",
    creatingZip: "Creating ZIP",
    zipProgress: "ZIP progress",
    cancel: "Cancel",
    finishing: "Finishing…",
    chooseFolder: "Choose where to save.",
    savingProgress: (completed: number, total: number) => `Saving ${completed} of ${total}`,
    folderResult(outcome: FolderOutcome) {
      const parts: string[] = [];
      if (outcome.saved > 0) parts.push(`Saved ${outcome.saved} ${outcome.saved === 1 ? "file" : "files"} to ${outcome.folder}.`);
      if (outcome.failed > 0) parts.push(`${outcome.failed} couldn't be saved.`);
      if (outcome.cancelled || !parts.length) parts.unshift("Cancelled.");
      return parts.join(" ");
    },
    folderSkipped: (name: string) => `Skipped ${name} because it already exists.`,
    folderUnfinished: (name: string) => `Couldn't finish saving ${name}. Download it instead.`,
  },
  files: {
    heading: "Files",
    choose: "Choose files",
    add: "Add files",
    drop: "or drop audio or video",
    pickerLabel: "Choose audio or video files",
    listLabel: "Selected files",
    inspecting: "Inspecting files.",
    inspected: "File inspection complete.",
    waiting: "Waiting",
    reading: "Reading…",
    cancelling: "Cancelling…",
    cancelled: "Cancelled",
    retry: "Retry",
    cancel: "Cancel",
    remove: "Remove",
    removeLabel: (name: string) => `Remove ${name}`,
    cancelLabel: (name: string) => `Cancel ${name}`,
    retryLabel: (name: string) => `Retry ${name}`,
    original: "Original",
    playOriginal: (name: string) => `Play original ${name}`,
    progressLabel: (name: string) => `Export ${name}`,
    sourceUnplayable: "This source cannot play in the browser. Export it to hear the result.",
    resultUnplayable: "This exported format cannot play here. Download it to listen.",
  },
  result: {
    label: "Result",
    olderLabel: "Result (older settings)",
    download: (name: string) => `Download result for ${name}`,
    downloadOlder: (name: string) => `Download older result for ${name}`,
    play: (name: string) => `Play result ${name}`,
    playOlder: (name: string) => `Play older result ${name}`,
    peakLimited: (notes: LoudnessNotes) =>
      notes.achievedLufs === null
        ? "The peak ceiling kept this quieter than the target."
        : `The peak ceiling kept this quieter than the target (${minus(Number(notes.achievedLufs.toFixed(1)))} LUFS).`,
    tooQuiet: "This audio was too quiet to reach the target.",
    unmeasurable: "This audio is too quiet to measure, so loudness was not changed.",
    clipped: "Some peaks are clipped. Lower the gain or the peak target.",
  },
  preview: {
    button: "Preview 15 s",
    heading: "First 15 seconds, before and after",
    estimate: "Loudness and splitting may sound slightly different on the full file.",
    before: "Before",
    after: "After",
    close: "Close preview",
    cancel: "Cancel preview",
    cancelling: "Cancelling preview…",
    buttonLabel: (name: string) => `Preview ${name}`,
    beforeLabel: (name: string) => `Before preview ${name}`,
    afterLabel: (name: string) => `After preview ${name}`,
  },
  banners: {
    firefox: "Firefox is unsupported. Use Chrome, Edge or Safari.",
    workers: "This browser can't run the app. Use Chrome, Edge or Safari.",
    storage: "This browser limits storage, so large files may not work.",
  },
  settings: {
    open: "Settings",
    heading: "Settings",
    theme: "Theme",
    themes: { system: "System", light: "Light", dark: "Dark" },
    licenses: "Licenses",
    close: "Close",
  },
  app: { title: "Audio Toolkit", backToTools: "Back to Tools" },
  actions: { retry: "Retry", "try-again": "Try again", remove: "Remove", download: "Download" } as const satisfies Record<ErrorAction, string>,
  errors: ERRORS,
  copyNeedsEncoding: (step: string) => `${step} needs a format other than Keep original. Choose another format.`,
  progress: {
    phase: (phase: JobPhase) => STAGE_BY_PHASE[phase],
    /** One line for a running export. Counters are percent or MB, never internal units. */
    label(operation: JobOperation): string {
      switch (operation.kind) {
        case "phase":
          return STAGE_BY_PHASE[operation.phase];
        case "model-download":
          return `Downloading model, ${Math.min(Math.floor(operation.loaded / MEGABYTE), Math.round(operation.total / MEGABYTE))} of ${Math.round(operation.total / MEGABYTE)} MB`;
        case "isolation-progress":
          return `Separating voice and music, ${percent(operation.completed, operation.total)}%`;
      }
    },
    /** One line for a running preview. Separation shows a percent, other work shows its stage. */
    preview(operation: JobOperation): string {
      switch (operation.kind) {
        case "phase":
          return "Previewing…";
        case "model-download":
          return copy.progress.label(operation);
        case "isolation-progress":
          return `Previewing… ${percent(operation.completed, operation.total)}%`;
      }
    },
  },
} as const;

export type StepNames = typeof STEP_NAMES;
export type FormatNames = typeof FORMAT_NAMES;
