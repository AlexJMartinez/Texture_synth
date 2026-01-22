import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import type { SynthParameters } from "@shared/schema";
import { Sparkles, Timer, Waves as ReverbIcon, Volume2 } from "lucide-react";

interface EffectsPanelProps {
  effects: SynthParameters["effects"];
  onChange: (effects: SynthParameters["effects"]) => void;
}

export function EffectsPanel({ effects, onChange }: EffectsPanelProps) {
  const updateEffects = <K extends keyof SynthParameters["effects"]>(
    key: K,
    value: SynthParameters["effects"][K]
  ) => {
    onChange({ ...effects, [key]: value });
  };

  return (
    <Card className="synth-panel" data-testid="panel-effects">
      <CardHeader className="pb-1 pt-2 px-2">
        <CardTitle className="flex items-center gap-1 text-xs font-medium">
          <Sparkles className="w-3 h-3 text-primary" />
          Effects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-2 pb-2">
        <div className="p-1.5 rounded bg-muted/30 border border-border/50">
          <div className="text-[10px] text-muted-foreground mb-1">Distortion</div>
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
              label="Bits"
              unit="bit"
              onChange={(v) => updateEffects("bitcrusher", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>

        <div className={`p-1.5 rounded border border-border/50 transition-opacity ${!effects.delayEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Timer className="w-2.5 h-2.5 text-accent" />
              <span className="text-[10px] text-muted-foreground">Delay</span>
            </div>
            <Switch
              checked={effects.delayEnabled}
              onCheckedChange={(v) => updateEffects("delayEnabled", v)}
              className="scale-50"
              data-testid="switch-delay"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={effects.delayTime}
              min={0}
              max={2000}
              step={1}
              label="Time"
              unit="ms"
              onChange={(v) => updateEffects("delayTime", v)}
              size="xs"
            />
            <Knob
              value={effects.delayFeedback}
              min={0}
              max={95}
              step={1}
              label="FB"
              unit="%"
              onChange={(v) => updateEffects("delayFeedback", v)}
              size="xs"
            />
            <Knob
              value={effects.delayMix}
              min={0}
              max={100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => updateEffects("delayMix", v)}
              size="xs"
            />
          </div>
        </div>

        <div className={`p-1.5 rounded border border-border/50 transition-opacity ${!effects.reverbEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <ReverbIcon className="w-2.5 h-2.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Reverb</span>
            </div>
            <Switch
              checked={effects.reverbEnabled}
              onCheckedChange={(v) => updateEffects("reverbEnabled", v)}
              className="scale-50"
              data-testid="switch-reverb"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={effects.reverbSize}
              min={0}
              max={100}
              step={1}
              label="Size"
              unit="%"
              onChange={(v) => updateEffects("reverbSize", v)}
              size="xs"
            />
            <Knob
              value={effects.reverbDecay}
              min={0.1}
              max={10}
              step={0.1}
              label="Decay"
              unit="s"
              onChange={(v) => updateEffects("reverbDecay", v)}
              size="xs"
            />
            <Knob
              value={effects.reverbMix}
              min={0}
              max={100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => updateEffects("reverbMix", v)}
              size="xs"
            />
          </div>
        </div>

        <div className={`p-1.5 rounded border border-border/50 transition-opacity ${!effects.chorusEnabled ? 'opacity-50 bg-muted/10' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5 text-accent" />
              <span className="text-[10px] text-muted-foreground">Chorus</span>
            </div>
            <Switch
              checked={effects.chorusEnabled}
              onCheckedChange={(v) => updateEffects("chorusEnabled", v)}
              className="scale-50"
              data-testid="switch-chorus"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={effects.chorusRate}
              min={0.1}
              max={10}
              step={0.1}
              label="Rate"
              unit="Hz"
              onChange={(v) => updateEffects("chorusRate", v)}
              size="xs"
            />
            <Knob
              value={effects.chorusDepth}
              min={0}
              max={100}
              step={1}
              label="Depth"
              unit="%"
              onChange={(v) => updateEffects("chorusDepth", v)}
              size="xs"
            />
            <Knob
              value={effects.chorusMix}
              min={0}
              max={100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => updateEffects("chorusMix", v)}
              size="xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
