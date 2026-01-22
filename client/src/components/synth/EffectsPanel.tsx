import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Knob } from "./Knob";
import type { SynthParameters } from "@shared/schema";
import { Sparkles } from "lucide-react";

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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-primary" />
          Effects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center gap-6">
          <Knob
            value={effects.saturation}
            min={0}
            max={100}
            step={1}
            label="Saturation"
            unit="%"
            onChange={(v) => updateEffects("saturation", v)}
            accentColor="primary"
          />
          <Knob
            value={effects.bitcrusher}
            min={1}
            max={16}
            step={1}
            label="Bit Depth"
            unit="bit"
            onChange={(v) => updateEffects("bitcrusher", v)}
            accentColor="accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="px-2 py-1.5 rounded-md bg-muted/30 border border-border/50">
            <div className="text-[10px] text-muted-foreground mb-0.5">Saturation</div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${effects.saturation}%`,
                  background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--destructive)))',
                }}
              />
            </div>
          </div>
          <div className="px-2 py-1.5 rounded-md bg-muted/30 border border-border/50">
            <div className="text-[10px] text-muted-foreground mb-0.5">Bit Crush</div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${((16 - effects.bitcrusher) / 15) * 100}%`,
                  background: 'linear-gradient(to right, hsl(var(--accent)), hsl(var(--chart-3)))',
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
