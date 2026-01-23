import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Oscillator, WaveformType, ModRatioPreset } from "@shared/schema";
import { Waves } from "./WaveformIcons";
import { ChevronDown, ChevronRight, Radio, Zap, CircleDot, Timer } from "lucide-react";

interface OscillatorPanelProps {
  oscillator: Oscillator;
  onChange: (oscillator: Oscillator) => void;
  title: string;
  index: number;
}

export function OscillatorPanel({ oscillator, onChange, title, index }: OscillatorPanelProps) {
  const [fmOpen, setFmOpen] = useState(oscillator.fmEnabled);
  const [amOpen, setAmOpen] = useState(oscillator.amEnabled);
  const [pmOpen, setPmOpen] = useState(oscillator.pmEnabled);
  const [indexEnvOpen, setIndexEnvOpen] = useState(oscillator.indexEnvEnabled);
  
  const updateOscillator = <K extends keyof Oscillator>(
    key: K,
    value: Oscillator[K]
  ) => {
    onChange({ ...oscillator, [key]: value });
  };

  return (
    <CollapsiblePanel
      title={title}
      icon={<Waves className="w-3 h-3 text-accent" />}
      defaultOpen={oscillator.enabled}
      data-testid={`panel-oscillator-${index}`}
      className={`transition-opacity ${!oscillator.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={oscillator.enabled}
          onCheckedChange={(v) => updateOscillator("enabled", v)}
          className="scale-75"
          data-testid={`switch-osc-${index}`}
        />
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

        <div className="flex justify-center gap-1">
          <Knob
            value={oscillator.pitch}
            min={20}
            max={20000}
            step={1}
            label="Pitch"
            unit="Hz"
            onChange={(v) => updateOscillator("pitch", v)}
            logarithmic
            accentColor="accent"
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
          />
        </div>

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

        <div className={`rounded border border-border/50 transition-opacity ${!oscillator.pmEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setPmOpen(!pmOpen)}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {pmOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              <CircleDot className="w-2.5 h-2.5 text-cyan-400" />
              PM
            </button>
            <Switch
              checked={oscillator.pmEnabled}
              onCheckedChange={(v) => updateOscillator("pmEnabled", v)}
              className="scale-50"
              data-testid={`switch-pm-${index}`}
            />
          </div>
          {pmOpen && (
            <div className="px-1.5 pb-1.5 space-y-1">
              <Select
                value={oscillator.pmWaveform}
                onValueChange={(v) => updateOscillator("pmWaveform", v as WaveformType)}
                disabled={!oscillator.pmEnabled}
              >
                <SelectTrigger className="h-5 text-[10px]" data-testid={`select-pm-waveform-${index}`}>
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
                value={oscillator.pmRatioPreset}
                onValueChange={(v) => {
                  const preset = v as ModRatioPreset;
                  if (preset !== "custom") {
                    updateOscillator("pmRatio", parseFloat(preset));
                  }
                  updateOscillator("pmRatioPreset", preset);
                }}
                disabled={!oscillator.pmEnabled}
              >
                <SelectTrigger className="h-5 text-[10px]" data-testid={`select-pm-ratio-${index}`}>
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
                {oscillator.pmRatioPreset === "custom" && (
                  <Knob
                    value={oscillator.pmRatio}
                    min={0.25}
                    max={16}
                    step={0.25}
                    label="Ratio"
                    onChange={(v) => updateOscillator("pmRatio", v)}
                    accentColor="cyan"
                    size="xs"
                  />
                )}
                <Knob
                  value={oscillator.pmDepth}
                  min={0}
                  max={60}
                  step={1}
                  label="Index"
                  onChange={(v) => updateOscillator("pmDepth", v)}
                  accentColor="cyan"
                  size="xs"
                />
                <Knob
                  value={oscillator.pmFeedback * 100}
                  min={0}
                  max={100}
                  step={1}
                  label="FB"
                  unit="%"
                  onChange={(v) => updateOscillator("pmFeedback", v / 100)}
                  accentColor="cyan"
                  size="xs"
                />
              </div>
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
                  accentColor="orange"
                  size="xs"
                />
                <Knob
                  value={oscillator.indexEnvDepth}
                  min={0}
                  max={60}
                  step={1}
                  label="Depth"
                  onChange={(v) => updateOscillator("indexEnvDepth", v)}
                  accentColor="orange"
                  size="xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
