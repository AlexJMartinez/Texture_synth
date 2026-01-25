import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SynthParameters, DelayDivision } from "@shared/schema";
import { Sparkles, ChevronDown, ChevronRight, Shuffle } from "lucide-react";

const DELAY_DIVISIONS: { value: DelayDivision; label: string }[] = [
  { value: "1/1", label: "1/1" },
  { value: "1/2", label: "1/2" },
  { value: "1/4", label: "1/4" },
  { value: "1/8", label: "1/8" },
  { value: "1/16", label: "1/16" },
  { value: "1/32", label: "1/32" },
  { value: "1/2T", label: "1/2T" },
  { value: "1/4T", label: "1/4T" },
  { value: "1/8T", label: "1/8T" },
  { value: "1/16T", label: "1/16T" },
  { value: "1/2D", label: "1/2D" },
  { value: "1/4D", label: "1/4D" },
  { value: "1/8D", label: "1/8D" },
  { value: "1/16D", label: "1/16D" },
];

function randomizeEffects(): Partial<SynthParameters["effects"]> {
  return {
    saturation: Math.floor(Math.random() * 60),
    bitcrusher: Math.floor(4 + Math.random() * 12),
    delayEnabled: Math.random() > 0.6,
    delayTime: Math.floor(50 + Math.random() * 500),
    delayFeedback: Math.floor(Math.random() * 60),
    delayMix: Math.floor(Math.random() * 50),
    reverbEnabled: Math.random() > 0.5,
    reverbSize: Math.random() * 0.8,
    reverbDecay: 0.5 + Math.random() * 4,
    reverbMix: Math.floor(Math.random() * 50),
    chorusEnabled: Math.random() > 0.7,
    chorusRate: 0.5 + Math.random() * 4,
    chorusDepth: Math.floor(Math.random() * 60),
    chorusMix: Math.floor(Math.random() * 50),
  };
}

interface EffectsPanelProps {
  effects: SynthParameters["effects"];
  onChange: (effects: SynthParameters["effects"]) => void;
}

interface EffectSectionProps {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  testId: string;
}

