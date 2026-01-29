import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ParametricEQSettings } from "@/lib/eqSettings";

interface ParametricEQPanelProps {
  settings: ParametricEQSettings;
  onChange: (settings: ParametricEQSettings) => void;
}

export function ParametricEQPanel({ settings, onChange }: ParametricEQPanelProps) {
  return (
    <Card className="w-full" data-testid="parametric-eq-panel">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">Parametric EQ</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="eq-enabled" className="text-xs text-muted-foreground">
              On
            </Label>
            <Switch
              id="eq-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
              data-testid="switch-eq-enabled"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Tabs defaultValue="low" className="w-full">
          <TabsList className="w-full h-6 grid grid-cols-3 bg-muted/50">
            <TabsTrigger value="low" className="text-[10px]" data-testid="tab-eq-low">
              Low
            </TabsTrigger>
            <TabsTrigger value="mid" className="text-[10px]" data-testid="tab-eq-mid">
              Mid
            </TabsTrigger>
            <TabsTrigger value="high" className="text-[10px]" data-testid="tab-eq-high">
              High
            </TabsTrigger>
          </TabsList>

          <TabsContent value="low" className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Low Shelf</Label>
              <Switch
                checked={settings.lowBand.enabled}
                onCheckedChange={(enabled) =>
                  onChange({ ...settings, lowBand: { ...settings.lowBand, enabled } })
                }
                disabled={!settings.enabled}
                data-testid="switch-eq-low-enabled"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Knob
                value={settings.lowBand.frequency}
                onChange={(frequency) =>
                  onChange({ ...settings, lowBand: { ...settings.lowBand, frequency } })
                }
                min={20}
                max={500}
                step={5}
                label="Freq"
                unit="Hz"
                size="sm"
                disabled={!settings.enabled || !settings.lowBand.enabled}
              />
              <Knob
                value={settings.lowBand.gain}
                onChange={(gain) =>
                  onChange({ ...settings, lowBand: { ...settings.lowBand, gain } })
                }
                min={-15}
                max={15}
                step={0.5}
                label="Gain"
                unit="dB"
                size="sm"
                disabled={!settings.enabled || !settings.lowBand.enabled}
              />
              <Knob
                value={settings.lowBand.q}
                onChange={(q) =>
                  onChange({ ...settings, lowBand: { ...settings.lowBand, q } })
                }
                min={0.1}
                max={3}
                step={0.1}
                label="Q"
                size="sm"
                disabled={!settings.enabled || !settings.lowBand.enabled}
              />
            </div>
          </TabsContent>

          <TabsContent value="mid" className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Peaking</Label>
              <Switch
                checked={settings.midBand.enabled}
                onCheckedChange={(enabled) =>
                  onChange({ ...settings, midBand: { ...settings.midBand, enabled } })
                }
                disabled={!settings.enabled}
                data-testid="switch-eq-mid-enabled"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Knob
                value={settings.midBand.frequency}
                onChange={(frequency) =>
                  onChange({ ...settings, midBand: { ...settings.midBand, frequency } })
                }
                min={200}
                max={8000}
                step={50}
                label="Freq"
                unit="Hz"
                size="sm"
                logarithmic
                disabled={!settings.enabled || !settings.midBand.enabled}
              />
              <Knob
                value={settings.midBand.gain}
                onChange={(gain) =>
                  onChange({ ...settings, midBand: { ...settings.midBand, gain } })
                }
                min={-15}
                max={15}
                step={0.5}
                label="Gain"
                unit="dB"
                size="sm"
                disabled={!settings.enabled || !settings.midBand.enabled}
              />
              <Knob
                value={settings.midBand.q}
                onChange={(q) =>
                  onChange({ ...settings, midBand: { ...settings.midBand, q } })
                }
                min={0.1}
                max={10}
                step={0.1}
                label="Q"
                size="sm"
                disabled={!settings.enabled || !settings.midBand.enabled}
              />
            </div>
          </TabsContent>

          <TabsContent value="high" className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">High Shelf</Label>
              <Switch
                checked={settings.highBand.enabled}
                onCheckedChange={(enabled) =>
                  onChange({ ...settings, highBand: { ...settings.highBand, enabled } })
                }
                disabled={!settings.enabled}
                data-testid="switch-eq-high-enabled"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Knob
                value={settings.highBand.frequency}
                onChange={(frequency) =>
                  onChange({ ...settings, highBand: { ...settings.highBand, frequency } })
                }
                min={2000}
                max={16000}
                step={100}
                label="Freq"
                unit="Hz"
                size="sm"
                disabled={!settings.enabled || !settings.highBand.enabled}
              />
              <Knob
                value={settings.highBand.gain}
                onChange={(gain) =>
                  onChange({ ...settings, highBand: { ...settings.highBand, gain } })
                }
                min={-15}
                max={15}
                step={0.5}
                label="Gain"
                unit="dB"
                size="sm"
                disabled={!settings.enabled || !settings.highBand.enabled}
              />
              <Knob
                value={settings.highBand.q}
                onChange={(q) =>
                  onChange({ ...settings, highBand: { ...settings.highBand, q } })
                }
                min={0.1}
                max={3}
                step={0.1}
                label="Q"
                size="sm"
                disabled={!settings.enabled || !settings.highBand.enabled}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
