import { copy } from "./copy.ts";
import type { ExportFormat } from "./recipe.ts";

export type EncodingMode = "cbr" | "vbr";
export type EncodingModeOption = Readonly<{
  value: EncodingMode;
  label: string;
}>;

// This table is the authority for visible modes. A shared library type does not
// prove that an encoder honors a mode, so only the measured paths appear here.
export const ENCODING_MODES = {
  original: [],
  wav: [],
  flac: [],
  mp3: [
    {
      value: "cbr",
      label: copy.export.modes.cbr,
    },
  ],
  m4a: [
    {
      value: "vbr",
      label: copy.export.modes.vbr,
    },
  ],
  opus: [
    {
      value: "cbr",
      label: copy.export.modes.cbr,
    },
    {
      value: "vbr",
      label: copy.export.modes.vbr,
    },
  ],
} as const satisfies Record<ExportFormat, readonly EncodingModeOption[]>;

export function encodingModesFor(format: ExportFormat): readonly EncodingModeOption[] {
  return ENCODING_MODES[format];
}

export function defaultEncodingMode(format: ExportFormat): EncodingMode {
  return ENCODING_MODES[format][0]?.value ?? "cbr";
}

export function encoderBitrateMode(settings: {
  format: ExportFormat;
  mode?: EncodingMode;
}): "constant" | "variable" {
  return (settings.format === "opus" || settings.format === "m4a") &&
    settings.mode === "vbr"
    ? "variable"
    : "constant";
}
