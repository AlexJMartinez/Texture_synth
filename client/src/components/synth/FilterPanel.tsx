import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SynthParameters, FilterType } from "@shared/schema";
import { SlidersHorizontal, Shuffle, ChevronDown, ChevronUp } from "lucide-react";
import {
  type AdvancedFilterSettings,
  type FilterDriveType,
  type DualFilterRouting,
  type FormantVowel,
  defaultAdvancedFilterSettings,
  loadAdvancedFilterSettings,
  saveAdvancedFilterSettings,
  randomizeAdvancedFilterSettings,
} from "@/lib/advancedSynthSettings";

function randomizeFilter(): Partial<SynthParameters["filter"]> {
  const types: FilterType[] = ["lowpass", "highpass", "bandpass", "notch", "allpass", "peaking", "lowshelf", "highshelf", "comb"];
  return {
    type: types[Math.floor(Math.random() * types.length)],
    frequency: Math.exp(Math.random() * (Math.log(15000) - Math.log(100)) + Math.log(100)),
    resonance: Math.random() * 20,
    combDelay: Math.floor(5 + Math.random() * 45),
    gain: Math.floor(Math.random() * 24 - 12),
  };
}

interface FilterPanelProps {
  filter: SynthParameters["filter"];
  onChange: (filter: SynthParameters["filter"]) => void;
  advancedFilterSettings?: AdvancedFilterSettings;
  onAdvancedChange?: (settings: AdvancedFilterSettings) => void;
}

