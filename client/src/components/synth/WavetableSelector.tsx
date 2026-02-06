import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { ChevronDown, ChevronRight, Waves, Upload, Edit3 } from "lucide-react";
import type { OscWavetableSettings, WavetableCategory, WavetableInterpolation } from "@/lib/wavetableSettings";
import { wavetableCategoryNames } from "@/lib/wavetableSettings";
import { getAllWavetables } from "@/lib/wavetableEngine";

interface WavetableSelectorProps {
  settings: OscWavetableSettings;
  onChange: (settings: OscWavetableSettings) => void;
  onOpenEditor?: () => void;
  onImport?: () => void;
  disabled?: boolean;
  oscIndex: number;
}

export function WavetableSelector({
  settings,
  onChange,
  onOpenEditor,
  onImport,
  disabled = false,
  oscIndex,
}: WavetableSelectorProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const allWavetables = useMemo(() => getAllWavetables(), []);
  
  // Group wavetables by category
  const wavetablesByCategory = useMemo(() => {
    return allWavetables.reduce((acc, wt) => {
      if (!acc[wt.category]) acc[wt.category] = [];
      acc[wt.category]!.push(wt);
      return acc;
    }, {} as Partial<Record<WavetableCategory, typeof allWavetables>>);
  }, [allWavetables]);

  const selectedWavetable = useMemo(
    () => allWavetables.find((wt) => wt.id === settings.wavetableId),
    [allWavetables, settings.wavetableId]
  );
  
  const updateSetting = <K extends keyof OscWavetableSettings>(
    key: K,
    value: OscWavetableSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };
  
  return (
    <div className={`space-y-1.5 ${!settings.enabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Waves className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-medium">Wavetable</span>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(v) => updateSetting("enabled", v)}
          className="scale-50"
          disabled={disabled}
          data-testid={`switch-wavetable-${oscIndex}`}
        />
      </div>
      
      {settings.enabled && (
        <>
          <Select
            value={settings.wavetableId}
            onValueChange={(v) => updateSetting("wavetableId", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-6 text-[10px]" data-testid={`select-wavetable-${oscIndex}`}>
              <SelectValue placeholder="Select wavetable">
                {selectedWavetable?.name || "Select..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {(Object.entries(wavetablesByCategory) as [WavetableCategory, typeof allWavetables][]).map(
                ([category, wavetables]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {wavetableCategoryNames[category]}
                    </div>
                    {wavetables.map((wt) => (
                      <SelectItem key={wt.id} value={wt.id} className="text-[10px]">
                        {wt.name}
                      </SelectItem>
                    ))}
                  </div>
                )
              )}
            </SelectContent>
          </Select>
          
          <div className="flex justify-center gap-1">
            <Knob
              value={settings.position}
              min={0}
              max={100}
              step={1}
              label="WT Pos"
              unit="%"
              onChange={(v) => updateSetting("position", v)}
              accentColor="accent"
              size="xs"
              disabled={disabled}
              modulationPath={`wavetable.osc${oscIndex}.position`}
            />
            <Knob
              value={settings.positionModDepth}
              min={-100}
              max={100}
              step={1}
              label="Mod"
              unit="%"
              onChange={(v) => updateSetting("positionModDepth", v)}
              size="xs"
              disabled={disabled}
              modulationPath={`wavetable.osc${oscIndex}.positionModDepth`}
            />
          </div>
          
          <div className="flex gap-1">
            {onImport && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onImport}
                disabled={disabled}
                className="flex-1 h-5 text-[9px] gap-1"
                data-testid={`btn-import-wavetable-${oscIndex}`}
              >
                <Upload className="w-2.5 h-2.5" />
                Import
              </Button>
            )}
            {onOpenEditor && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onOpenEditor}
                disabled={disabled}
                className="flex-1 h-5 text-[9px] gap-1"
                data-testid={`btn-edit-wavetable-${oscIndex}`}
              >
                <Edit3 className="w-2.5 h-2.5" />
                Editor
              </Button>
            )}
          </div>
          
          <div className="border-t border-border/30 pt-1 mt-1">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover-elevate w-full rounded px-1 py-0.5"
              data-testid={`button-wavetable-advanced-toggle-${oscIndex}`}
              aria-expanded={advancedOpen}
            >
              {advancedOpen ? <ChevronDown className="w-2 h-2" /> : <ChevronRight className="w-2 h-2" />}
              <span>Advanced</span>
            </button>
            
            {advancedOpen && (
              <div className="space-y-1.5 mt-1">
                <Select
                  value={settings.interpolation}
                  onValueChange={(v) => updateSetting("interpolation", v as WavetableInterpolation)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-5 text-[9px]" data-testid={`select-wt-interpolation-${oscIndex}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (stepped)</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="cubic">Cubic (smooth)</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex justify-center gap-1">
                  <Knob
                    value={settings.unison}
                    min={1}
                    max={8}
                    step={1}
                    label="Unison"
                    onChange={(v) => updateSetting("unison", v)}
                    size="xs"
                    disabled={disabled}
                  />
                  <Knob
                    value={settings.unisonDetune}
                    min={0}
                    max={100}
                    step={1}
                    label="Detune"
                    unit="ct"
                    onChange={(v) => updateSetting("unisonDetune", v)}
                    size="xs"
                    disabled={disabled}
                  />
                  <Knob
                    value={settings.unisonBlend}
                    min={0}
                    max={100}
                    step={1}
                    label="Width"
                    unit="%"
                    onChange={(v) => updateSetting("unisonBlend", v)}
                    size="xs"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
