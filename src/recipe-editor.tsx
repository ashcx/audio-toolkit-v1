import type { ComponentChildren } from "preact";
import { useId, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import {
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
import { defaultEncodingMode, encodingModesFor } from "./encoding-modes";
import { levelDb } from "./levels";
import { useLevels } from "./use-levels";
import {
  LOUDNESS_MARKS,
  LOUDNESS_MAX,
  LOUDNESS_MIN,
  lufsFromPosition,
  positionForLufs,
  stepLufs,
} from "./loudness-rail";
import type { FileEntry } from "./media";
import { usableGpu, type GpuSupport } from "./inference/gpu";
import { validationMessage } from "./errors";
import { copy } from "./copy";
import { stepSummary } from "./step-summary";

/** The message and element id a step shows when its own settings are wrong, or undefined when they are fine. */
export function stepProblem(step: StepDraft): { id: string; message: string } | undefined {
  const parsed = stepSchema.safeParse(step);
  const message = parsed.success ? undefined : validationMessage(parsed.error.issues);
  return message ? { id: `error-${step.id}`, message } : undefined;
}
function IsolationNote() {
  const [gpu, setGpu] = useState<GpuSupport | null>(null);
  useEffect(() => {
    let current = true;
    void usableGpu().then(value => { if (current) setGpu(value); });
    return () => { current = false; };
  }, []);
  return <small class="panel-description" data-isolation-device={gpu === null ? "checking" : gpu.usable ? "gpu" : "cpu"}>
    {gpu && !gpu.usable && `${copy.splitter.slowDevice} `}
    {copy.splitter.hint}
  </small>;
}
function SourceLevels({ files, enabled }: {files: readonly FileEntry[]; enabled: boolean}) {
  const state = useLevels(files,enabled);
  if (!enabled) return null;
  return <div class="source-levels" aria-live="polite" aria-busy={state.kind === "loading"}>
    {state.kind === "idle" ? <small>{copy.levels.empty}</small>
      : state.kind === "loading" ? <small>{copy.levels.measuring}</small>
      : state.kind === "failed" ? <small class="file-error">{state.message}</small>
      : <>
        <div class="levels-heading">{copy.levels.heading}</div>
        <dl class="level-readout">
          <div><dt>{copy.levels.peak}</dt><dd>{copy.levels.value(levelDb(state.levels.peak))}<small>{copy.levels.unit}</small></dd></div>
          <div><dt>{copy.levels.average}</dt><dd>{copy.levels.value(levelDb(Math.sqrt(state.levels.squareSum / state.levels.samples)))}<small>{copy.levels.unit}</small></dd></div>
        </dl>
      </>}
  </div>;
}
function DbControl({ label, value, min, max, unit = copy.units.db, errorId, warning, onChange }: {
  label: string; value: number; min: number; max: number; unit?: string; errorId?: string; warning?: string;
  onChange: (value: number) => void;
}) {
  const sliderValue = Number.isFinite(value) ? Math.round(Math.max(min, Math.min(max, value)) * 10) / 10 : min;
  return <div class="db-control">
    <div class="parameter-heading"><span>{label}</span><output>{Number.isFinite(value) ? copy.number(value) : copy.unset} <small>{unit}</small></output></div>
    <input type="range" min={min} max={max} step="0.1" aria-invalid={!!errorId} aria-describedby={errorId}
      aria-label={copy.slider(label)} aria-valuetext={`${sliderValue} ${unit}`} value={sliderValue}
      onInput={event => onChange(event.currentTarget.valueAsNumber)} />
    <div class="parameter-scale"><span>{copy.number(min)} {unit}</span><span>{copy.number(max)} {unit}</span></div>
    {warning && <small class="file-error">{warning}</small>}
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
function LoudnessRail({ value, errorId, onChange }: {
  value: number; errorId?: string; onChange: (value: number) => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const marksId = useId();
  const current = Number.isFinite(value)
    ? Math.max(LOUDNESS_MIN, Math.min(LOUDNESS_MAX, value))
    : -14;
  const position = positionForLufs(current);
  const pointerValue = (clientX: number) => {
    const box = rail.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return current;
    return lufsFromPosition((clientX - box.left) / box.width);
  };
  return <div class="loudness-control">
    <div class="parameter-heading"><span>{copy.normalize.loudnessTarget}</span><output>{copy.number(current)} <small>{copy.units.lufs}</small></output></div>
    <div
      ref={rail}
      class="lufs-rail"
      role="slider"
      tabIndex={0}
      aria-label={copy.normalize.loudnessTarget}
      aria-orientation="horizontal"
      aria-valuemin={LOUDNESS_MIN}
      aria-valuemax={LOUDNESS_MAX}
      aria-valuenow={current}
      aria-valuetext={`${copy.number(current)} ${copy.units.lufs}`}
      aria-invalid={!!errorId}
      aria-describedby={[marksId, errorId].filter(Boolean).join(" ") || undefined}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange(pointerValue(event.clientX));
      }}
      onPointerMove={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        onChange(pointerValue(event.clientX));
      }}
      onPointerUp={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={event => {
        const steps =
          event.key === "ArrowRight" || event.key === "ArrowUp" ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1
              : event.key === "PageUp" ? 2
                : event.key === "PageDown" ? -2
                  : 0;
        if (steps) {
          event.preventDefault();
          onChange(stepLufs(current, steps));
        } else if (event.key === "Home") {
          event.preventDefault();
          onChange(LOUDNESS_MIN);
        } else if (event.key === "End") {
          event.preventDefault();
          onChange(LOUDNESS_MAX);
        }
      }}
    >
      <div class="lufs-track">
        <span class="lufs-fill" style={{ width: `${position * 100}%` }} />
        {LOUDNESS_MARKS.map(mark => (
          <span class="lufs-mark" style={{ left: `${positionForLufs(mark.value) * 100}%` }} />
        ))}
        <span class="lufs-thumb" style={{ left: `${position * 100}%` }} />
      </div>
    </div>
    <div class="lufs-marks" aria-hidden="true">
      {LOUDNESS_MARKS.map(mark => (
        <span class={`lufs-mark-label ${mark.kind}`}>
          <b>{copy.normalize.markValue(mark.value)}</b> {mark.label}
        </span>
      ))}
    </div>
    <p id={marksId} class="sr-only">{copy.normalize.marksDescription(LOUDNESS_MARKS)}</p>
  </div>;
}
function StepFields({
  step,
  onChange,
  errorId,
  duration,
  files,
  analysisEnabled,
}: {
  files: readonly FileEntry[];
  analysisEnabled: boolean;
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
          scope={copy.trim.hint}
          range={step.range}
          prefix={copy.trim.prefix}
          onChange={(range) => onChange({ ...step, range })}
        />
      );
    case "gain":
      return <><SourceLevels files={files} enabled={analysisEnabled} /><DbControl label={copy.gain.label} value={step.db} min={-12} max={12} errorId={errorId}
        warning={step.db > 0 ? copy.gain.warning : undefined} onChange={db => onChange({...step, db})} /></>;
    case "normalize": {
      const mode = step.mode ?? "peak";
      const targetLufs = step.targetLufs ?? -14;
      const ceilingDbtp = step.ceilingDbtp ?? -0.3;
      const targetDbtp = step.targetDbtp ?? -0.3;
      const legacyDbfs = step.targetDbfs;
      return <>
        <SourceLevels files={files} enabled={analysisEnabled} />
        <Choices label={copy.normalize.modeLegend} value={mode} options={[
          { value: "loudness", label: copy.normalize.modes.loudness }, { value: "peak", label: copy.normalize.modes.peak },
        ]} onChange={next => onChange(next === "loudness"
          ? { id: step.id, kind: "normalize", mode: "loudness", targetLufs, ceilingDbtp }
          : { id: step.id, kind: "normalize", mode: "peak", targetDbtp })} />
        {mode === "loudness" ? <>
          <LoudnessRail value={targetLufs} errorId={errorId} onChange={targetLufs =>
            onChange({ id: step.id, kind: "normalize", mode: "loudness", targetLufs, ceilingDbtp })} />
          <DbControl label={copy.normalize.ceiling} value={ceilingDbtp} min={-6} max={0} unit={copy.units.dbtp} errorId={errorId}
            onChange={ceilingDbtp => onChange({ id: step.id, kind: "normalize", mode: "loudness", targetLufs, ceilingDbtp })} />
          <small class="panel-description">{copy.normalize.loudnessExplainer}</small>
        </> : legacyDbfs !== undefined ? <>
          <DbControl label={copy.normalize.legacyPeakTarget} value={legacyDbfs} min={-60} max={0} unit={copy.units.dbfs} errorId={errorId}
            onChange={targetDbfs => onChange({ id: step.id, kind: "normalize", mode: "peak", targetDbfs })} />
          <button type="button" class="text-button"
            onClick={() => onChange({ id: step.id, kind: "normalize", mode: "peak", targetDbtp })}>{copy.normalize.useTruePeak}</button>
        </> : <>
          <DbControl label={copy.normalize.peakTarget} value={targetDbtp} min={-6} max={0} unit={copy.units.dbtp} errorId={errorId}
            onChange={targetDbtp => onChange({ id: step.id, kind: "normalize", mode: "peak", targetDbtp })} />
          <small class="panel-description">{copy.normalize.peakExplainer}</small>
        </>}
      </>;
    }
    case "compress":
      return <>
        <div class="compressor-control">
          <div class="parameter-heading"><span>{copy.compressor.amount}</span><output>{step.amount} <small>{copy.units.percent}</small></output></div>
          <input type="range" min="0" max="100" step="1" value={step.amount}
            aria-label={copy.compressor.amountLabel} aria-valuetext={`${step.amount}${copy.units.percent}`}
            onInput={event => onChange({ ...step, amount: event.currentTarget.valueAsNumber })} />
          <div class="parameter-scale"><span>{copy.compressor.gentle}</span><span>{copy.compressor.strong}</span></div>
        </div>
        <label class="field">
          {copy.compressor.preset}
          <select value={step.preset} onChange={event => {
            const next = stepSchema.safeParse({ ...step, preset: event.currentTarget.value });
            if (next.success) onChange(next.data);
          }}>
            <option value="speech">{copy.compressor.presets.speech}</option>
            <option value="music">{copy.compressor.presets.music}</option>
          </select>
        </label>
        <small class="panel-description">{copy.compressor.hint}</small>
      </>;
    case "channels":
      return <Choices label={copy.channels.label} value={step.channels} options={[
        {value:"original",label:copy.channels.options.original}, {value:"mono",label:copy.channels.options.mono}, {value:"stereo",label:copy.channels.options.stereo}
      ]} onChange={channels => onChange({...step,channels})} />;
    case "resample":
      return (
        <label class="field">
          {copy.sampleRate.label}
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
            <option value="original">{copy.sampleRate.keep}</option>
            {[44100, 48000, 32000, 24000, 16000].map((rate) => (
              <option value={rate}>{copy.sampleRate.summary(rate)}</option>
            ))}
          </select>
        </label>
      );
    case "speech":
      return <>
        <label class="field">{copy.noise.label}
          <select value={step.model} onChange={event => {
            const next = stepSchema.safeParse({ ...step, model: event.currentTarget.value });
            if (next.success) onChange(next.data);
          }}>
            <option value="standard">{copy.noise.options.standard}</option>
            <option value="detailed">{copy.noise.options.detailed}</option>
          </select>
        </label>
        <small class="panel-description">{copy.noise.hint}</small>
      </>;
    case "isolation":
      return (
        <>
        <label class="field">
          {copy.splitter.label}
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
            <option value="voice">{copy.splitter.options.voice}</option>
            <option value="music">{copy.splitter.options.music}</option>
          </select>
        </label>
        <IsolationNote />
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
  files,
  analysisEnabled,
}: {
  files: readonly FileEntry[];
  analysisEnabled: boolean;
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
      setAnnouncement(copy.steps.moved(copy.steps.names[step.kind], to + 1, value.steps.length));
    }
  };
  const move = (index: number, direction: -1 | 1) => reorder(index, index + direction);
  const addControl = useRef<HTMLSelectElement>(null);
  return (
    <section
      ref={panel}
      class="panel recipe-panel"
      aria-labelledby="recipe-title"
    >
      <div class="panel-heading">
        <h2 id="recipe-title">{copy.steps.heading}</h2>
        <select
          ref={addControl}
          aria-label={copy.steps.addStep}
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
            {copy.steps.addStep}
          </option>
          {Object.entries(copy.steps.names).map(([kind, label]) => (
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
      <small id="reorder-help" class="sr-only">{copy.steps.reorderHelp}</small>
      <span class="sr-only" role="status" aria-live="polite">{announcement}</span>
      {value.steps.length === 0
        ? <p class="panel-description steps-empty">{copy.steps.empty}</p>
        : <small class="panel-description steps-hint">{copy.steps.hint}</small>}
      <div class="recipe-steps">
        {value.steps.map((step, index) => {
          const problem = stepProblem(step);
          const stepError = problem?.message;
          const errorId = problem?.id;
          const repeated =
            value.steps.filter((item) => item.kind === step.kind).length > 1;
          const ordinal = value.steps
            .slice(0, index + 1)
            .filter((item) => item.kind === step.kind).length;
          const label = `${copy.steps.names[step.kind]}${repeated ? ` ${ordinal}` : ""}`;
          return (
            <article
              class="recipe-step"
              aria-label={copy.steps.names[step.kind]}
              key={step.id}
              data-step-id={step.id}
              data-insertion={slot === index ? "before" : slot === value.steps.length && index === value.steps.length - 1 ? "after" : undefined}
            >
              <div class="step-heading">
                <button type="button" class="step-grip" aria-label={copy.steps.drag(label)}
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
                  onKeyDown={event=>{
                    if(event.key === "Escape") stopGesture();
                    if(event.key === "ArrowUp" && index > 0) {event.preventDefault();move(index,-1);}
                    if(event.key === "ArrowDown" && index < value.steps.length - 1) {event.preventDefault();move(index,1);}
                  }}
                >⋮⋮</button>
                <h3>
                  <button
                    class="step-toggle"
                    type="button"
                    aria-label={copy.steps.settings(label)}
                    aria-describedby={`summary-${step.id}${errorId ? ` ${errorId}` : ""}`}
                    aria-expanded={expanded === step.id}
                    aria-controls={`settings-${step.id}`}
                    onClick={() =>
                      setExpanded(expanded === step.id ? null : step.id)
                    }
                  >
                    <span class="step-title">{copy.steps.names[step.kind]}<span class="expansion-indicator" aria-hidden="true">{expanded === step.id ? "⌃" : "⌄"}</span></span>
                    <small id={`summary-${step.id}`}>{stepSummary(step)}</small>
                  </button>
                </h3>
                <details class="step-menu" onKeyDown={event=>{
                  if(event.key === "Escape") { event.currentTarget.open=false; event.currentTarget.querySelector<HTMLElement>("summary")?.focus(); }
                }}>
                  <summary role="button" aria-label={copy.steps.moreActions(label)}>⋯</summary>
                  <div class="step-actions">
                  <button
                    type="button"
                    aria-label={copy.steps.moveStepUp(label)}
                    disabled={index === 0}
                    onClick={event => {event.currentTarget.closest("details")?.removeAttribute("open");move(index,-1);}}
                  >
                    {copy.steps.moveUp}
                  </button>
                  <button
                    type="button"
                    aria-label={copy.steps.moveStepDown(label)}
                    disabled={index === value.steps.length - 1}
                    onClick={event => {event.currentTarget.closest("details")?.removeAttribute("open");move(index,1);}}
                  >
                    {copy.steps.moveDown}
                  </button>
                  <button
                    type="button"
                    aria-label={copy.steps.removeStep(label)}
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
                    {copy.steps.remove}
                  </button>
                  </div>
                </details>
              </div>
              <div
                id={`settings-${step.id}`}
                class="step-settings"
                hidden={expanded !== step.id}
              >
                {expanded === step.id && (
                  <StepFields
                    files={files}
                    analysisEnabled={analysisEnabled}
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

    </section>
  );
}

export function ExportEditor({value,onChange,disabled,children}: {
  value: RecipeDraft;
  onChange: (value: RecipeDraft, explicitFormat?: boolean) => boolean;
  disabled: boolean;
  children: ComponentChildren;
}) {
  const format = value.export.format;
  const modes = encodingModesFor(format);
  const mode = "mode" in value.export ? value.export.mode ?? defaultEncodingMode(format) : defaultEncodingMode(format);
  const bitrates =
    format === "mp3"
      ? [128, 192, 256, 320]
      : format === "m4a"
        ? [128, 192, 256]
        : format === "opus"
          ? [64, 96, 128, 160, 192]
          : [];
  return (
      <section class="panel export-panel" aria-labelledby="export-title">
      <h2 id="export-title">{copy.export.heading}</h2>
      <fieldset class="export-lock" disabled={disabled}>

        <div class={`export-fields${modes.length > 1 ? " has-mode" : ""}`}>
          <label class="field">
            {copy.export.formatLabel}
            <select
              value={format}
              onChange={(event) => {
                const nextFormat = event.currentTarget.value;
                if (isExportFormat(nextFormat))
                  onChange({ ...value, export: newExport(nextFormat) }, true);
              }}
            >
              {Object.entries(copy.export.formats).map(([option, label]) => (
                <option value={option}>{label}</option>
              ))}
            </select>
          </label>
          {modes.length > 1 && (
            <label class="field">
              {copy.export.modeLabel}
              <select
                value={mode}
                onChange={(event) => {
                  const next = exportSchema.safeParse({
                    ...value.export,
                    mode: event.currentTarget.value,
                  });
                  if (next.success) onChange({ ...value, export: next.data });
                }}
              >
                {modes.map(option => <option value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}
          {"bitrateKbps" in value.export && (
            <label class="field">
              {copy.export.bitrateLabel}
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
      </fieldset>
      {format === "original" && <p class="panel-description">{copy.export.keepOriginalHint}</p>}
      {children}
    </section>
  );
}
