import { useState, useRef, useCallback, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Convolver } from "@shared/schema";
import { Radio, Upload, Trash2, RotateCcw, Disc, ChevronDown } from "lucide-react";
import { BUILTIN_IRS, generateBuiltinIR, type BuiltinIR } from "@/lib/builtinIRs";

export interface ConvolverSettings {
  predelay: number;
  decay: number;
  lowCut: number;
  highCut: number;
  reverse: boolean;
  stretch: number;
}

export const defaultConvolverSettings: ConvolverSettings = {
  predelay: 0,
  decay: 100,
  lowCut: 20,
  highCut: 20000,
  reverse: false,
  stretch: 1.0,
};

interface ConvolverPanelProps {
  convolver: Convolver;
  onChange: (convolver: Convolver) => void;
  onIRLoaded?: (buffer: AudioBuffer, name: string) => void;
  settings?: ConvolverSettings;
  onSettingsChange?: (settings: ConvolverSettings) => void;
}

const IR_STORAGE_KEY = "synth-custom-irs";
const CONVOLVER_SETTINGS_KEY = "synth-convolver-settings";

interface StoredIR {
  name: string;
  data: string;
}

function getStoredIRs(): StoredIR[] {
  try {
    const stored = localStorage.getItem(IR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveIRs(irs: StoredIR[]) {
  localStorage.setItem(IR_STORAGE_KEY, JSON.stringify(irs));
}

export function loadConvolverSettings(): ConvolverSettings {
  try {
    const stored = localStorage.getItem(CONVOLVER_SETTINGS_KEY);
    if (stored) {
      return { ...defaultConvolverSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Fall through to default
  }
  return { ...defaultConvolverSettings };
}

export function saveConvolverSettings(settings: ConvolverSettings) {
  localStorage.setItem(CONVOLVER_SETTINGS_KEY, JSON.stringify(settings));
}

const categoryIcons: Record<string, string> = {
  plate: "🔲",
  spring: "〰️",
  room: "🏠",
  metallic: "⚙️",
  synthetic: "💎",
};

const categoryLabels: Record<string, string> = {
  plate: "Plates",
  spring: "Springs",
  room: "Rooms",
  metallic: "Metal",
  synthetic: "Synth",
};

function BuiltinIRSelector({ selectedIR, onSelect }: { selectedIR: string | null; onSelect: (id: string) => void }) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  const categories = ["plate", "spring", "room", "metallic", "synthetic"] as const;
  const selectedIRInfo = BUILTIN_IRS.find(ir => ir.id === selectedIR);
  
  return (
    <div className="space-y-1">
      <div className="text-[9px] text-muted-foreground">Built-in (One-Shot Optimized)</div>
      
      {selectedIRInfo && (
        <div className="flex items-center gap-1.5 px-1.5 py-1 bg-primary/15 border border-primary/40 rounded text-[10px]">
          <Disc className="w-3 h-3 text-primary" />
          <span className="font-medium">{selectedIRInfo.name}</span>
          <span className="text-muted-foreground ml-auto">{Math.round(selectedIRInfo.duration * 1000)}ms</span>
        </div>
      )}
      
      <div className="grid grid-cols-5 gap-0.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
            className={`px-1 py-1 text-[8px] rounded transition-colors ${
              expandedCategory === cat 
                ? "bg-primary/20 text-primary" 
                : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"
            }`}
            title={categoryLabels[cat]}
            data-testid={`button-ir-category-${cat}`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>
      
      {expandedCategory && (
        <div className="space-y-0.5 max-h-24 overflow-y-auto bg-muted/20 rounded p-1">
          {BUILTIN_IRS.filter(ir => ir.category === expandedCategory).map((ir) => (
            <button
              key={ir.id}
              type="button"
              onClick={() => {
                onSelect(ir.id);
                setExpandedCategory(null);
              }}
              className={`w-full flex items-center justify-between px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                selectedIR === ir.id
                  ? "bg-primary/20 border border-primary/50"
                  : "hover:bg-muted/50"
              }`}
              data-testid={`button-ir-${ir.id}`}
            >
              <span>{ir.name}</span>
              <span className="text-muted-foreground">{Math.round(ir.duration * 1000)}ms</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConvolverPanel({ convolver, onChange, onIRLoaded, settings, onSettingsChange }: ConvolverPanelProps) {
  const [customIRs, setCustomIRs] = useState<StoredIR[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentSettings = settings || defaultConvolverSettings;

  useEffect(() => {
    setCustomIRs(getStoredIRs());
  }, []);

  const updateConvolver = <K extends keyof Convolver>(key: K, value: Convolver[K]) => {
    onChange({ ...convolver, [key]: value });
  };

  const updateSettings = <K extends keyof ConvolverSettings>(key: K, value: ConvolverSettings[K]) => {
    if (onSettingsChange) {
      const newSettings = { ...currentSettings, [key]: value };
      onSettingsChange(newSettings);
      saveConvolverSettings(newSettings);
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      
      const irName = file.name.replace(/\.[^.]+$/, "");
      const newIR: StoredIR = { name: irName, data: base64 };
      
      const updatedIRs = [...customIRs.filter(ir => ir.name !== irName), newIR];
      setCustomIRs(updatedIRs);
      saveIRs(updatedIRs);
      
      updateConvolver("irName", irName);
      updateConvolver("useCustomIR", true);
      
      if (onIRLoaded) {
        onIRLoaded(audioBuffer, irName);
      }
      
      audioContext.close();
    } catch (error) {
      console.error("Failed to load IR file:", error);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [customIRs, onIRLoaded, updateConvolver]);

  const deleteIR = useCallback((name: string) => {
    const updatedIRs = customIRs.filter(ir => ir.name !== name);
    setCustomIRs(updatedIRs);
    saveIRs(updatedIRs);
    
    if (convolver.irName === name) {
      updateConvolver("irName", "none");
      updateConvolver("useCustomIR", false);
    }
  }, [customIRs, convolver.irName, updateConvolver]);

  const selectIR = useCallback((name: string) => {
    updateConvolver("irName", name);
    updateConvolver("useCustomIR", true);
  }, [updateConvolver]);

  return (
    <CollapsiblePanel
      title="Convolver"
      icon={<Radio className="w-3 h-3 text-primary" />}
      defaultOpen={false}
      data-testid="panel-convolver"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Enable</span>
          <Switch
            checked={convolver.enabled}
            onCheckedChange={(v) => updateConvolver("enabled", v)}
            className="scale-50"
            data-testid="switch-convolver"
          />
        </div>

        <div className={`space-y-2 ${!convolver.enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-3 gap-1">
            <Knob
              value={convolver.mix}
              min={0}
              max={100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => updateConvolver("mix", v)}
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={currentSettings.predelay}
              min={0}
              max={500}
              step={1}
              label="Pre"
              unit="ms"
              onChange={(v) => updateSettings("predelay", v)}
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={currentSettings.decay}
              min={10}
              max={100}
              step={1}
              label="Size"
              unit="%"
              onChange={(v) => updateSettings("decay", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-1">
            <Knob
              value={currentSettings.lowCut}
              min={20}
              max={2000}
              step={1}
              label="Lo Cut"
              unit="Hz"
              onChange={(v) => updateSettings("lowCut", v)}
              accentColor="accent"
              size="xs"
              logarithmic
            />
            <Knob
              value={currentSettings.highCut}
              min={1000}
              max={20000}
              step={100}
              label="Hi Cut"
              unit="Hz"
              onChange={(v) => updateSettings("highCut", v)}
              accentColor="accent"
              size="xs"
              logarithmic
            />
            <Knob
              value={currentSettings.stretch}
              min={0.5}
              max={2.0}
              step={0.01}
              label="Stretch"
              unit="x"
              onChange={(v) => updateSettings("stretch", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
          
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Reverse</span>
              <Switch
                checked={currentSettings.reverse}
                onCheckedChange={(v) => updateSettings("reverse", v)}
                className="scale-50"
                data-testid="switch-convolver-reverse"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px]"
              onClick={() => {
                if (onSettingsChange) {
                  onSettingsChange({ ...defaultConvolverSettings });
                  saveConvolverSettings(defaultConvolverSettings);
                }
              }}
              title="Reset to defaults"
              data-testid="button-convolver-reset"
            >
              <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
              Reset
            </Button>
          </div>

          <div className="border-t border-border/50 pt-1.5 space-y-1.5">
            <div className="text-[10px] text-muted-foreground mb-1">Impulse Responses</div>
            
            <BuiltinIRSelector 
              selectedIR={!convolver.useCustomIR ? convolver.irName : null}
              onSelect={(id) => {
                updateConvolver("irName", id);
                updateConvolver("useCustomIR", false);
                const buffer = generateBuiltinIR(id, 44100);
                if (buffer && onIRLoaded) {
                  const irInfo = BUILTIN_IRS.find(ir => ir.id === id);
                  onIRLoaded(buffer, irInfo?.name || id);
                }
              }}
            />
            
            <div className="text-[9px] text-muted-foreground mt-2 mb-1">Custom IRs</div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.aiff,.aif,.mp3,.ogg"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-ir-file"
            />
            
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              data-testid="button-upload-ir"
            >
              <Upload className="w-3 h-3 mr-1" />
              {isLoading ? "Loading..." : "Upload IR"}
            </Button>

            {customIRs.length > 0 && (
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {customIRs.map((ir) => (
                  <div
                    key={ir.name}
                    className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                      convolver.irName === ir.name && convolver.useCustomIR
                        ? "bg-primary/20 border border-primary/50"
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                    onClick={() => selectIR(ir.name)}
                    data-testid={`ir-item-${ir.name}`}
                  >
                    <span className="truncate flex-1">{ir.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteIR(ir.name);
                      }}
                      className="ml-1 p-0.5 hover:text-destructive transition-colors"
                      data-testid={`button-delete-ir-${ir.name}`}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
