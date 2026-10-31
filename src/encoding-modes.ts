import type { ExportFormat } from "./recipe.ts";

export type EncodingMode = "cbr" | "vbr";
export type EncodingModeOption = Readonly<{
  value: EncodingMode;
  label: string;
  description: string;
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
      label: "Constant bitrate (CBR)",
      description: "Constant bitrate. This LAME path has no verified variable mode.",
    },
  ],
  m4a: [
    {
      value: "cbr",
      label: "Constant bitrate (CBR)",
      description: "Constant bitrate. Native and fallback AAC expose no verified variable mode.",
    },
  ],
  opus: [
    {
      value: "cbr",
      label: "Constant bitrate (CBR)",
      description: "Constant bitrate. Every packet uses the selected bitrate.",
    },
    {
      value: "vbr",
      label: "Variable bitrate (VBR)",
      description: "Variable bitrate. Packet sizes vary; the bitrate is a target, not a fixed file size.",
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
  return settings.format === "opus" && settings.mode === "vbr"
    ? "variable"
    : "constant";
}
