import { useId, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
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
    case "speech":
      return step.model === "standard" ? "Standard · GTCRN" : "Detailed · DeepFilterNet3";
    case "isolation":
      return step.keep === "voice" ? "Keep voice" : "Keep music";
    default: {
      const unreachable: never = step;
      return unreachable;
    }
  }
}
function DbControl({ label, value, min, max, errorId, onChange }: {
  label: string; value: number; min: number; max: number; errorId?: string;
  onChange: (value: number) => void;
}) {
  const sliderValue = Number.isFinite(value) ? Math.round(Math.max(min, Math.min(max, value)) * 10) / 10 : min;
  return <div class="db-control">
    <label class="field">{label}<input type="range" min={min} max={max} step="0.1"
      aria-label={`${label} slider`} aria-valuetext={`${sliderValue} dB`}
      value={sliderValue}
      onInput={event => onChange(event.currentTarget.valueAsNumber)} /></label>
    <label class="field">{label} precise<input type="number" min={min} max={max} step="any"
      aria-invalid={!!errorId} aria-describedby={errorId}
      value={Number.isFinite(value) ? value : ""}
      onInput={event => onChange(event.currentTarget.valueAsNumber)} /></label>
    <output>{Number.isFinite(value) ? value : "Unset"} dB · {min} to {max}</output>
    {label === "Gain (dB)" && value > 0 && <small class="file-error">May clip. Check the exported result.</small>}
  </div>;
}
function Choices<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly {value: T; label: string}[]; onChange: (value: T) => void;
}) {
  const name = useId();
  return <fieldset class="segmented"><legend>{label}</legend>{options.map(option =>
    <label><input type="radio" name={name} value={option.value} checked={value === option.value}
      onChange={() => onChange(option.value)} />{option.label}</label>)}</fieldset>;
}
function StepFields({
  step,
  onChange,
  errorId,
  duration,
}: {
  duration?: number;
  step: StepDraft;
  errorId?: string;
  onChange: (step: StepDraft) => void;
}) {
  switch (step.kind) {
    case "trim":
      return (
        <TrimFields
          errorId={errorId}
          duration={duration}
          scope="Batch timeline · longest file"
          range={step.range}
          prefix="Batch trim"
          onChange={(range) => onChange({ ...step, range })}
        />
      );
    case "gain":
      return <DbControl label="Gain (dB)" value={step.db} min={-12} max={12} errorId={errorId} onChange={db => onChange({...step, db})} />;
    case "normalize":
      return <DbControl label="Peak target (dBFS)" value={step.targetDbfs} min={-60} max={0} errorId={errorId} onChange={targetDbfs => onChange({...step, targetDbfs})} />;
    case "channels":
      return <Choices label="Channels" value={step.channels} options={[
        {value:"original",label:"Unchanged"}, {value:"mono",label:"Mono"}, {value:"stereo",label:"Stereo"}
      ]} onChange={channels => onChange({...step,channels})} />;
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
    case "speech":
      return <label class="field">Voice model
        <select value={step.model} onChange={event => {
          const next = stepSchema.safeParse({ ...step, model: event.currentTarget.value });
          if (next.success) onChange(next.data);
        }}>
          <option value="standard">Standard · GTCRN</option>
          <option value="detailed">Detailed · DeepFilterNet3</option>
        </select>
      </label>;
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
        <small class="panel-description">May take several minutes. Some voice, music or reverb may remain.</small>
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
  duration,
}: {
  duration?: number;
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
  const [announcement, setAnnouncement] = useState("");
  const [slot, setSlot] = useState<number | null>(null);
  type Gesture = {kind: "pressing"; id: string; pointer: number; timer: ReturnType<typeof setTimeout>}
    | {kind: "dragging"; id: string; pointer: number; slot: number};
  const gesture = useRef<Gesture | null>(null);
  const stopGesture = () => {
    if (gesture.current?.kind === "pressing") clearTimeout(gesture.current.timer);
    gesture.current = null;
    setSlot(null);
  };
  useEffect(() => stopGesture, []);
  const reorder = (from: number, to: number) => {
    const step = value.steps[from];
    if (!step || from === to) return;
    if (onChange(moveStep(value, from, to))) {
      moved.current = step.id;
      setAnnouncement(`${STEP_NAMES[step.kind]} moved to position ${to + 1} of ${value.steps.length}.`);
    }
  };
  const move = (index: number, direction: -1 | 1) => reorder(index, index + direction);
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
                (kind === "trim" || kind === "isolation" || kind === "speech") &&
                value.steps.some((step) => step.kind === kind)
              }
            >
              {label}
            </option>
          ))}
        </select>
      </div>
      <small id="reorder-help">Drag the grip, or hold it on touch. Up/Down also reorders.</small>
      <span class="sr-only" role="status" aria-live="polite">{announcement}</span>
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
              data-insertion={slot === index ? "before" : slot === value.steps.length && index === value.steps.length - 1 ? "after" : undefined}
            >
              <div class="step-heading">
                <button type="button" class="step-grip" aria-label={`Drag ${label}`}
                  aria-describedby="reorder-help"
                  onPointerDown={event => {
                    if (event.button !== 0 || event.currentTarget.disabled || gesture.current) return;
                    stopGesture();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const start = () => { gesture.current = {kind:"dragging", id:step.id, pointer:event.pointerId, slot:index}; setSlot(index); };
                    if (event.pointerType === "touch") {
                      gesture.current = {kind:"pressing", id:step.id, pointer:event.pointerId, timer:setTimeout(start,350)};
                    } else start();
                  }}
                  onPointerMove={event => {
                    const current = gesture.current;
                    if (current?.kind !== "dragging" || current.pointer !== event.pointerId) return;
                    const cards = [...(panel.current?.querySelectorAll<HTMLElement>(".recipe-step") ?? [])];
                    const next = cards.findIndex(card => {const box=card.getBoundingClientRect();return event.clientY < box.top + box.height / 2;});
                    current.slot = next < 0 ? cards.length : next;
                    setSlot(current.slot);
                  }}
                  onPointerUp={event => {
                    const current=gesture.current;
                    if (!current || current.pointer !== event.pointerId) return;
                    if (current?.kind === "dragging" && current.pointer === event.pointerId) {
                      const from=value.steps.findIndex(item=>item.id===current.id);
                      reorder(from, current.slot > from ? current.slot - 1 : current.slot);
                    }
                    stopGesture();
                  }}
                  onPointerCancel={event => {if (gesture.current?.pointer === event.pointerId) stopGesture();}}
                  onLostPointerCapture={event => {if (gesture.current?.pointer === event.pointerId) stopGesture();}}
                  onKeyDown={event=>{if(event.key==="Escape") stopGesture();}}
                >⋮⋮</button>
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
                    duration={duration}
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
