import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Preset, SynthParameters } from "@shared/schema";
import { factoryPresets } from "@shared/schema";
import { Save, FolderOpen, Trash2, Plus, Music } from "lucide-react";

interface PresetPanelProps {
  currentParams: SynthParameters;
  onLoadPreset: (params: SynthParameters) => void;
}

function isValidV2Preset(params: unknown): params is SynthParameters {
  if (!params || typeof params !== 'object') return false;
  const p = params as Record<string, unknown>;
  return 'oscillators' in p && 'envelopes' in p && typeof p.oscillators === 'object';
}

export function PresetPanel({ currentParams, onLoadPreset }: PresetPanelProps) {
  const [presets, setPresets] = useState<Preset[]>(() => {
    const stored = localStorage.getItem("synth-presets-v2");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Preset[];
        return parsed.filter(p => isValidV2Preset(p.parameters));
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.removeItem("synth-presets");
  }, []);
  const [newPresetName, setNewPresetName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const savePreset = () => {
    if (!newPresetName.trim()) return;

    const preset: Preset = {
      id: crypto.randomUUID(),
      name: newPresetName.trim(),
      parameters: currentParams,
      createdAt: Date.now(),
    };

    const updated = [...presets, preset];
    setPresets(updated);
    localStorage.setItem("synth-presets-v2", JSON.stringify(updated));
    setNewPresetName("");
    setSaveDialogOpen(false);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem("synth-presets-v2", JSON.stringify(updated));
  };

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synth-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string) as Preset[];
        const validImported = imported.filter(p => isValidV2Preset(p.parameters));
        const updated = [...presets, ...validImported];
        setPresets(updated);
        localStorage.setItem("synth-presets-v2", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to import presets:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const fullFactoryPresets: Preset[] = factoryPresets.map((p, i) => ({
    ...p,
    id: `factory-${i}`,
    createdAt: 0,
  }));

  return (
    <Card className="synth-panel" data-testid="panel-presets">
      <CardHeader className="pb-1 pt-2 px-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1">
            <Music className="w-3 h-3 text-primary" />
            Presets
          </div>
          <div className="flex gap-1">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" data-testid="button-save-preset">
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Preset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Preset name..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && savePreset()}
                    data-testid="input-preset-name"
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button onClick={savePreset} disabled={!newPresetName.trim()} data-testid="button-confirm-save">
                    <Plus className="w-4 h-4 mr-2" />
                    Save Preset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 relative overflow-hidden"
              data-testid="button-import-presets"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <input
                type="file"
                accept=".json"
                onChange={importPresets}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </Button>

            {presets.length > 0 && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={exportPresets}
                data-testid="button-export-presets"
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[180px] px-2 pb-2">
          <div className="space-y-2">
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground mb-1 px-1">Factory</h4>
              <div className="space-y-0.5">
                {fullFactoryPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadPreset(preset.parameters);
                    }}
                    className="w-full text-left px-2 py-1 rounded text-[10px] hover-elevate active-elevate-2 bg-muted/30 border border-border/50 transition-colors"
                    data-testid={`preset-factory-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {presets.length > 0 && (
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-1 px-1">User</h4>
                <div className="space-y-0.5">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover-elevate bg-muted/30 border border-border/50 group"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadPreset(preset.parameters);
                        }}
                        className="flex-1 text-left"
                        data-testid={`preset-user-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        {preset.name}
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset.id);
                        }}
                        data-testid={`button-delete-${preset.id}`}
                      >
                        <Trash2 className="w-2 h-2 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
