import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GranularSynth, GranularTexture } from "@shared/schema";
import { Sparkles } from "lucide-react";

interface GranularPanelProps {
  granular: GranularSynth;
  onChange: (granular: GranularSynth) => void;
}

const textures: { value: GranularTexture; label: string }[] = [
  { value: "noise", label: "Noise" },
  { value: "sine", label: "Sine" },
  { value: "saw", label: "Saw" },
  { value: "click", label: "Click" },
];

export function GranularPanel({ granular, onChange }: GranularPanelProps) {
  const updateGranular = <K extends keyof GranularSynth>(key: K, value: GranularSynth[K]) => {
    onChange({ ...granular, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Granular"
      icon={<Sparkles className="w-3 h-3 text-pink-400" />}
      defaultOpen={granular.enabled}
      data-testid="panel-granular"
      className={`transition-opacity ${!granular.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={granular.enabled}
          onCheckedChange={(v) => updateGranular("enabled", v)}
          className="scale-75"
          data-testid="switch-granular"
        />
      }
    >
      <div className="space-y-1.5">
        <div className="flex justify-center items-start gap-0.5">
          <Knob
            value={granular.pitch}
            min={20}
            max={2000}
            step={1}
            label="Pit"
            unit="Hz"
            onChange={(v) => updateGranular("pitch", v)}
            logarithmic
            accentColor="primary"
            size="xs"
            data-testid="knob-granular-pitch"
          />
          <Knob
            value={granular.density}
            min={1}
            max={100}
            step={1}
            label="Den"
            unit=""
            onChange={(v) => updateGranular("density", v)}
            accentColor="accent"
            size="xs"
            data-testid="knob-granular-density"
          />
          <Knob
            value={granular.grainSize}
            min={5}
            max={200}
            step={1}
            label="Siz"
            unit="ms"
            onChange={(v) => updateGranular("grainSize", v)}
            accentColor="primary"
            size="xs"
            data-testid="knob-granular-size"
          />
        </div>

        <div className="flex justify-center items-start gap-0.5">
          <Knob
            value={granular.pitchSpray}
            min={0}
            max={100}
            step={1}
            label="Spr"
            unit="%"
            onChange={(v) => updateGranular("pitchSpray", v)}
            accentColor="accent"
            size="xs"
            data-testid="knob-granular-spray"
          />
          <Knob
            value={granular.scatter}
            min={0}
            max={100}
            step={1}
            label="Sct"
            unit="%"
            onChange={(v) => updateGranular("scatter", v)}
            accentColor="primary"
            size="xs"
            data-testid="knob-granular-scatter"
          />
        </div>

        <div className="px-1">
          <label className="text-[9px] text-muted-foreground block mb-0.5">Texture</label>
          <Select
            value={granular.texture}
            onValueChange={(v) => updateGranular("texture", v as GranularTexture)}
          >
            <SelectTrigger className="h-5 text-[10px]" data-testid="select-granular-texture">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {textures.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-[10px]">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
