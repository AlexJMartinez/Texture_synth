import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Preset, SynthParameters, DbPreset } from "@shared/schema";
import { factoryPresets } from "@shared/schema";
import { Save, FolderOpen, Trash2, Plus, Music, RotateCcw, Download, RefreshCw, Pencil, Check, X } from "lucide-react";
import type { FullSynthSettings, FullPreset } from "@/lib/fullPreset";
import { FULL_PRESET_VERSION } from "@/lib/fullPreset";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  // Fetch presets from the database
  const { data: dbPresets = [], isLoading, refetch } = useQuery<DbPreset[]>({
    queryKey: ["/api/presets"],
  });

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async (preset: { name: string; settings: unknown; createdAt: number }) => {
      return apiRequest("POST", "/api/presets", preset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      toast({ title: "Preset saved", description: "Your preset is now available globally" });
    },
    onError: (error) => {
      toast({ title: "Failed to save preset", description: error.message, variant: "destructive" });
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/presets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      toast({ title: "Preset deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete preset", description: error.message, variant: "destructive" });
    },
  });

  // Update preset mutation (rename or overwrite)
  const updatePresetMutation = useMutation({
    mutationFn: async ({ id, name, settings }: { id: number; name?: string; settings?: unknown }) => {
      return apiRequest("PATCH", `/api/presets/${id}`, { name, settings });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      if (variables.settings) {
        toast({ title: "Preset updated", description: "Settings saved to existing preset" });
      } else {
        toast({ title: "Preset renamed" });
      }
    },
    onError: (error) => {
      toast({ title: "Failed to update preset", description: error.message, variant: "destructive" });
    },
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
  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [selectedPresetForOverwrite, setSelectedPresetForOverwrite] = useState<{ id: number; name: string } | null>(null);

  const savePreset = () => {
    if (!newPresetName.trim()) return;

    savePresetMutation.mutate({
      name: newPresetName.trim(),
      settings: currentSettings,
      createdAt: Date.now(),
    });
    
    setNewPresetName("");
    setSaveDialogOpen(false);
  };

  const deletePreset = (id: number) => {
    deletePresetMutation.mutate(id);
  };

  const startRename = (id: number, currentName: string) => {
    setEditingPresetId(id);
    setEditingName(currentName);
  };

  const confirmRename = () => {
    if (editingPresetId && editingName.trim()) {
      updatePresetMutation.mutate({ id: editingPresetId, name: editingName.trim() });
    }
    setEditingPresetId(null);
    setEditingName("");
  };

  const cancelRename = () => {
    setEditingPresetId(null);
    setEditingName("");
  };

  const openOverwriteDialog = (id: number, name: string) => {
    setSelectedPresetForOverwrite({ id, name });
    setOverwriteDialogOpen(true);
  };

  const confirmOverwrite = () => {
    if (selectedPresetForOverwrite) {
      updatePresetMutation.mutate({ 
        id: selectedPresetForOverwrite.id, 
        settings: currentSettings 
      });
    }
    setOverwriteDialogOpen(false);
    setSelectedPresetForOverwrite(null);
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
    const exportData = dbPresets.map(p => ({
      name: p.name,
      settings: p.settings,
      createdAt: p.createdAt,
      version: FULL_PRESET_VERSION,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synth-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPresets = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(reader.result as string);
        if (Array.isArray(imported)) {
          for (const item of imported) {
            if (isValidFullPreset(item)) {
              await savePresetMutation.mutateAsync({
                name: (item as FullPreset).name,
                settings: (item as FullPreset).settings,
                createdAt: (item as FullPreset).createdAt || Date.now(),
              });
            } else if (isValidV2Preset((item as Preset).parameters)) {
              const v2 = item as Preset;
              await savePresetMutation.mutateAsync({
                name: v2.name,
                settings: { params: v2.parameters },
                createdAt: v2.createdAt || Date.now(),
              });
            }
          }
        }
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

  // Convert DB presets to FullPreset format for loading
  const userPresets = dbPresets.map(p => ({
    id: p.id,
    name: p.name,
    settings: p.settings as FullSynthSettings,
    createdAt: p.createdAt,
  }));

  return (
    <Card className="synth-panel" data-testid="panel-presets">
      <CardHeader className="pb-1 pt-2 px-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1">
            <Music className="w-3 h-3 text-primary" />
            Presets
            {isLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={() => refetch()}
              title="Refresh presets"
              data-testid="button-refresh-presets"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

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
                  <Button 
                    onClick={savePreset} 
                    disabled={!newPresetName.trim() || savePresetMutation.isPending} 
                    data-testid="button-confirm-save"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {savePresetMutation.isPending ? "Saving..." : "Save Preset"}
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

            {userPresets.length > 0 && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={exportPresets}
                data-testid="button-export-presets"
              >
                <Download className="w-3.5 h-3.5" />
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

            {userPresets.length > 0 && (
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-1 px-1">Shared</h4>
                <div className="space-y-0.5">
                  {userPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover-elevate bg-muted/30 border border-border/50"
                    >
                      {editingPresetId === preset.id ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            className="flex-1 h-5 text-[10px] px-1"
                            autoFocus
                            data-testid={`input-rename-${preset.id}`}
                          />
                          <button
                            type="button"
                            className="h-5 w-5 p-0 rounded flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity hover:bg-primary/20"
                            onClick={confirmRename}
                            data-testid={`button-confirm-rename-${preset.id}`}
                          >
                            <Check className="w-3 h-3 text-primary" />
                          </button>
                          <button
                            type="button"
                            className="h-5 w-5 p-0 rounded flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity hover:bg-muted"
                            onClick={cancelRename}
                            data-testid={`button-cancel-rename-${preset.id}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onLoadPreset(preset.settings);
                            }}
                            className="flex-1 text-left truncate"
                            data-testid={`preset-user-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                          >
                            {preset.name}
                          </button>
                          <button
                            type="button"
                            className="h-5 w-5 p-0 rounded flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity hover:bg-accent/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              openOverwriteDialog(preset.id, preset.name);
                            }}
                            title="Save current settings to this preset"
                            data-testid={`button-overwrite-${preset.id}`}
                          >
                            <Save className="w-3 h-3 text-accent" />
                          </button>
                          <button
                            type="button"
                            className="h-5 w-5 p-0 rounded flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity hover:bg-primary/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              startRename(preset.id, preset.name);
                            }}
                            title="Rename preset"
                            data-testid={`button-rename-${preset.id}`}
                          >
                            <Pencil className="w-3 h-3 text-primary" />
                          </button>
                          <button
                            type="button"
                            className="h-5 w-5 p-0 rounded flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity hover:bg-destructive/20 disabled:opacity-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePreset(preset.id);
                            }}
                            disabled={deletePresetMutation.isPending}
                            data-testid={`button-delete-${preset.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overwrite confirmation dialog */}
            <Dialog open={overwriteDialogOpen} onOpenChange={setOverwriteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Overwrite Preset?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground py-4">
                  Save current settings to "{selectedPresetForOverwrite?.name}"? This will replace the existing preset data.
                </p>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={confirmOverwrite} 
                    disabled={updatePresetMutation.isPending}
                    data-testid="button-confirm-overwrite"
                  >
                    {updatePresetMutation.isPending ? "Saving..." : "Overwrite"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
