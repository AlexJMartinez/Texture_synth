import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { RoundRobinSettings } from "@/lib/roundRobinExport";

interface RoundRobinPanelProps {
  settings: RoundRobinSettings;
  onChange: (settings: RoundRobinSettings) => void;
}

export function RoundRobinPanel({ settings, onChange }: RoundRobinPanelProps) {
  return (
    <Card className="w-full" data-testid="round-robin-panel">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">Round-Robin Export</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="rr-enabled" className="text-xs text-muted-foreground">
              On
            </Label>
            <Switch
              id="rr-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
              data-testid="switch-roundrobin-enabled"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <p className="text-[10px] text-muted-foreground">
          Generate subtle variations for realistic round-robin playback in DAWs.
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <Knob
            value={settings.variationCount}
            onChange={(variationCount) => onChange({ ...settings, variationCount })}
            min={2}
            max={8}
            step={1}
            label="Variations"
            size="sm"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.variationAmount}
            onChange={(variationAmount) => onChange({ ...settings, variationAmount })}
            min={5}
            max={50}
            step={1}
            label="Amount"
            unit="%"
            size="sm"
            disabled={!settings.enabled}
          />
        </div>

        {settings.enabled && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Vary Parameters:</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vary-pitch"
                  checked={settings.varyPitch}
                  onCheckedChange={(checked) =>
                    onChange({ ...settings, varyPitch: checked === true })
                  }
                  data-testid="checkbox-vary-pitch"
                />
                <Label htmlFor="vary-pitch" className="text-xs cursor-pointer">
                  Pitch/Detune
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vary-envelope"
                  checked={settings.varyEnvelope}
                  onCheckedChange={(checked) =>
                    onChange({ ...settings, varyEnvelope: checked === true })
                  }
                  data-testid="checkbox-vary-envelope"
                />
                <Label htmlFor="vary-envelope" className="text-xs cursor-pointer">
                  Envelopes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vary-filter"
                  checked={settings.varyFilter}
                  onCheckedChange={(checked) =>
                    onChange({ ...settings, varyFilter: checked === true })
                  }
                  data-testid="checkbox-vary-filter"
                />
                <Label htmlFor="vary-filter" className="text-xs cursor-pointer">
                  Filter
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vary-level"
                  checked={settings.varyLevel}
                  onCheckedChange={(checked) =>
                    onChange({ ...settings, varyLevel: checked === true })
                  }
                  data-testid="checkbox-vary-level"
                />
                <Label htmlFor="vary-level" className="text-xs cursor-pointer">
                  Levels
                </Label>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