function EffectSection({ title, enabled, onToggle, children, testId }: EffectSectionProps) {
  const [isOpen, setIsOpen] = useState(enabled);
  
  return (
    <div className={`rounded border border-border/50 transition-opacity ${!enabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
      <div className="flex items-center justify-between px-1.5 py-0.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          {isOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
          {title}
        </button>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="scale-50"
          data-testid={testId}
        />
      </div>
      {isOpen && <div className="px-1.5 pb-1.5">{children}</div>}
    </div>
  );
}

export function EffectsPanel({ effects, onChange }: EffectsPanelProps) {
  const updateEffects = <K extends keyof SynthParameters["effects"]>(
    key: K,
    value: SynthParameters["effects"][K]
  ) => {
    onChange({ ...effects, [key]: value });
  };

  const handleRandomize = () => {
    onChange({ ...effects, ...randomizeEffects() });
  };

  return (
    <CollapsiblePanel
      title="FX"
      icon={<Sparkles className="w-3 h-3 text-primary" />}
      defaultOpen={true}
      data-testid="panel-effects"
      headerExtra={
        <Button
          size="icon"
          variant="ghost"
          onClick={handleRandomize}
          data-testid="btn-randomize-effects"
        >
          <Shuffle className="w-3 h-3" />
        </Button>
      }
    >
      <div className="space-y-1">
        <div className="p-1 rounded bg-muted/30 border border-border/50">
          <div className="text-[10px] text-muted-foreground mb-1">Dist</div>
          <div className="flex justify-center gap-1">
            <Knob
              value={effects.saturation}
              min={0}
              max={100}
              step={1}
              label="Sat"
              unit="%"
              onChange={(v) => updateEffects("saturation", v)}
              accentColor="primary"
              size="xs"
            />
            <Knob
              value={effects.bitcrusher}
              min={1}
              max={16}
              step={1}
              label="Bit"
              unit="b"
              onChange={(v) => updateEffects("bitcrusher", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>

        <EffectSection
          title="Delay"
          enabled={effects.delayEnabled}
          onToggle={(v) => updateEffects("delayEnabled", v)}
          testId="switch-delay"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => updateEffects("delaySyncMode", effects.delaySyncMode === "ms" ? "sync" : "ms")}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                  effects.delaySyncMode === "ms"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                data-testid="button-delay-ms"
              >
                ms
              </button>
              <button
                type="button"
                onClick={() => updateEffects("delaySyncMode", effects.delaySyncMode === "sync" ? "ms" : "sync")}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                  effects.delaySyncMode === "sync"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                data-testid="button-delay-sync"
              >
                sync
              </button>
            </div>
            <div className="flex justify-center gap-1">
              {effects.delaySyncMode === "ms" ? (
                <Knob value={effects.delayTime} min={0} max={2000} step={1} label="T" unit="ms" onChange={(v) => updateEffects("delayTime", v)} size="xs" />
              ) : (
                <div className="flex flex-col items-center">
                  <Select
                    value={effects.delayDivision}
                    onValueChange={(v) => updateEffects("delayDivision", v as DelayDivision)}
                  >
                    <SelectTrigger className="h-6 w-14 text-[9px]" data-testid="select-delay-division">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELAY_DIVISIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="text-[10px]">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[8px] text-muted-foreground mt-0.5">Div</span>
                </div>
              )}
              <Knob value={effects.delayFeedback} min={0} max={95} step={1} label="FB" unit="%" onChange={(v) => updateEffects("delayFeedback", v)} size="xs" />
              <Knob value={effects.delayMix} min={0} max={100} step={1} label="Mix" unit="%" onChange={(v) => updateEffects("delayMix", v)} size="xs" />
            </div>
          </div>
        </EffectSection>

        <EffectSection
          title="Reverb"
          enabled={effects.reverbEnabled}
          onToggle={(v) => updateEffects("reverbEnabled", v)}
          testId="switch-reverb"
        >
          <div className="flex justify-center gap-1">
            <Knob value={effects.reverbSize} min={0} max={100} step={1} label="Sz" unit="%" onChange={(v) => updateEffects("reverbSize", v)} size="xs" />
            <Knob value={effects.reverbDecay} min={0.1} max={10} step={0.1} label="Dc" unit="s" onChange={(v) => updateEffects("reverbDecay", v)} size="xs" />
            <Knob value={effects.reverbMix} min={0} max={100} step={1} label="Mix" unit="%" onChange={(v) => updateEffects("reverbMix", v)} size="xs" />
          </div>
        </EffectSection>

        <EffectSection
          title="Chorus"
          enabled={effects.chorusEnabled}
          onToggle={(v) => updateEffects("chorusEnabled", v)}
          testId="switch-chorus"
        >
          <div className="flex justify-center gap-1">
            <Knob value={effects.chorusRate} min={0.1} max={10} step={0.1} label="Rt" unit="Hz" onChange={(v) => updateEffects("chorusRate", v)} size="xs" />
            <Knob value={effects.chorusDepth} min={0} max={100} step={1} label="Dp" unit="%" onChange={(v) => updateEffects("chorusDepth", v)} size="xs" />
            <Knob value={effects.chorusMix} min={0} max={100} step={1} label="Mix" unit="%" onChange={(v) => updateEffects("chorusMix", v)} size="xs" />
          </div>
        </EffectSection>

        <EffectSection
          title="Transient"
          enabled={effects.transientEnabled}
          onToggle={(v) => updateEffects("transientEnabled", v)}
          testId="switch-transient"
        >
          <div className="flex justify-center gap-1">
            <Knob value={effects.transientAttack} min={-100} max={100} step={1} label="Atk" unit="%" onChange={(v) => updateEffects("transientAttack", v)} size="xs" />
            <Knob value={effects.transientSustain} min={-100} max={100} step={1} label="Sus" unit="%" onChange={(v) => updateEffects("transientSustain", v)} size="xs" />
          </div>
        </EffectSection>

        <EffectSection
          title="Limiter"
          enabled={effects.limiterEnabled}
          onToggle={(v) => updateEffects("limiterEnabled", v)}
          testId="switch-limiter"
        >
          <div className="flex justify-center gap-1">
            <Knob value={effects.limiterThreshold} min={-30} max={0} step={1} label="Thr" unit="dB" onChange={(v) => updateEffects("limiterThreshold", v)} size="xs" />
            <Knob value={effects.limiterRelease} min={10} max={500} step={1} label="Rel" unit="ms" onChange={(v) => updateEffects("limiterRelease", v)} size="xs" />
          </div>
        </EffectSection>

        <EffectSection
          title="M-Band"
          enabled={effects.multibandEnabled}
          onToggle={(v) => updateEffects("multibandEnabled", v)}
          testId="switch-multiband"
        >
          <div className="flex flex-col gap-1">
            <div className="flex justify-center gap-1">
              <Knob value={effects.multibandLowFreq} min={80} max={400} step={1} label="Lo" unit="Hz" onChange={(v) => updateEffects("multibandLowFreq", v)} size="xs" logarithmic />
              <Knob value={effects.multibandHighFreq} min={2000} max={10000} step={100} label="Hi" unit="Hz" onChange={(v) => updateEffects("multibandHighFreq", v)} size="xs" logarithmic />
            </div>
            <div className="flex justify-center gap-1">
              <Knob value={effects.multibandLowDrive} min={0} max={100} step={1} label="LoD" unit="%" onChange={(v) => updateEffects("multibandLowDrive", v)} size="xs" />
              <Knob value={effects.multibandMidDrive} min={0} max={100} step={1} label="MdD" unit="%" onChange={(v) => updateEffects("multibandMidDrive", v)} size="xs" />
              <Knob value={effects.multibandHighDrive} min={0} max={100} step={1} label="HiD" unit="%" onChange={(v) => updateEffects("multibandHighDrive", v)} size="xs" />
            </div>
          </div>
        </EffectSection>
      </div>
    </CollapsiblePanel>
  );
}
