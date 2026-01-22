import { useState } from "react";
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

export function PresetPanel({ currentParams, onLoadPreset }: PresetPanelProps) {
  const [presets, setPresets] = useState<Preset[]>(() => {
    const stored = localStorage.getItem("synth-presets");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });
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
    localStorage.setItem("synth-presets", JSON.stringify(updated));
    setNewPresetName("");
    setSaveDialogOpen(false);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem("synth-presets", JSON.stringify(updated));
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
        const updated = [...presets, ...imported];
        setPresets(updated);
        localStorage.setItem("synth-presets", JSON.stringify(updated));
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
    <Card className="synth-panel h-full" data-testid="panel-presets">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" />
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
        <ScrollArea className="h-[280px] px-4 pb-4">
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">Factory</h4>
              <div className="space-y-1">
                {fullFactoryPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onLoadPreset(preset.parameters)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover-elevate active-elevate-2 bg-muted/30 border border-border/50 transition-colors"
                    data-testid={`preset-factory-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {presets.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">User Presets</h4>
                <div className="space-y-1">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover-elevate bg-muted/30 border border-border/50 group"
                    >
                      <button
                        onClick={() => onLoadPreset(preset.parameters)}
                        className="flex-1 text-left"
                        data-testid={`preset-user-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        {preset.name}
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset.id);
                        }}
                        data-testid={`button-delete-${preset.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
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
