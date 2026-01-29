import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ParallelProcessingSettings } from "@/lib/parallelProcessingSettings";

interface ParallelProcessingPanelProps {
  settings: ParallelProcessingSettings;
  onChange: (settings: ParallelProcessingSettings) => void;
}

export function ParallelProcessingPanel({ settings, onChange }: ParallelProcessingPanelProps) {
  return (
    <Card className="w-full" data-testid="parallel-processing-panel">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">Parallel FX</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="parallel-enabled" className="text-xs text-muted-foreground">
              On
            </Label>
            <Switch
              id="parallel-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
              data-testid="switch-parallel-enabled"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <p className="text-[10px] text-muted-foreground">
          Blend between dry (unprocessed) and wet (effects) signal.
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          <Knob
            value={settings.dryWetMix * 100}
            onChange={(v) => onChange({ ...settings, dryWetMix: v / 100 })}
            min={0}
            max={100}
            step={1}
            label="Dry/Wet"
            unit="%"
            size="sm"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.dryGain}
            onChange={(dryGain) => onChange({ ...settings, dryGain })}
            min={-12}
            max={12}
            step={0.5}
            label="Dry Gain"
            unit="dB"
            size="sm"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.wetGain}
            onChange={(wetGain) => onChange({ ...settings, wetGain })}
            min={-12}
            max={12}
            step={0.5}
            label="Wet Gain"
            unit="dB"
            size="sm"
            disabled={!settings.enabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
