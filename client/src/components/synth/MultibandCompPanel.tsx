import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MultibandCompSettings, BandCompSettings } from "@/lib/multibandCompSettings";

interface MultibandCompPanelProps {
  settings: MultibandCompSettings;
  onChange: (settings: MultibandCompSettings) => void;
}

interface BandControlsProps {
  band: BandCompSettings;
  onChange: (band: BandCompSettings) => void;
  label: string;
}

function BandControls({ band, onChange, label }: BandControlsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Switch
          checked={band.enabled}
          onCheckedChange={(enabled) => onChange({ ...band, enabled })}
          data-testid={`switch-${label.toLowerCase()}-enabled`}
        />
      </div>
      <div className="grid grid-cols-5 gap-1">
        <Knob
          value={band.threshold}
          onChange={(threshold) => onChange({ ...band, threshold })}
          min={-60}
          max={0}
          step={1}
          label="Thresh"
          unit="dB"
          size="xs"
          disabled={!band.enabled}
        />
        <Knob
          value={band.ratio}
          onChange={(ratio) => onChange({ ...band, ratio })}
          min={1}
          max={20}
          step={0.5}
          label="Ratio"
          unit=":1"
          size="xs"
          disabled={!band.enabled}
        />
        <Knob
          value={band.attack}
          onChange={(attack) => onChange({ ...band, attack })}
          min={0.1}
          max={100}
          step={0.5}
          label="Atk"
          unit="ms"
          size="xs"
          disabled={!band.enabled}
        />
        <Knob
          value={band.release}
          onChange={(release) => onChange({ ...band, release })}
          min={10}
          max={1000}
          step={10}
          label="Rel"
          unit="ms"
          size="xs"
          disabled={!band.enabled}
        />
        <Knob
          value={band.gain}
          onChange={(gain) => onChange({ ...band, gain })}
          min={-12}
          max={12}
          step={0.5}
          label="Gain"
          unit="dB"
          size="xs"
          disabled={!band.enabled}
        />
      </div>
    </div>
  );
}

export function MultibandCompPanel({ settings, onChange }: MultibandCompPanelProps) {
  return (
    <Card className="w-full" data-testid="multiband-comp-panel">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">Multiband Comp</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="mbc-enabled" className="text-xs text-muted-foreground">
              On
            </Label>
            <Switch
              id="mbc-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
              data-testid="switch-multiband-enabled"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Crossover frequencies */}
        <div className="grid grid-cols-3 gap-2">
          <Knob
            value={settings.lowCrossover}
            onChange={(lowCrossover) => onChange({ ...settings, lowCrossover })}
            min={20}
            max={500}
            step={10}
            label="Low X"
            unit="Hz"
            size="sm"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.highCrossover}
            onChange={(highCrossover) => onChange({ ...settings, highCrossover })}
            min={2000}
            max={10000}
            step={100}
            label="High X"
            unit="Hz"
            size="sm"
            disabled={!settings.enabled}
          />
          <Knob
            value={settings.mix * 100}
            onChange={(v) => onChange({ ...settings, mix: v / 100 })}
            min={0}
            max={100}
            step={1}
            label="Mix"
            unit="%"
            size="sm"
            disabled={!settings.enabled}
          />
        </div>

        {/* Band tabs */}
        {settings.enabled && (
          <Tabs defaultValue="low" className="w-full">
            <TabsList className="w-full h-6 grid grid-cols-3 bg-muted/50">
              <TabsTrigger value="low" className="text-[10px]" data-testid="tab-band-low">
                Low
              </TabsTrigger>
              <TabsTrigger value="mid" className="text-[10px]" data-testid="tab-band-mid">
                Mid
              </TabsTrigger>
              <TabsTrigger value="high" className="text-[10px]" data-testid="tab-band-high">
                High
              </TabsTrigger>
            </TabsList>
            <TabsContent value="low" className="mt-2">
              <BandControls
                band={settings.lowBand}
                onChange={(lowBand) => onChange({ ...settings, lowBand })}
                label="Low Band"
              />
            </TabsContent>
            <TabsContent value="mid" className="mt-2">
              <BandControls
                band={settings.midBand}
                onChange={(midBand) => onChange({ ...settings, midBand })}
                label="Mid Band"
              />
            </TabsContent>
            <TabsContent value="high" className="mt-2">
              <BandControls
                band={settings.highBand}
                onChange={(highBand) => onChange({ ...settings, highBand })}
                label="High Band"
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
