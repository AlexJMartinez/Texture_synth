import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { LowEndSettings, OscPhaseSettings } from "@/lib/advancedSynthSettings";
import { Waves, Volume2, Radio, Gauge } from "lucide-react";

interface LowEndPanelProps {
  lowEndSettings: LowEndSettings;
  phaseSettings: OscPhaseSettings;
  onLowEndChange: (settings: LowEndSettings) => void;
  onPhaseChange: (settings: OscPhaseSettings) => void;
}

export function LowEndPanel({
  lowEndSettings,
  phaseSettings,
  onLowEndChange,
  onPhaseChange,
}: LowEndPanelProps) {
  const updateLowEnd = <K extends keyof LowEndSettings>(key: K, value: LowEndSettings[K]) => {
    onLowEndChange({ ...lowEndSettings, [key]: value });
  };

  const updateSubHarmonic = <K extends keyof LowEndSettings["subHarmonic"]>(
    key: K,
    value: LowEndSettings["subHarmonic"][K]
  ) => {
    onLowEndChange({
      ...lowEndSettings,
      subHarmonic: { ...lowEndSettings.subHarmonic, [key]: value },
    });
  };

  const updateBassExciter = <K extends keyof LowEndSettings["bassExciter"]>(
    key: K,
    value: LowEndSettings["bassExciter"][K]
  ) => {
    onLowEndChange({
      ...lowEndSettings,
      bassExciter: { ...lowEndSettings.bassExciter, [key]: value },
    });
  };

  const updateSubEQ = <K extends keyof LowEndSettings["subEQ"]>(
    key: K,
    value: LowEndSettings["subEQ"][K]
  ) => {
    onLowEndChange({
      ...lowEndSettings,
      subEQ: { ...lowEndSettings.subEQ, [key]: value },
    });
  };

  const updatePhase = <K extends keyof OscPhaseSettings>(key: K, value: OscPhaseSettings[K]) => {
    onPhaseChange({ ...phaseSettings, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Low End"
      icon={<Waves className="w-3 h-3 text-green-400" />}
      defaultOpen={false}
      data-testid="panel-low-end"
    >
      <div className="space-y-1.5">
        <div className="rounded border border-border/50 p-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" /> Phase Alignment
            </span>
          </div>
          <div className="flex justify-center gap-1 flex-wrap">
            <Knob
              value={phaseSettings.osc1Phase}
              min={0}
              max={360}
              step={1}
              label="Osc1"
              unit="°"
              onChange={(v) => updatePhase("osc1Phase", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-osc1-phase"
            />
            <Knob
              value={phaseSettings.osc2Phase}
              min={0}
              max={360}
              step={1}
              label="Osc2"
              unit="°"
              onChange={(v) => updatePhase("osc2Phase", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-osc2-phase"
            />
            <Knob
              value={phaseSettings.osc3Phase}
              min={0}
              max={360}
              step={1}
              label="Osc3"
              unit="°"
              onChange={(v) => updatePhase("osc3Phase", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-osc3-phase"
            />
            <Knob
              value={phaseSettings.subPhase}
              min={0}
              max={360}
              step={1}
              label="Sub"
              unit="°"
              onChange={(v) => updatePhase("subPhase", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-sub-phase"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!lowEndSettings.dcFilterEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">DC Filter</span>
            <Switch
              checked={lowEndSettings.dcFilterEnabled}
              onCheckedChange={(v) => updateLowEnd("dcFilterEnabled", v)}
              className="scale-50"
              data-testid="switch-dc-filter"
            />
          </div>
          <div className="flex justify-center">
            <Knob
              value={lowEndSettings.dcFilterFreq}
              min={3}
              max={20}
              step={0.5}
              label="Freq"
              unit="Hz"
              onChange={(v) => updateLowEnd("dcFilterFreq", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-dc-filter-freq"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!lowEndSettings.monoSumEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Low-End Mono Sum</span>
            <Switch
              checked={lowEndSettings.monoSumEnabled}
              onCheckedChange={(v) => updateLowEnd("monoSumEnabled", v)}
              className="scale-50"
              data-testid="switch-mono-sum"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={lowEndSettings.monoSumFreq}
              min={80}
              max={300}
              step={5}
              label="Crossover"
              unit="Hz"
              onChange={(v) => updateLowEnd("monoSumFreq", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-mono-sum-freq"
            />
            <Knob
              value={lowEndSettings.monoSumWidth}
              min={0}
              max={100}
              step={5}
              label="Width"
              unit="%"
              onChange={(v) => updateLowEnd("monoSumWidth", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-mono-sum-width"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!lowEndSettings.subHarmonic.enabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5" /> Sub-Harmonic Generator
            </span>
            <Switch
              checked={lowEndSettings.subHarmonic.enabled}
              onCheckedChange={(v) => updateSubHarmonic("enabled", v)}
              className="scale-50"
              data-testid="switch-sub-harmonic"
            />
          </div>
          <div className="flex justify-center gap-1 flex-wrap">
            <Knob
              value={lowEndSettings.subHarmonic.octaveDown1}
              min={0}
              max={100}
              step={1}
              label="-1 Oct"
              unit="%"
              onChange={(v) => updateSubHarmonic("octaveDown1", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-sub-harm-oct1"
            />
            <Knob
              value={lowEndSettings.subHarmonic.octaveDown2}
              min={0}
              max={100}
              step={1}
              label="-2 Oct"
              unit="%"
              onChange={(v) => updateSubHarmonic("octaveDown2", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-sub-harm-oct2"
            />
            <Knob
              value={lowEndSettings.subHarmonic.filterFreq}
              min={20}
              max={200}
              step={5}
              label="Filter"
              unit="Hz"
              onChange={(v) => updateSubHarmonic("filterFreq", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-sub-harm-filter"
            />
            <Knob
              value={lowEndSettings.subHarmonic.drive}
              min={0}
              max={100}
              step={1}
              label="Drive"
              unit="%"
              onChange={(v) => updateSubHarmonic("drive", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-sub-harm-drive"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!lowEndSettings.bassExciter.enabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Gauge className="w-2.5 h-2.5" /> Bass Exciter
            </span>
            <Switch
              checked={lowEndSettings.bassExciter.enabled}
              onCheckedChange={(v) => updateBassExciter("enabled", v)}
              className="scale-50"
              data-testid="switch-bass-exciter"
            />
          </div>
          <div className="flex justify-center gap-1 flex-wrap">
            <Knob
              value={lowEndSettings.bassExciter.frequency}
              min={40}
              max={150}
              step={5}
              label="Freq"
              unit="Hz"
              onChange={(v) => updateBassExciter("frequency", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-bass-exc-freq"
            />
            <Knob
              value={lowEndSettings.bassExciter.harmonics}
              min={0}
              max={100}
              step={1}
              label="Harm"
              unit="%"
              onChange={(v) => updateBassExciter("harmonics", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-bass-exc-harm"
            />
            <Knob
              value={lowEndSettings.bassExciter.subOctave}
              min={0}
              max={100}
              step={1}
              label="SubOct"
              unit="%"
              onChange={(v) => updateBassExciter("subOctave", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-bass-exc-suboct"
            />
            <Knob
              value={lowEndSettings.bassExciter.presence}
              min={0}
              max={100}
              step={1}
              label="Edge"
              unit="%"
              onChange={(v) => updateBassExciter("presence", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-bass-exc-edge"
            />
            <Knob
              value={lowEndSettings.bassExciter.mix}
              min={0}
              max={100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => updateBassExciter("mix", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-bass-exc-mix"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!lowEndSettings.subEQ.enabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Sub EQ</span>
            <Switch
              checked={lowEndSettings.subEQ.enabled}
              onCheckedChange={(v) => updateSubEQ("enabled", v)}
              className="scale-50"
              data-testid="switch-sub-eq"
            />
          </div>
          <div className="flex justify-center gap-1 flex-wrap">
            <Knob
              value={lowEndSettings.subEQ.lowShelfFreq}
              min={30}
              max={120}
              step={5}
              label="LoFreq"
              unit="Hz"
              onChange={(v) => updateSubEQ("lowShelfFreq", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-subeq-lo-freq"
            />
            <Knob
              value={lowEndSettings.subEQ.lowShelfGain}
              min={-12}
              max={12}
              step={0.5}
              label="LoGain"
              unit="dB"
              onChange={(v) => updateSubEQ("lowShelfGain", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-subeq-lo-gain"
            />
            <Knob
              value={lowEndSettings.subEQ.lowShelfQ}
              min={0.3}
              max={2}
              step={0.1}
              label="LoQ"
              unit=""
              onChange={(v) => updateSubEQ("lowShelfQ", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-subeq-lo-q"
            />
          </div>
          <div className="flex justify-center gap-1 flex-wrap mt-1">
            <Knob
              value={lowEndSettings.subEQ.subBoostFreq}
              min={20}
              max={80}
              step={1}
              label="SubFreq"
              unit="Hz"
              onChange={(v) => updateSubEQ("subBoostFreq", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-subeq-sub-freq"
            />
            <Knob
              value={lowEndSettings.subEQ.subBoostGain}
              min={0}
              max={12}
              step={0.5}
              label="SubGain"
              unit="dB"
              onChange={(v) => updateSubEQ("subBoostGain", v)}
              accentColor="accent"
              size="xs"
              data-testid="knob-subeq-sub-gain"
            />
            <Knob
              value={lowEndSettings.subEQ.subBoostQ}
              min={1}
              max={8}
              step={0.5}
              label="SubQ"
              unit=""
              onChange={(v) => updateSubEQ("subBoostQ", v)}
              accentColor="primary"
              size="xs"
              data-testid="knob-subeq-sub-q"
            />
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
