import { copy, type ErrorAction, type ErrorEntry } from "./copy.ts";

/**
 * Every condition a person can hit, each with one plain message in the copy module.
 * Anything not listed here is a bug or an internal condition and reads as `processing-failed`.
 */
export const ERROR_CODES = [
  "file-unreadable",
  "file-no-audio",
  "file-unsupported-audio",
  "trim-order",
  "trim-past-end",
  "time-invalid",
  "time-negative",
  "gain-range",
  "loudness-range",
  "loudness-step",
  "peak-range",
  "true-peak-range",
  "true-peak-step",
  "ceiling-range",
  "ceiling-step",
  "compression-range",
  "number-invalid",
  "mp3-bitrate",
  "aac-bitrate",
  "wav-too-large",
  "copy-unsupported",
  "copy-needs-encoding",
  "model-download-failed",
  "model-damaged",
  "split-stalled",
  "split-failed",
  "range-no-audio",
  "range-too-short",
  "processing-failed",
  "storage-full",
  "storage-private-mode",
  "storage-stuck",
  "audio-unprocessable",
  "audio-damaged",
  "source-changed",
  "preview-failed",
  "levels-failed",
  "folder-blocked",
  "folder-no-space",
  "folder-cancelled",
  "zip-failed",
  "names-unsafe",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const GENERIC_ERROR: ErrorCode = "processing-failed";

/** A failure with a catalogue entry. `detail` is for developers and goes to the console, never to the screen. */
export class UserFacingError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "UserFacingError";
    this.code = code;
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}

/** The code a thrown value stands for. Raw errors never carry a code of their own. */
export function errorCode(error: unknown, fallback: ErrorCode = GENERIC_ERROR): ErrorCode {
  if (error instanceof UserFacingError) return error.code;
  if (error instanceof DOMException && error.name === "QuotaExceededError") return "storage-full";
  return fallback;
}

export function messageFor(code: ErrorCode): string {
  return copy.errors[code].message;
}
export function actionFor(code: ErrorCode): ErrorAction | null {
  const entry: ErrorEntry = copy.errors[code];
  return entry.action ?? null;
}

/** The only text that may reach the screen for a thrown value. */
export function userMessage(error: unknown, fallback: ErrorCode = GENERIC_ERROR): string {
  return messageFor(errorCode(error, fallback));
}

export type Failure = Readonly<{ code: ErrorCode; message: string }>;

/** Visible state for a condition that is already known, with no thrown value to inspect. */
export function failure(code: ErrorCode): Failure {
  return { code, message: messageFor(code) };
}

/**
 * Turns a thrown value into visible state. Raw errors and developer detail go to the console,
 * so a browser or engine message such as "Failed to fetch" cannot reach the screen.
 */
export function failureOf(error: unknown, fallback: ErrorCode = GENERIC_ERROR): Failure {
  const code = errorCode(error, fallback);
  if (!(error instanceof UserFacingError) || error.message !== error.code) console.error(error);
  return { code, message: messageFor(code) };
}

/** Marks a validation issue the interface cannot produce. It never reaches the screen. */
export const internalIssue = (detail: string) => `internal: ${detail}`;

/** The first validation message a person can act on, or undefined when only internal issues remain. */
export function validationMessage(issues: readonly { message: string }[]): string | undefined {
  for (const issue of issues) if (isErrorCode(issue.message)) return messageFor(issue.message);
  return undefined;
}
