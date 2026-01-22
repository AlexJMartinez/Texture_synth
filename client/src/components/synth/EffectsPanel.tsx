import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SynthParameters } from "@shared/schema";
import { Sparkles, ChevronDown, ChevronRight } from "lucide-react";

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

  return (
    <CollapsiblePanel
      title="FX"
      icon={<Sparkles className="w-3 h-3 text-primary" />}
      defaultOpen={true}
      data-testid="panel-effects"
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
          <div className="flex justify-center gap-1">
            <Knob value={effects.delayTime} min={0} max={2000} step={1} label="T" unit="ms" onChange={(v) => updateEffects("delayTime", v)} size="xs" />
            <Knob value={effects.delayFeedback} min={0} max={95} step={1} label="FB" unit="%" onChange={(v) => updateEffects("delayFeedback", v)} size="xs" />
            <Knob value={effects.delayMix} min={0} max={100} step={1} label="Mix" unit="%" onChange={(v) => updateEffects("delayMix", v)} size="xs" />
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
      </div>
    </CollapsiblePanel>
  );
}
