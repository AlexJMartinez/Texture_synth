import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { AdditiveSynth, AdditivePartial } from "@shared/schema";
import { Waves, ChevronDown, ChevronRight } from "lucide-react";

interface AdditivePanelProps {
  additive: AdditiveSynth;
  onChange: (additive: AdditiveSynth) => void;
}

export function AdditivePanel({ additive, onChange }: AdditivePanelProps) {
  const [partialsOpen, setPartialsOpen] = useState(true);

  const updateAdditive = <K extends keyof AdditiveSynth>(key: K, value: AdditiveSynth[K]) => {
    onChange({ ...additive, [key]: value });
  };

  const updatePartial = (partialKey: keyof AdditiveSynth["partials"], key: keyof AdditivePartial, value: number) => {
    onChange({
      ...additive,
      partials: {
        ...additive.partials,
        [partialKey]: { ...additive.partials[partialKey], [key]: value },
      },
    });
  };

  const partialLabels = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const partialKeys: (keyof AdditiveSynth["partials"])[] = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];

  return (
    <CollapsiblePanel
      title="Additive"
      icon={<Waves className="w-3 h-3 text-cyan-400" />}
      defaultOpen={additive.enabled}
      data-testid="panel-additive"
      className={`transition-opacity ${!additive.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={additive.enabled}
          onCheckedChange={(v) => updateAdditive("enabled", v)}
          className="scale-75"
          data-testid="switch-additive"
        />
      }
    >
      <div className="space-y-1.5">
        <div className="flex justify-center gap-1">
          <Knob
            value={additive.basePitch}
            min={20}
            max={2000}
            step={1}
            label="Pitch"
            unit="Hz"
            onChange={(v) => updateAdditive("basePitch", v)}
            logarithmic
            accentColor="primary"
            size="xs"
          />
          <Knob
            value={additive.spread}
            min={0}
            max={100}
            step={1}
            label="Spr"
            unit="%"
            onChange={(v) => updateAdditive("spread", v)}
            accentColor="accent"
            size="xs"
          />
          <Knob
            value={additive.decaySlope}
            min={0}
            max={100}
            step={1}
            label="Slp"
            unit="%"
            onChange={(v) => updateAdditive("decaySlope", v)}
            accentColor="primary"
            size="xs"
          />
        </div>

        <div className="rounded border border-border/50 bg-muted/20">
          <button
            type="button"
            onClick={() => setPartialsOpen(!partialsOpen)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground w-full"
            data-testid="button-toggle-partials"
          >
            {partialsOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
            Harmonic Partials
          </button>
          {partialsOpen && (
            <div className="px-1.5 pb-1.5 grid grid-cols-4 gap-x-1 gap-y-0.5">
              {partialKeys.map((partialKey, i) => (
                <div key={partialKey} className="flex flex-col items-center" data-testid={`additive-partial-${i + 1}`}>
                  <span className="text-[8px] text-muted-foreground">{partialLabels[i]}</span>
                  <Knob
                    value={additive.partials[partialKey].level}
                    min={0}
                    max={100}
                    step={1}
                    label=""
                    unit="%"
                    onChange={(v) => updatePartial(partialKey, "level", v)}
                    accentColor="primary"
                    size="xs"
                    data-testid={`knob-partial-${i + 1}-level`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
