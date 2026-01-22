import { useState, useRef, useCallback, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Convolver } from "@shared/schema";
import { Radio, Upload, Trash2 } from "lucide-react";

interface ConvolverPanelProps {
  convolver: Convolver;
  onChange: (convolver: Convolver) => void;
  onIRLoaded?: (buffer: AudioBuffer, name: string) => void;
}

const IR_STORAGE_KEY = "synth-custom-irs";

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

export function ConvolverPanel({ convolver, onChange, onIRLoaded }: ConvolverPanelProps) {
  const [customIRs, setCustomIRs] = useState<StoredIR[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomIRs(getStoredIRs());
  }, []);

  const updateConvolver = <K extends keyof Convolver>(key: K, value: Convolver[K]) => {
    onChange({ ...convolver, [key]: value });
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
          <div className="flex justify-center">
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
          </div>

          <div className="border-t border-border/50 pt-1.5 space-y-1.5">
            <div className="text-[10px] text-muted-foreground mb-1">Custom IRs</div>
            
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
              <div className="space-y-1 max-h-24 overflow-y-auto">
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

            {customIRs.length === 0 && (
              <p className="text-[9px] text-muted-foreground text-center py-1">
                No custom IRs loaded. Upload WAV or AIFF files.
              </p>
            )}
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
