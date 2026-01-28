import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Preset, SynthParameters } from "@shared/schema";
import { factoryPresets } from "@shared/schema";
import { Save, FolderOpen, Trash2, Plus, Music, RotateCcw } from "lucide-react";
import type { FullSynthSettings, FullPreset } from "@/lib/fullPreset";
import { FULL_PRESET_VERSION } from "@/lib/fullPreset";

interface PresetPanelProps {
  currentSettings: FullSynthSettings;
  onLoadPreset: (settings: FullSynthSettings) => void;
}

function isValidV2Preset(params: unknown): params is SynthParameters {
  if (!params || typeof params !== 'object') return false;
  const p = params as Record<string, unknown>;
  return 'oscillators' in p && 'envelopes' in p && typeof p.oscillators === 'object';
}

function isValidFullPreset(preset: unknown): preset is FullPreset {
  if (!preset || typeof preset !== 'object') return false;
  const p = preset as Record<string, unknown>;
  if (!('settings' in p) || !p.settings || typeof p.settings !== 'object') return false;
  const s = p.settings as Record<string, unknown>;
  return 'params' in s && isValidV2Preset(s.params);
}

export function PresetPanel({ currentSettings, onLoadPreset }: PresetPanelProps) {
  // Load full presets (v3 format) - also migrate v2 presets if found
  const [presets, setPresets] = useState<FullPreset[]>(() => {
    // Try v3 format first
    const storedV3 = localStorage.getItem("synth-presets-v3");
    if (storedV3) {
      try {
        const parsed = JSON.parse(storedV3) as FullPreset[];
        return parsed.filter(p => isValidFullPreset(p));
      } catch {
        // Fall through
      }
    }
    
    // Migrate v2 presets if they exist
    const storedV2 = localStorage.getItem("synth-presets-v2");
    if (storedV2) {
      try {
        const parsedV2 = JSON.parse(storedV2) as Preset[];
        const migrated: FullPreset[] = parsedV2
          .filter(p => isValidV2Preset(p.parameters))
          .map(p => ({
            id: p.id,
            name: p.name,
            settings: { params: p.parameters },
            createdAt: p.createdAt,
            version: FULL_PRESET_VERSION,
          }));
        // Save migrated presets to v3 format
        if (migrated.length > 0) {
          localStorage.setItem("synth-presets-v3", JSON.stringify(migrated));
        }
        return migrated;
      } catch {
        return [];
      }
    }
    return [];
  });

  const [hiddenFactoryPresets, setHiddenFactoryPresets] = useState<string[]>(() => {
    const stored = localStorage.getItem("synth-hidden-factory-presets");
    if (stored) {
      try {
        return JSON.parse(stored) as string[];
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

    const preset: FullPreset = {
      id: crypto.randomUUID(),
      name: newPresetName.trim(),
      settings: currentSettings,
      createdAt: Date.now(),
      version: FULL_PRESET_VERSION,
    };

    const updated = [...presets, preset];
    setPresets(updated);
    localStorage.setItem("synth-presets-v3", JSON.stringify(updated));
    setNewPresetName("");
    setSaveDialogOpen(false);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem("synth-presets-v3", JSON.stringify(updated));
  };

  const hideFactoryPreset = (id: string) => {
    const updated = [...hiddenFactoryPresets, id];
    setHiddenFactoryPresets(updated);
    localStorage.setItem("synth-hidden-factory-presets", JSON.stringify(updated));
  };

  const restoreFactoryPresets = () => {
    setHiddenFactoryPresets([]);
    localStorage.removeItem("synth-hidden-factory-presets");
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
        const imported = JSON.parse(reader.result as string);
        // Handle both v2 and v3 formats
        let validImported: FullPreset[] = [];
        if (Array.isArray(imported)) {
          for (const item of imported) {
            if (isValidFullPreset(item)) {
              validImported.push(item);
            } else if (isValidV2Preset((item as Preset).parameters)) {
              // Migrate v2 preset
              const v2 = item as Preset;
              validImported.push({
                id: v2.id,
                name: v2.name,
                settings: { params: v2.parameters },
                createdAt: v2.createdAt,
                version: FULL_PRESET_VERSION,
              });
            }
          }
        }
        const updated = [...presets, ...validImported];
        setPresets(updated);
        localStorage.setItem("synth-presets-v3", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to import presets:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Factory presets only have params, not full settings
  const fullFactoryPresets: FullPreset[] = factoryPresets.map((p, i) => ({
    id: `factory-${i}`,
    name: p.name,
    settings: { params: p.parameters },
    createdAt: 0,
    version: FULL_PRESET_VERSION,
  }));

  const visibleFactoryPresets = fullFactoryPresets.filter(p => !hiddenFactoryPresets.includes(p.id));

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
              <div className="flex items-center justify-between mb-1 px-1">
                <h4 className="text-[10px] font-medium text-muted-foreground">Factory</h4>
                {hiddenFactoryPresets.length > 0 && (
                  <button
                    type="button"
                    onClick={restoreFactoryPresets}
                    className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                    data-testid="button-restore-factory-presets"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Restore
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {visibleFactoryPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover-elevate bg-muted/30 border border-border/50"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadPreset(preset.settings);
                      }}
                      className="flex-1 text-left"
                      data-testid={`preset-factory-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      className="h-5 w-5 p-0 rounded flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-destructive/20 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        hideFactoryPreset(preset.id);
                      }}
                      data-testid={`button-hide-${preset.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
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
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover-elevate bg-muted/30 border border-border/50"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadPreset(preset.settings);
                        }}
                        className="flex-1 text-left"
                        data-testid={`preset-user-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        {preset.name}
                      </button>
                      <button
                        type="button"
                        className="h-5 w-5 p-0 rounded flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity hover:bg-destructive/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset.id);
                        }}
                        data-testid={`button-delete-${preset.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
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
