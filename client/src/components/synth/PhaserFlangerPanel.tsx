import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PhaserFlangerSettings } from "@/lib/phaserFlangerSettings";

interface PhaserFlangerPanelProps {
  settings: PhaserFlangerSettings;
  onChange: (settings: PhaserFlangerSettings) => void;
}

export function PhaserFlangerPanel({ settings, onChange }: PhaserFlangerPanelProps) {
  return (
    <Card className="w-full" data-testid="phaser-flanger-panel">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-medium text-primary">Phaser / Flanger</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Tabs defaultValue="phaser" className="w-full">
          <TabsList className="w-full h-6 grid grid-cols-2 bg-muted/50">
            <TabsTrigger value="phaser" className="text-[10px]" data-testid="tab-phaser">
              Phaser
            </TabsTrigger>
            <TabsTrigger value="flanger" className="text-[10px]" data-testid="tab-flanger">
              Flanger
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="phaser" className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Enable Phaser</Label>
              <Switch
                checked={settings.phaser.enabled}
                onCheckedChange={(enabled) =>
                  onChange({ ...settings, phaser: { ...settings.phaser, enabled } })
                }
                data-testid="switch-phaser-enabled"
              />
            </div>
            {settings.phaser.enabled && (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-1">
                  <Knob
                    value={settings.phaser.rate}
                    onChange={(rate) =>
                      onChange({ ...settings, phaser: { ...settings.phaser, rate } })
                    }
                    min={0.1}
                    max={10}
                    step={0.1}
                    label="Rate"
                    unit="Hz"
                    size="xs"
                  />
                  <Knob
                    value={settings.phaser.depth * 100}
                    onChange={(v) =>
                      onChange({ ...settings, phaser: { ...settings.phaser, depth: v / 100 } })
                    }
                    min={0}
                    max={100}
                    step={1}
                    label="Depth"
                    unit="%"
                    size="xs"
                  />
                  <Knob
                    value={settings.phaser.feedback * 100}
                    onChange={(v) =>
                      onChange({ ...settings, phaser: { ...settings.phaser, feedback: v / 100 } })
                    }
                    min={-100}
                    max={100}
                    step={1}
                    label="Fdbk"
                    unit="%"
                    size="xs"
                  />
                  <Knob
                    value={settings.phaser.mix * 100}
                    onChange={(v) =>
                      onChange({ ...settings, phaser: { ...settings.phaser, mix: v / 100 } })
                    }
                    min={0}
                    max={100}
                    step={1}
                    label="Mix"
                    unit="%"
                    size="xs"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <Label className="text-[9px] text-muted-foreground">Stages</Label>
                    <Select
                      value={String(settings.phaser.stages)}
                      onValueChange={(v) =>
                        onChange({ ...settings, phaser: { ...settings.phaser, stages: parseInt(v) } })
                      }
                    >
                      <SelectTrigger className="h-6 w-10 text-[10px]" data-testid="select-phaser-stages">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="flanger" className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Enable Flanger</Label>
              <Switch
                checked={settings.flanger.enabled}
                onCheckedChange={(enabled) =>
                  onChange({ ...settings, flanger: { ...settings.flanger, enabled } })
                }
                data-testid="switch-flanger-enabled"
              />
            </div>
            {settings.flanger.enabled && (
              <div className="grid grid-cols-5 gap-1">
                <Knob
                  value={settings.flanger.rate}
                  onChange={(rate) =>
                    onChange({ ...settings, flanger: { ...settings.flanger, rate } })
                  }
                  min={0.1}
                  max={10}
                  step={0.1}
                  label="Rate"
                  unit="Hz"
                  size="xs"
                />
                <Knob
                  value={settings.flanger.depth * 100}
                  onChange={(v) =>
                    onChange({ ...settings, flanger: { ...settings.flanger, depth: v / 100 } })
                  }
                  min={0}
                  max={100}
                  step={1}
                  label="Depth"
                  unit="%"
                  size="xs"
                />
                <Knob
                  value={settings.flanger.feedback * 100}
                  onChange={(v) =>
                    onChange({ ...settings, flanger: { ...settings.flanger, feedback: v / 100 } })
                  }
                  min={-100}
                  max={100}
                  step={1}
                  label="Fdbk"
                  unit="%"
                  size="xs"
                />
                <Knob
                  value={settings.flanger.delay}
                  onChange={(delay) =>
                    onChange({ ...settings, flanger: { ...settings.flanger, delay } })
                  }
                  min={0.5}
                  max={10}
                  step={0.1}
                  label="Delay"
                  unit="ms"
                  size="xs"
                />
                <Knob
                  value={settings.flanger.mix * 100}
                  onChange={(v) =>
                    onChange({ ...settings, flanger: { ...settings.flanger, mix: v / 100 } })
                  }
                  min={0}
                  max={100}
                  step={1}
                  label="Mix"
                  unit="%"
                  size="xs"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
