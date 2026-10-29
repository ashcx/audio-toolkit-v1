import { useLayoutEffect, useRef, useState } from "preact/hooks";
import {
  STEP_NAMES,
  FORMAT_NAMES,
  isStepKind,
  isExportFormat,
  newStep,
  newExport,
  moveStep,
  stepSchema,
  exportSchema,
  type RecipeDraft,
  type StepDraft,
} from "./recipe";
import { TrimFields } from "./trim-fields";

function summary(step: StepDraft): string {
  switch (step.kind) {
    case "trim":
      if (
        (step.range.start !== null && !Number.isFinite(step.range.start)) ||
        (step.range.end !== null && !Number.isFinite(step.range.end))
      )
        return "Set range";
      return `${step.range.start ?? 0} s to ${step.range.end === null ? "end" : `${step.range.end} s`}`;
    case "gain":
      return Number.isFinite(step.db)
        ? `${step.db} dB${step.db > 0 ? " · May clip" : ""}`
        : "Set gain";
    case "normalize":
      return Number.isFinite(step.targetDbfs)
        ? `${step.targetDbfs} dBFS`
        : "Set target";
    case "channels":
      return step.channels === "original"
        ? "Keep unchanged"
        : step.channels === "mono"
          ? "Mono"
          : "Stereo";
    case "resample":
      return step.rateHz === "original"
        ? "Keep unchanged"
        : `${step.rateHz / 1000} kHz`;
    case "isolation":
      return step.keep === "voice" ? "Keep voice" : "Keep music";
    default: {
      const unreachable: never = step;
      return unreachable;
    }
  }
}
function StepFields({
  step,
  onChange,
  errorId,
}: {
  step: StepDraft;
  errorId?: string;
  onChange: (step: StepDraft) => void;
}) {
  switch (step.kind) {
    case "trim":
      return (
        <TrimFields
          errorId={errorId}
          range={step.range}
          prefix="Batch trim"
          onChange={(range) => onChange({ ...step, range })}
        />
      );
    case "gain":
      return (
        <label class="field">
          Gain (dB)
          <input
            aria-invalid={!!errorId}
            aria-describedby={errorId}
            type="number"
            min="-12"
            max="12"
            step="0.1"
            value={Number.isFinite(step.db) ? step.db : ""}
            onInput={(event) =>
              onChange({ ...step, db: event.currentTarget.valueAsNumber })
            }
          />
        </label>
      );
    case "normalize":
      return (
        <label class="field">
          Peak target (dBFS)
          <input
            aria-invalid={!!errorId}
            aria-describedby={errorId}
            type="number"
            min="-60"
            max="0"
            step="0.1"
            value={Number.isFinite(step.targetDbfs) ? step.targetDbfs : ""}
            onInput={(event) =>
              onChange({
                ...step,
                targetDbfs: event.currentTarget.valueAsNumber,
              })
            }
          />
        </label>
      );
    case "channels":
      return (
        <label class="field">
          Channels
          <select
            value={step.channels}
            onChange={(event) => {
              const next = stepSchema.safeParse({
                ...step,
                channels: event.currentTarget.value,
              });
              if (next.success) onChange(next.data);
            }}
          >
            <option value="original">Keep unchanged</option>
            <option value="mono">Mono</option>
            <option value="stereo">Stereo</option>
          </select>
        </label>
      );
    case "resample":
      return (
        <label class="field">
          Sample rate
          <select
            value={step.rateHz}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              const next = stepSchema.safeParse({
                ...step,
                rateHz: raw === "original" ? raw : Number(raw),
              });
              if (next.success) onChange(next.data);
            }}
          >
            <option value="original">Keep unchanged</option>
            {[44100, 48000, 32000, 24000, 16000].map((rate) => (
              <option value={rate}>{rate / 1000} kHz</option>
            ))}
          </select>
        </label>
      );
    case "isolation":
      return (
        <>
        <label class="field">
          Keep
          <select
            value={step.keep}
            onChange={(event) => {
              const next = stepSchema.safeParse({
                ...step,
                keep: event.currentTarget.value,
              });
              if (next.success) onChange(next.data);
            }}
          >
            <option value="voice">Voice</option>
            <option value="music">Music</option>
          </select>
        </label>
        <small class="panel-description">Some voice, music or reverb may remain. Isolation uses more memory and can be slow on phones.</small>
        </>
      );
    default: {
      const unreachable: never = step;
      return unreachable;
    }
  }
}
export function RecipeEditor({
  value,
  onChange,
  error,
}: {
  value: RecipeDraft;
  onChange: (value: RecipeDraft) => boolean;
  error?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const moved = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (moved.current) {
      panel.current
        ?.querySelector<HTMLButtonElement>(
          `[data-step-id="${moved.current}"] .step-toggle`,
        )
        ?.focus();
      moved.current = null;
    }
  }, [value.steps]);
  const move = (index: number, direction: -1 | 1) => {
    moved.current = value.steps[index].id;
    onChange(moveStep(value, index, index + direction));
  };
  const dragged = useRef<string | null>(null);
  const addControl = useRef<HTMLSelectElement>(null);
  const bitrates =
    value.export.format === "mp3"
      ? [128, 192, 256, 320]
      : value.export.format === "m4a"
        ? [128, 192, 256]
        : value.export.format === "opus"
          ? [64, 96, 128, 160, 192]
          : [];
  return (
    <section
      ref={panel}
      class="panel recipe-panel"
      aria-labelledby="recipe-title"
    >
      <div class="panel-heading">
        <h2 id="recipe-title">Recipe</h2>
        <select
          ref={addControl}
          aria-label="Add step"
          value=""
          onChange={(event) => {
            const kind = event.currentTarget.value;
            if (isStepKind(kind)) {
              const step = newStep(kind);
              onChange({ ...value, steps: [...value.steps, step] });
              setExpanded(step.id);
            }
          }}
        >
          <option value="" disabled>
            Add step
          </option>
          {Object.entries(STEP_NAMES).map(([kind, label]) => (
            <option
              value={kind}
              disabled={
                (kind === "trim" || kind === "isolation") &&
                value.steps.some((step) => step.kind === kind)
              }
            >
              {label}
            </option>
          ))}
        </select>
      </div>
      <p class="panel-description">Applied to all files.</p>
      <div class="recipe-steps">
        {value.steps.map((step, index) => {
          const parsed = stepSchema.safeParse(step);
          const stepError = parsed.success
            ? undefined
            : parsed.error.issues[0].message;
          const errorId = stepError ? `error-${step.id}` : undefined;
          const repeated =
            value.steps.filter((item) => item.kind === step.kind).length > 1;
          const ordinal = value.steps
            .slice(0, index + 1)
            .filter((item) => item.kind === step.kind).length;
          const label = `${STEP_NAMES[step.kind]}${repeated ? ` ${ordinal}` : ""}`;
          return (
            <article
              class="recipe-step"
              aria-label={STEP_NAMES[step.kind]}
              key={step.id}
              data-step-id={step.id}
              draggable
              onDragStart={(event) => {
                if (
                  event.target instanceof HTMLInputElement ||
                  event.target instanceof HTMLSelectElement
                ) {
                  event.preventDefault();
                  return;
                }
                dragged.current = step.id;
                event.dataTransfer?.setData("text/x-audio-step", step.id);
              }}
              onDragEnd={() => {
                dragged.current = null;
              }}
              onDragOver={(event) => {
                if (dragged.current) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer?.getData("text/x-audio-step");
                const from = value.steps.findIndex((item) => item.id === id);
                onChange(moveStep(value, from, index));
                dragged.current = null;
              }}
            >
              <div class="step-heading">
                <h3>
                  <button
                    class="step-toggle"
                    type="button"
                    aria-label={`${label} settings`}
                    aria-describedby={`summary-${step.id}${errorId ? ` ${errorId}` : ""}`}
                    aria-expanded={expanded === step.id}
                    aria-controls={`settings-${step.id}`}
                    onClick={() =>
                      setExpanded(expanded === step.id ? null : step.id)
                    }
                  >
                    <span>{STEP_NAMES[step.kind]}</span>
                    <small id={`summary-${step.id}`}>{summary(step)}</small>
                  </button>
                </h3>
                <div class="step-actions">
                  <button
                    type="button"
                    aria-label={`Move ${label} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${label} down`}
                    disabled={index === value.steps.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${label}`}
                    onClick={() => {
                      if (
                        onChange({
                          ...value,
                          steps: value.steps.filter(
                            (item) => item.id !== step.id,
                          ),
                        })
                      )
                        addControl.current?.focus();
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div
                id={`settings-${step.id}`}
                class="step-settings"
                hidden={expanded !== step.id}
              >
                {expanded === step.id && (
                  <StepFields
                    errorId={errorId}
                    step={step}
                    onChange={(next) =>
                      onChange({
                        ...value,
                        steps: value.steps.map((item) =>
                          item.id === step.id ? next : item,
                        ),
                      })
                    }
                  />
                )}
              </div>
              {stepError && (
                <p id={errorId} class="validation-error" role="alert">
                  {stepError}
                </p>
              )}
            </article>
          );
        })}
      </div>
      {error && (
        <p class="validation-error" role="alert">
          {error}
        </p>
      )}
      <div class="export-card">
        <h3>Export</h3>
        <div class="export-fields">
          <label class="field">
            Format
            <select
              value={value.export.format}
              onChange={(event) => {
                const format = event.currentTarget.value;
                if (isExportFormat(format))
                  onChange({ ...value, export: newExport(format) });
              }}
            >
              {Object.entries(FORMAT_NAMES).map(([format, label]) => (
                <option value={format}>{label}</option>
              ))}
            </select>
          </label>
          {"bitrateKbps" in value.export && (
            <label class="field">
              Bitrate (kbps)
              <select
                value={value.export.bitrateKbps}
                onChange={(event) => {
                  const next = exportSchema.safeParse({
                    ...value.export,
                    bitrateKbps: Number(event.currentTarget.value),
                  });
                  if (next.success) onChange({ ...value, export: next.data });
                }}
              >
                {bitrates.map((bitrate) => (
                  <option value={bitrate}>{bitrate}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
    </section>
  );
}