export function FilterPanel({ filter, onChange, advancedFilterSettings, onAdvancedChange }: FilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localAdvanced, setLocalAdvanced] = useState<AdvancedFilterSettings>(
    advancedFilterSettings || loadAdvancedFilterSettings()
  );

  useEffect(() => {
    if (advancedFilterSettings) {
      setLocalAdvanced(advancedFilterSettings);
    }
  }, [advancedFilterSettings]);

  const updateFilter = <K extends keyof SynthParameters["filter"]>(
    key: K,
    value: SynthParameters["filter"][K]
  ) => {
    onChange({ ...filter, [key]: value });
  };

  const updateAdvanced = <K extends keyof AdvancedFilterSettings>(
    key: K,
    value: AdvancedFilterSettings[K]
  ) => {
    const newSettings = { ...localAdvanced, [key]: value };
    setLocalAdvanced(newSettings);
    saveAdvancedFilterSettings(newSettings);
    onAdvancedChange?.(newSettings);
  };

  const handleRandomize = () => {
    const randomFilter = randomizeFilter();
    const randomAdvanced = randomizeAdvancedFilterSettings(50);
    onChange({ ...filter, ...randomFilter });
    const newAdvanced = { ...localAdvanced, ...randomAdvanced };
    setLocalAdvanced(newAdvanced);
    saveAdvancedFilterSettings(newAdvanced);
    onAdvancedChange?.(newAdvanced);
  };

  const showCombDelay = filter.type === "comb";
  const showGain = filter.type === "peaking" || filter.type === "lowshelf" || filter.type === "highshelf";

  return (
    <CollapsiblePanel
      title="Filter"
      icon={<SlidersHorizontal className="w-3 h-3 text-accent" />}
      defaultOpen={filter.enabled}
      data-testid="panel-filter"
      className={`transition-opacity ${!filter.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRandomize}
            data-testid="btn-randomize-filter"
          >
            <Shuffle className="w-3 h-3" />
          </Button>
          <Switch
            checked={filter.enabled}
            onCheckedChange={(v) => updateFilter("enabled", v)}
            className="scale-75"
            data-testid="switch-filter"
          />
        </div>
      }
    >
      <div className="space-y-1.5">
        <Select
          value={filter.type}
          onValueChange={(v) => updateFilter("type", v as FilterType)}
          disabled={!filter.enabled}
        >
          <SelectTrigger className="h-5 text-[10px]" data-testid="select-filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lowpass">LP</SelectItem>
            <SelectItem value="highpass">HP</SelectItem>
            <SelectItem value="bandpass">BP</SelectItem>
            <SelectItem value="notch">Notch</SelectItem>
            <SelectItem value="allpass">AP</SelectItem>
            <SelectItem value="peaking">Peak</SelectItem>
            <SelectItem value="lowshelf">LS</SelectItem>
            <SelectItem value="highshelf">HS</SelectItem>
            <SelectItem value="comb">Comb</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex justify-center gap-1 flex-wrap">
          <Knob
            value={filter.frequency}
            min={20}
            max={20000}
            step={1}
            label="Frq"
            unit="Hz"
            onChange={(v) => updateFilter("frequency", v)}
            logarithmic
            accentColor="accent"
            size="xs"
            modulationPath="filter.frequency"
          />
          <Knob
            value={filter.resonance}
            min={0}
            max={30}
            step={0.1}
            label="Res"
            unit="Q"
            onChange={(v) => updateFilter("resonance", v)}
            accentColor="primary"
            size="xs"
            modulationPath="filter.resonance"
          />
          {showCombDelay && (
            <Knob
              value={filter.combDelay}
              min={0.1}
              max={50}
              step={0.1}
              label="Dly"
              unit="ms"
              onChange={(v) => updateFilter("combDelay", v)}
              size="xs"
            />
          )}
          {showGain && (
            <Knob
              value={filter.gain}
              min={-24}
              max={24}
              step={0.5}
              label="Gn"
              unit="dB"
              onChange={(v) => updateFilter("gain", v)}
              size="xs"
              modulationPath="filter.gain"
            />
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-5 text-[9px] text-muted-foreground"
          onClick={() => setShowAdvanced(!showAdvanced)}
          data-testid="btn-toggle-advanced-filter"
        >
          Advanced {showAdvanced ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>

        {showAdvanced && (
          <div className="space-y-2 pt-1 border-t border-border/50">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground font-medium">Drive</span>
                <Switch
                  checked={localAdvanced.driveEnabled}
                  onCheckedChange={(v) => updateAdvanced("driveEnabled", v)}
                  className="scale-50"
                  data-testid="switch-filter-drive"
                />
              </div>
              {localAdvanced.driveEnabled && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <Select
                      value={localAdvanced.driveType}
                      onValueChange={(v) => updateAdvanced("driveType", v as FilterDriveType)}
                    >
                      <SelectTrigger className="h-5 text-[9px] flex-1" data-testid="select-filter-drive-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soft">Soft</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="tube">Tube</SelectItem>
                        <SelectItem value="tape">Tape</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={localAdvanced.drivePosition}
                      onValueChange={(v) => updateAdvanced("drivePosition", v as "pre" | "post")}
                    >
                      <SelectTrigger className="h-5 text-[9px] w-16" data-testid="select-filter-drive-pos">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pre">Pre</SelectItem>
                        <SelectItem value="post">Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-center">
                    <Knob
                      value={localAdvanced.driveAmount}
                      min={0}
                      max={100}
                      step={1}
                      label="Amt"
                      unit="%"
                      onChange={(v) => updateAdvanced("driveAmount", v)}
                      size="xs"
                      modulationPath="filter.driveAmount"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground font-medium">Dual Filter</span>
                <Select
                  value={localAdvanced.dualMode}
                  onValueChange={(v) => updateAdvanced("dualMode", v as DualFilterRouting)}
                >
                  <SelectTrigger className="h-5 text-[9px] w-20" data-testid="select-dual-filter-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                    <SelectItem value="parallel">Parallel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {localAdvanced.dualMode !== "off" && (
                <div className="space-y-1">
                  <Select
                    value={localAdvanced.filter2Type}
                    onValueChange={(v) => updateAdvanced("filter2Type", v as "lowpass" | "highpass" | "bandpass" | "notch")}
                  >
                    <SelectTrigger className="h-5 text-[9px]" data-testid="select-filter2-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lowpass">LP</SelectItem>
                      <SelectItem value="highpass">HP</SelectItem>
                      <SelectItem value="bandpass">BP</SelectItem>
                      <SelectItem value="notch">Notch</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-center gap-1">
                    <Knob
                      value={localAdvanced.filter2Frequency}
                      min={20}
                      max={20000}
                      step={1}
                      label="Frq2"
                      unit="Hz"
                      onChange={(v) => updateAdvanced("filter2Frequency", v)}
                      logarithmic
                      size="xs"
                      modulationPath="filter.filter2Frequency"
                    />
                    <Knob
                      value={localAdvanced.filter2Resonance}
                      min={0}
                      max={30}
                      step={0.1}
                      label="Res2"
                      unit="Q"
                      onChange={(v) => updateAdvanced("filter2Resonance", v)}
                      size="xs"
                      modulationPath="filter.filter2Resonance"
                    />
                    <Knob
                      value={localAdvanced.dualMix}
                      min={0}
                      max={100}
                      step={1}
                      label="Mix"
                      unit="%"
                      onChange={(v) => updateAdvanced("dualMix", v)}
                      size="xs"
                      modulationPath="filter.dualMix"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground font-medium">Formant</span>
                <Switch
                  checked={localAdvanced.formantEnabled}
                  onCheckedChange={(v) => updateAdvanced("formantEnabled", v)}
                  className="scale-50"
                  data-testid="switch-formant"
                />
              </div>
              {localAdvanced.formantEnabled && (
                <div className="flex gap-1 items-center">
                  <div className="flex gap-0.5">
                    {(["A", "E", "I", "O", "U"] as FormantVowel[]).map((vowel) => (
                      <Button
                        key={vowel}
                        size="sm"
                        variant={localAdvanced.formantVowel === vowel ? "default" : "outline"}
                        className="h-5 w-5 text-[9px] p-0"
                        onClick={() => updateAdvanced("formantVowel", vowel)}
                        data-testid={`btn-vowel-${vowel.toLowerCase()}`}
                      >
                        {vowel}
                      </Button>
                    ))}
                  </div>
                  <Knob
                    value={localAdvanced.formantMix}
                    min={0}
                    max={100}
                    step={1}
                    label="Mix"
                    unit="%"
                    onChange={(v) => updateAdvanced("formantMix", v)}
                    size="xs"
                    modulationPath="filter.formantMix"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground font-medium">Filter FM</span>
                <Switch
                  checked={localAdvanced.fmEnabled}
                  onCheckedChange={(v) => updateAdvanced("fmEnabled", v)}
                  className="scale-50"
                  data-testid="switch-filter-fm"
                />
              </div>
              {localAdvanced.fmEnabled && (
                <div className="flex gap-1 items-center">
                  <Select
                    value={localAdvanced.fmSource}
                    onValueChange={(v) => updateAdvanced("fmSource", v as "osc1" | "osc2" | "osc3" | "lfo")}
                  >
                    <SelectTrigger className="h-5 text-[9px] flex-1" data-testid="select-filter-fm-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="osc1">OSC1</SelectItem>
                      <SelectItem value="osc2">OSC2</SelectItem>
                      <SelectItem value="osc3">OSC3</SelectItem>
                      <SelectItem value="lfo">LFO</SelectItem>
                    </SelectContent>
                  </Select>
                  <Knob
                    value={localAdvanced.fmDepth}
                    min={0}
                    max={100}
                    step={1}
                    label="Depth"
                    unit="%"
                    onChange={(v) => updateAdvanced("fmDepth", v)}
                    size="xs"
                    modulationPath="filter.fmDepth"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground font-medium">Keytrack</span>
              <div className="flex items-center gap-1">
                <Switch
                  checked={localAdvanced.keytrackEnabled}
                  onCheckedChange={(v) => updateAdvanced("keytrackEnabled", v)}
                  className="scale-50"
                  data-testid="switch-keytrack"
                />
                {localAdvanced.keytrackEnabled && (
                  <Knob
                    value={localAdvanced.keytrackAmount}
                    min={-100}
                    max={100}
                    step={1}
                    label=""
                    unit="%"
                    onChange={(v) => updateAdvanced("keytrackAmount", v)}
                    size="xs"
                    modulationPath="filter.keytrackAmount"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground font-medium">Self-Osc</span>
              <Switch
                checked={localAdvanced.selfOscillation}
                onCheckedChange={(v) => updateAdvanced("selfOscillation", v)}
                className="scale-50"
                data-testid="switch-self-osc"
              />
            </div>
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}
