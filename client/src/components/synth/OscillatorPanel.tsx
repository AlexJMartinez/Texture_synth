import { useState, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { WavetableSelector } from "./WavetableSelector";
import type { Oscillator, WaveformType, ModRatioPreset, PitchState, PitchModeType, EnvelopeCurve } from "@shared/schema";
import { Waves } from "./WaveformIcons";
import { ChevronDown, ChevronRight, Radio, Zap, Timer, Shuffle, Volume2, Layers } from "lucide-react";
import type { AdvancedFMSettings, FMAlgorithm } from "@/lib/advancedSynthSettings";
import type { OscWavetableSettings } from "@/lib/wavetableSettings";

export interface OscEnvelope {
  enabled: boolean;
  attack: number;
  hold: number;
  decay: number;
  curve: EnvelopeCurve;
}

export interface OscEnvelopes {
  osc1: OscEnvelope;
  osc2: OscEnvelope;
  osc3: OscEnvelope;
}
import {
  pitchToHz,
  getKnobValue,
  getKnobConfig,
  handlePitchKnobChange,
  normalizePitch,
  PITCH_RANGES,
  clamp,
} from "@/lib/pitchUtils";

function randomizePitch(): PitchState {
  const randomSt = Math.random() * 48 - 24;
  return {
    mode: "hz",
    baseHz: 440,
    st: randomSt,
    cents: 0,
  };
}

function randomizeOscillator(): Partial<Oscillator> {
  const waveforms: WaveformType[] = ["sine", "triangle", "sawtooth", "square"];
  return {
    waveform: waveforms[Math.floor(Math.random() * waveforms.length)],
    pitch: randomizePitch(),
    detune: Math.floor(Math.random() * 60 - 30),
    drift: Math.floor(Math.random() * 40),
    level: Math.floor(50 + Math.random() * 50),
    fmEnabled: Math.random() > 0.5,
    fmRatio: [0.5, 1, 2, 3, 4, 6, 8][Math.floor(Math.random() * 7)],
    fmDepth: Math.floor(Math.random() * 500),
    fmFeedback: Math.random() * 0.5,
    amEnabled: Math.random() > 0.7,
    amRatio: [0.5, 1, 2, 3, 4][Math.floor(Math.random() * 5)],
    amDepth: Math.floor(Math.random() * 80),
    indexEnvEnabled: Math.random() > 0.5,
    indexEnvDecay: Math.floor(5 + Math.random() * 50),
    indexEnvDepth: Math.floor(Math.random() * 40),
  };
}

interface OscillatorPanelProps {
  oscillator: Oscillator;
  onChange: (oscillator: Oscillator) => void;
  title: string;
  index: number;
  envelope?: OscEnvelope;
  onEnvelopeChange?: (envelope: OscEnvelope) => void;
  advancedFM?: AdvancedFMSettings;
  onAdvancedFMChange?: (settings: AdvancedFMSettings) => void;
  wavetableSettings?: OscWavetableSettings;
  onWavetableChange?: (settings: OscWavetableSettings) => void;
  onOpenWavetableEditor?: () => void;
  onImportWavetable?: () => void;
}

export function OscillatorPanel({ 
  oscillator, 
  onChange, 
  title, 
  index, 
  envelope, 
  onEnvelopeChange, 
  advancedFM, 
  onAdvancedFMChange,
  wavetableSettings,
  onWavetableChange,
  onOpenWavetableEditor,
  onImportWavetable
}: OscillatorPanelProps) {
  const pitch = normalizePitch(oscillator.pitch);
  const [fmOpen, setFmOpen] = useState(oscillator.fmEnabled);
  const [fmAdvancedOpen, setFmAdvancedOpen] = useState(false);
  const [amOpen, setAmOpen] = useState(oscillator.amEnabled);
  const [indexEnvOpen, setIndexEnvOpen] = useState(oscillator.indexEnvEnabled);
  const [oscEnvOpen, setOscEnvOpen] = useState(envelope?.enabled ?? false);
  const [wavetableOpen, setWavetableOpen] = useState(wavetableSettings?.enabled ?? false);

  const updateEnvelope = <K extends keyof OscEnvelope>(key: K, value: OscEnvelope[K]) => {
    if (envelope && onEnvelopeChange) {
      onEnvelopeChange({ ...envelope, [key]: value });
    }
  };
  const prevStRef = useRef(pitch.st);
  
  const updateOscillator = <K extends keyof Oscillator>(
    key: K,
    value: Oscillator[K]
  ) => {
    onChange({ ...oscillator, [key]: value });
  };

  const handleRandomize = () => {
    onChange({ ...oscillator, ...randomizeOscillator() });
  };

  const handlePitchModeChange = (mode: PitchModeType) => {
    updateOscillator("pitch", { ...pitch, mode });
  };

  const onPitchKnobChange = (value: number) => {
    const newPitch = handlePitchKnobChange(pitch, value, prevStRef.current);
    prevStRef.current = newPitch.st;
    updateOscillator("pitch", newPitch);
  };

  const onCentsChange = (value: number) => {
    updateOscillator("pitch", { ...pitch, cents: clamp(value, -100, 100) });
  };

  const pitchConfig = getKnobConfig(pitch.mode);
  const pitchKnobValue = getKnobValue(pitch);

  return (
    <CollapsiblePanel
      title={title}
      icon={<Waves className="w-3 h-3 text-accent" />}
      defaultOpen={oscillator.enabled}
      data-testid={`panel-oscillator-${index}`}
      className={`transition-opacity ${!oscillator.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRandomize}
            data-testid={`btn-randomize-osc-${index}`}
          >
            <Shuffle className="w-3 h-3" />
          </Button>
          <Switch
            checked={oscillator.enabled}
            onCheckedChange={(v) => updateOscillator("enabled", v)}
            className="scale-75"
            data-testid={`switch-osc-${index}`}
          />
        </div>
      }
    >
      <div className="space-y-1.5">
        <Select
          value={oscillator.waveform}
          onValueChange={(v) => updateOscillator("waveform", v as WaveformType)}
          disabled={!oscillator.enabled}
        >
          <SelectTrigger className="h-5 text-[10px]" data-testid={`select-waveform-${index}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sine">Sine</SelectItem>
            <SelectItem value="triangle">Triangle</SelectItem>
            <SelectItem value="sawtooth">Sawtooth</SelectItem>
            <SelectItem value="square">Square</SelectItem>
            <SelectItem value="noise">Noise</SelectItem>
          </SelectContent>
        </Select>

        {wavetableSettings && onWavetableChange && (
          <div className={`rounded border border-border/50 p-1.5 transition-opacity ${wavetableSettings.enabled ? 'bg-cyan-500/5 border-cyan-500/30' : 'opacity-60 bg-muted/10'}`}>
            <WavetableSelector
              settings={wavetableSettings}
              onChange={onWavetableChange}
              onOpenEditor={onOpenWavetableEditor}
              onImport={onImportWavetable}
              disabled={!oscillator.enabled}
              oscIndex={index}
            />
          </div>
        )}

        <div className={`rounded border border-border/50 transition-opacity ${!oscillator.fmEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setFmOpen(!fmOpen)}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {fmOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              <Radio className="w-2.5 h-2.5 text-primary" />
              FM
            </button>
            <Switch
              checked={oscillator.fmEnabled}
              onCheckedChange={(v) => updateOscillator("fmEnabled", v)}
              className="scale-50"
              data-testid={`switch-fm-${index}`}
            />
          </div>
          {fmOpen && (
            <div className="px-1.5 pb-1.5 space-y-1">
              <Select
                value={oscillator.fmWaveform}
                onValueChange={(v) => updateOscillator("fmWaveform", v as WaveformType)}
                disabled={!oscillator.fmEnabled}
              >
                <SelectTrigger className="h-5 text-[10px]" data-testid={`select-fm-waveform-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sine">Sine</SelectItem>
                  <SelectItem value="triangle">Triangle</SelectItem>
                  <SelectItem value="sawtooth">Sawtooth</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={oscillator.fmRatioPreset}
                onValueChange={(v) => {
                  const preset = v as ModRatioPreset;
                  if (preset !== "custom") {
                    updateOscillator("fmRatio", parseFloat(preset));
                  }
                  updateOscillator("fmRatioPreset", preset);
                }}
                disabled={!oscillator.fmEnabled}
              >
                <SelectTrigger className="h-5 text-[10px]" data-testid={`select-fm-ratio-${index}`}>
                  <SelectValue placeholder="Ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                  <SelectItem value="6">6x</SelectItem>
                  <SelectItem value="8">8x</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-center gap-1">
                {oscillator.fmRatioPreset === "custom" && (
                  <Knob
                    value={oscillator.fmRatio}
                    min={0.25}
                    max={16}
                    step={0.25}
                    label="Ratio"
                    onChange={(v) => updateOscillator("fmRatio", v)}
                    accentColor="primary"
                    size="xs"
                  />
                )}
                <Knob
                  value={oscillator.fmDepth}
                  min={0}
                  max={1000}
                  step={10}
                  label="Depth"
                  unit="Hz"
                  onChange={(v) => updateOscillator("fmDepth", v)}
                  accentColor="accent"
                  size="xs"
                  modulationPath={`oscillators.osc${index}.fmDepth`}
                />
                <Knob
                  value={oscillator.fmFeedback * 100}
                  min={0}
                  max={100}
                  step={1}
                  label="FB"
                  unit="%"
                  onChange={(v) => updateOscillator("fmFeedback", v / 100)}
                  accentColor="primary"
                  size="xs"
                />
              </div>
              
              {/* Advanced FM Section */}
              {advancedFM && onAdvancedFMChange && (
                <div className="border-t border-border/30 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setFmAdvancedOpen(!fmAdvancedOpen)}
                    className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover-elevate w-full rounded px-1 py-0.5"
                    data-testid={`button-fm-advanced-toggle-${index}`}
                  >
                    {fmAdvancedOpen ? <ChevronDown className="w-2 h-2" /> : <ChevronRight className="w-2 h-2" />}
                    <Layers className="w-2 h-2" />
                    <span>Advanced</span>
                  </button>
                  
                  {fmAdvancedOpen && (
                    <div className="space-y-1 mt-1">
                      {/* Carrier Waveform - FM mode bypasses main osc waveform */}
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground shrink-0">Carrier</span>
                        <Select
                          value={advancedFM.carrierWaveform || "sine"}
                          onValueChange={(v) => onAdvancedFMChange({ ...advancedFM, carrierWaveform: v as "sine" | "triangle" | "sawtooth" | "square" })}
                          disabled={!oscillator.fmEnabled}
                        >
                          <SelectTrigger className="h-5 text-[9px] flex-1" data-testid={`select-fm-carrier-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sine">Sine</SelectItem>
                            <SelectItem value="triangle">Triangle</SelectItem>
                            <SelectItem value="sawtooth">Saw</SelectItem>
                            <SelectItem value="square">Square</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Algorithm Selector */}
                      <Select
                        value={advancedFM.algorithm}
                        onValueChange={(v) => onAdvancedFMChange({ ...advancedFM, algorithm: v as FMAlgorithm })}
                        disabled={!oscillator.fmEnabled}
                      >
                        <SelectTrigger className="h-5 text-[9px]" data-testid={`select-fm-algorithm-${index}`}>
                          <SelectValue placeholder="Algorithm" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="series">Series (Op2→Op1→C)</SelectItem>
                          <SelectItem value="parallel">Parallel (Op1+Op2→C)</SelectItem>
                          <SelectItem value="feedback">Cross-Mod (Op1↔Op2)</SelectItem>
                          <SelectItem value="mixed">Mixed (Both→C)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Op1 Fine Tune */}
                      <div className="flex justify-center gap-1">
                        <Knob
                          value={advancedFM.operator1Detune}
                          min={-100}
                          max={100}
                          step={1}
                          label="Op1 Dt"
                          unit="¢"
                          onChange={(v) => onAdvancedFMChange({ ...advancedFM, operator1Detune: v })}
                          size="xs"
                        />
                      </div>
                      
                      {/* Operator 2 */}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] text-muted-foreground">Op2</span>
                        <Switch
                          checked={advancedFM.operator2.enabled}
                          onCheckedChange={(v) => onAdvancedFMChange({
                            ...advancedFM,
                            operator2: { ...advancedFM.operator2, enabled: v }
                          })}
                          className="scale-50"
                          data-testid={`switch-fm-op2-${index}`}
                        />
                      </div>
                      
                      {advancedFM.operator2.enabled && (
                        <div className="space-y-1 pl-1 border-l border-primary/30">
                          <Select
                            value={advancedFM.operator2.waveform}
                            onValueChange={(v) => onAdvancedFMChange({
                              ...advancedFM,
                              operator2: { ...advancedFM.operator2, waveform: v as "sine" | "triangle" | "sawtooth" | "square" }
                            })}
                          >
                            <SelectTrigger className="h-5 text-[9px]" data-testid={`select-fm-op2-wave-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sine">Sine</SelectItem>
                              <SelectItem value="triangle">Triangle</SelectItem>
                              <SelectItem value="sawtooth">Saw</SelectItem>
                              <SelectItem value="square">Square</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex justify-center gap-1">
                            <Knob
                              value={advancedFM.operator2.ratio}
                              min={0.25}
                              max={16}
                              step={0.25}
                              label="Ratio"
                              onChange={(v) => onAdvancedFMChange({
                                ...advancedFM,
                                operator2: { ...advancedFM.operator2, ratio: v }
                              })}
                              size="xs"
                            />
                            <Knob
                              value={advancedFM.operator2.ratioDetune}
                              min={-100}
                              max={100}
                              step={1}
                              label="Dt"
                              unit="¢"
                              onChange={(v) => onAdvancedFMChange({
                                ...advancedFM,
                                operator2: { ...advancedFM.operator2, ratioDetune: v }
                              })}
                              size="xs"
                            />
                          </div>
                          <div className="flex justify-center gap-1">
                            <Knob
                              value={advancedFM.operator2.depth}
                              min={0}
                              max={1000}
                              step={10}
                              label="Index"
                              onChange={(v) => onAdvancedFMChange({
                                ...advancedFM,
                                operator2: { ...advancedFM.operator2, depth: v }
                              })}
                              accentColor="accent"
                              size="xs"
                            />
                            <Knob
                              value={advancedFM.operator2.feedback * 100}
                              min={0}
                              max={100}
                              step={1}
                              label="FB"
                              unit="%"
                              onChange={(v) => onAdvancedFMChange({
                                ...advancedFM,
                                operator2: { ...advancedFM.operator2, feedback: v / 100 }
                              })}
                              size="xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`rounded border border-border/50 transition-opacity ${!oscillator.indexEnvEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setIndexEnvOpen(!indexEnvOpen)}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {indexEnvOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              <Timer className="w-2.5 h-2.5 text-orange-400" />
              Idx Env
            </button>
            <Switch
              checked={oscillator.indexEnvEnabled}
              onCheckedChange={(v) => updateOscillator("indexEnvEnabled", v)}
              className="scale-50"
              data-testid={`switch-index-env-${index}`}
            />
          </div>
          {indexEnvOpen && (
            <div className="px-1.5 pb-1.5">
              <div className="flex justify-center gap-1">
                <Knob
                  value={oscillator.indexEnvDecay}
                  min={2}
                  max={100}
                  step={1}
                  label="Decay"
                  unit="ms"
                  onChange={(v) => updateOscillator("indexEnvDecay", v)}
                  accentColor="primary"
                  size="xs"
                />
                <Knob
                  value={oscillator.indexEnvDepth}
                  min={0}
                  max={60}
                  step={1}
                  label="Depth"
                  onChange={(v) => updateOscillator("indexEnvDepth", v)}
                  accentColor="primary"
                  size="xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className={`rounded border border-border/50 transition-opacity ${!oscillator.amEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setAmOpen(!amOpen)}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {amOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              <Zap className="w-2.5 h-2.5 text-accent" />
              AM
            </button>
            <Switch
              checked={oscillator.amEnabled}
              onCheckedChange={(v) => updateOscillator("amEnabled", v)}
              className="scale-50"
              data-testid={`switch-am-${index}`}
            />
          </div>
          {amOpen && (
            <div className="px-1.5 pb-1.5 space-y-1">
              <Select
                value={oscillator.amWaveform}
                onValueChange={(v) => updateOscillator("amWaveform", v as WaveformType)}
                disabled={!oscillator.amEnabled}
              >
                <SelectTrigger className="h-5 text-[10px]" data-testid={`select-am-waveform-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sine">Sine</SelectItem>
                  <SelectItem value="triangle">Triangle</SelectItem>
                  <SelectItem value="sawtooth">Sawtooth</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-center gap-1">
                <Knob
                  value={oscillator.amRatio}
                  min={0.25}
                  max={16}
                  step={0.25}
                  label="Ratio"
                  onChange={(v) => updateOscillator("amRatio", v)}
                  accentColor="accent"
                  size="xs"
                />
                <Knob
                  value={oscillator.amDepth}
                  min={0}
                  max={100}
                  step={1}
                  label="Depth"
                  unit="%"
                  onChange={(v) => updateOscillator("amDepth", v)}
                  accentColor="primary"
                  size="xs"
                />
              </div>
            </div>
          )}
        </div>

        {envelope && onEnvelopeChange && (
          <div className={`rounded border border-border/50 transition-opacity ${!envelope.enabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
            <div className="flex items-center justify-between px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => setOscEnvOpen(!oscEnvOpen)}
                className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {oscEnvOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                <Volume2 className="w-2.5 h-2.5 text-primary" />
                AHD
              </button>
              <Switch
                checked={envelope.enabled}
                onCheckedChange={(v) => updateEnvelope("enabled", v)}
                className="scale-50"
                data-testid={`switch-osc-env-${index}`}
              />
            </div>
            {oscEnvOpen && (
              <div className="px-1.5 pb-1.5 space-y-1">
                <div className="flex justify-center gap-1">
                  <Knob
                    value={envelope.attack}
                    min={0}
                    max={2000}
                    step={1}
                    label="A"
                    unit="ms"
                    onChange={(v) => updateEnvelope("attack", v)}
                    accentColor="primary"
                    size="xs"
                    logarithmic
                    defaultValue={0}
                  />
                  <Knob
                    value={envelope.hold}
                    min={0}
                    max={2000}
                    step={1}
                    label="H"
                    unit="ms"
                    onChange={(v) => updateEnvelope("hold", v)}
                    size="xs"
                    defaultValue={0}
                  />
                  <Knob
                    value={envelope.decay}
                    min={0}
                    max={5000}
                    step={1}
                    label="D"
                    unit="ms"
                    onChange={(v) => updateEnvelope("decay", v)}
                    accentColor="accent"
                    size="xs"
                    logarithmic
                    defaultValue={200}
                  />
                </div>
                <Select
                  value={envelope.curve}
                  onValueChange={(v) => updateEnvelope("curve", v as EnvelopeCurve)}
                  disabled={!envelope.enabled}
                >
                  <SelectTrigger className="h-5 text-[10px]" data-testid={`select-osc-env-curve-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="exponential">Exp</SelectItem>
                    <SelectItem value="logarithmic">Log</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 mb-1">
          <span className="text-[9px] text-muted-foreground">Pitch:</span>
          <div className="flex gap-0.5">
            {(["hz", "st", "oct"] as PitchModeType[]).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={pitch.mode === mode ? "default" : "ghost"}
                onClick={() => handlePitchModeChange(mode)}
                className="text-[8px] px-1.5 py-0"
                data-testid={`btn-pitch-mode-${mode}-${index}`}
              >
                {mode === "hz" ? "Hz" : mode === "st" ? "ST" : "Oct"}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-1">
          <Knob
            value={pitchKnobValue}
            min={pitchConfig.min}
            max={pitchConfig.max}
            step={pitchConfig.step}
            label="Pitch"
            unit={pitch.mode === "hz" ? "Hz" : pitch.mode === "st" ? "st" : "oct"}
            onChange={onPitchKnobChange}
            logarithmic={pitchConfig.logarithmic}
            accentColor="accent"
            size="xs"
          />
          <Knob
            value={pitch.cents}
            min={-100}
            max={100}
            step={1}
            label="Cents"
            unit="ct"
            onChange={onCentsChange}
            size="xs"
          />
          <Knob
            value={oscillator.detune}
            min={-100}
            max={100}
            step={1}
            label="Det"
            unit="ct"
            onChange={(v) => updateOscillator("detune", v)}
            size="xs"
            modulationPath={`oscillators.osc${index}.detune`}
          />
          <Knob
            value={oscillator.drift}
            min={0}
            max={100}
            step={1}
            label="Dft"
            unit="%"
            onChange={(v) => updateOscillator("drift", v)}
            size="xs"
          />
          <Knob
            value={oscillator.level}
            min={0}
            max={100}
            step={1}
            label="Lvl"
            unit="%"
            onChange={(v) => updateOscillator("level", v)}
            accentColor="primary"
            size="xs"
            modulationPath={`oscillators.osc${index}.level`}
          />
        </div>
      </div>
    </CollapsiblePanel>
  );
}
