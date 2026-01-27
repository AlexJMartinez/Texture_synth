import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Waveshaper, WaveshaperCurve } from "@shared/schema";
import { Zap, ChevronDown, ChevronUp, Shuffle, Pencil } from "lucide-react";
import { CustomCurveEditor, type CurvePoint } from "./CustomCurveEditor";
import {
  type AdvancedWaveshaperSettings,
  type WaveshaperBandCurve,
  defaultAdvancedWaveshaperSettings,
  loadAdvancedWaveshaperSettings,
  saveAdvancedWaveshaperSettings,
  randomizeAdvancedWaveshaperSettings,
} from "@/lib/advancedSynthSettings";

interface WaveshaperPanelProps {
  waveshaper: Waveshaper;
  onChange: (waveshaper: Waveshaper) => void;
  advancedSettings?: AdvancedWaveshaperSettings;
  onAdvancedChange?: (settings: AdvancedWaveshaperSettings) => void;
}

const curveOptions: { value: WaveshaperCurve; label: string }[] = [
  { value: "softclip", label: "Soft Clip" },
  { value: "hardclip", label: "Hard Clip" },
  { value: "foldback", label: "Foldback" },
  { value: "sinefold", label: "Sine Fold" },
  { value: "chebyshev", label: "Chebyshev" },
  { value: "asymmetric", label: "Asymmetric" },
  { value: "tube", label: "Tube" },
];

const bandCurveOptions: { value: WaveshaperBandCurve; label: string }[] = [
  { value: "softclip", label: "Soft" },
  { value: "hardclip", label: "Hard" },
  { value: "foldback", label: "Fold" },
  { value: "sinefold", label: "Sine" },
  { value: "chebyshev", label: "Cheby" },
  { value: "tube", label: "Tube" },
  { value: "rectifier", label: "Rect" },
  { value: "sinecrush", label: "Crush" },
];

const oversampleOptions = [
  { value: "none", label: "None" },
  { value: "2x", label: "2x" },
  { value: "4x", label: "4x" },
];

export function WaveshaperPanel({ waveshaper, onChange, advancedSettings, onAdvancedChange }: WaveshaperPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localAdvanced, setLocalAdvanced] = useState<AdvancedWaveshaperSettings>(
    advancedSettings || loadAdvancedWaveshaperSettings()
  );

  useEffect(() => {
    if (advancedSettings) {
      setLocalAdvanced(advancedSettings);
    }
  }, [advancedSettings]);

  const updateWaveshaper = <K extends keyof Waveshaper>(key: K, value: Waveshaper[K]) => {
    onChange({ ...waveshaper, [key]: value });
  };

  const updateAdvanced = <K extends keyof AdvancedWaveshaperSettings>(
    key: K,
    value: AdvancedWaveshaperSettings[K]
  ) => {
    const newSettings = { ...localAdvanced, [key]: value };
    setLocalAdvanced(newSettings);
    saveAdvancedWaveshaperSettings(newSettings);
    onAdvancedChange?.(newSettings);
  };

  const updateMultiband = (key: string, value: any) => {
    const newMultiband = { ...localAdvanced.multiband, [key]: value };
    const newSettings = { ...localAdvanced, multiband: newMultiband };
    setLocalAdvanced(newSettings);
    saveAdvancedWaveshaperSettings(newSettings);
    onAdvancedChange?.(newSettings);
  };

  const handleRandomize = () => {
    const randomAdvanced = randomizeAdvancedWaveshaperSettings(50);
    const newSettings = { 
      ...localAdvanced, 
      ...randomAdvanced,
      multiband: { ...localAdvanced.multiband, ...randomAdvanced.multiband }
    };
    setLocalAdvanced(newSettings);
    saveAdvancedWaveshaperSettings(newSettings);
    onAdvancedChange?.(newSettings);
  };

  return (
    <CollapsiblePanel
      title="Waveshaper"
      icon={<Zap className="w-3 h-3 text-primary" />}
      defaultOpen={false}
      data-testid="panel-waveshaper"
      headerExtra={
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRandomize}
            data-testid="btn-randomize-waveshaper"
          >
            <Shuffle className="w-3 h-3" />
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Enable</span>
          <Switch
            checked={waveshaper.enabled}
            onCheckedChange={(v) => updateWaveshaper("enabled", v)}
            className="scale-50"
            data-testid="switch-waveshaper"
          />
        </div>

        <div className={`space-y-2 ${!waveshaper.enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10">Curve</span>
            <Select
              value={waveshaper.curve}
              onValueChange={(v) => updateWaveshaper("curve", v as WaveshaperCurve)}
            >
              <SelectTrigger className="h-6 text-[10px] flex-1" data-testid="select-waveshaper-curve">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {curveOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10">OS</span>
            <Select
              value={waveshaper.oversample}
              onValueChange={(v) => updateWaveshaper("oversample", v as "none" | "2x" | "4x")}
            >
              <SelectTrigger className="h-6 text-[10px] flex-1" data-testid="select-waveshaper-oversample">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {oversampleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center gap-2">
            <Knob
              value={waveshaper.drive}
              min={0}
              max={100}
              step={1}
              label="Drive"
              unit="%"
              onChange={(v) => updateWaveshaper("drive", v)}
              accentColor="primary"
              size="xs"
              modulationPath="waveshaper.amount"
            />
            <Knob
              value={waveshaper.mix}
              min={0}
              max={100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => updateWaveshaper("mix", v)}
              accentColor="accent"
              size="xs"
              modulationPath="waveshaper.mix"
            />
          </div>

          <div className="border-t border-border/50 pt-1.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Pre Filter</span>
              <Switch
                checked={waveshaper.preFilterEnabled}
                onCheckedChange={(v) => updateWaveshaper("preFilterEnabled", v)}
                className="scale-50"
                data-testid="switch-pre-filter"
              />
            </div>
            {waveshaper.preFilterEnabled && (
              <div className="flex justify-center">
                <Knob
                  value={waveshaper.preFilterFreq}
                  min={20}
                  max={20000}
                  step={1}
                  label="Freq"
                  unit="Hz"
                  onChange={(v) => updateWaveshaper("preFilterFreq", v)}
                  logarithmic
                  size="xs"
                  modulationPath="waveshaper.preFilterFreq"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Post Filter</span>
              <Switch
                checked={waveshaper.postFilterEnabled}
                onCheckedChange={(v) => updateWaveshaper("postFilterEnabled", v)}
                className="scale-50"
                data-testid="switch-post-filter"
              />
            </div>
            {waveshaper.postFilterEnabled && (
              <div className="flex justify-center">
                <Knob
                  value={waveshaper.postFilterFreq}
                  min={20}
                  max={20000}
                  step={1}
                  label="Freq"
                  unit="Hz"
                  onChange={(v) => updateWaveshaper("postFilterFreq", v)}
                  logarithmic
                  size="xs"
                  modulationPath="waveshaper.postFilterFreq"
                />
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full h-5 text-[9px] text-muted-foreground"
            onClick={() => setShowAdvanced(!showAdvanced)}
            data-testid="btn-toggle-advanced-waveshaper"
          >
            Advanced {showAdvanced ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-medium">Asymmetric</span>
                  <Switch
                    checked={localAdvanced.asymmetricEnabled}
                    onCheckedChange={(v) => updateAdvanced("asymmetricEnabled", v)}
                    className="scale-50"
                    data-testid="switch-asymmetric"
                  />
                </div>
                {localAdvanced.asymmetricEnabled && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <span className="text-[8px] text-muted-foreground">+ Curve</span>
                        <Select
                          value={localAdvanced.positiveCurve}
                          onValueChange={(v) => updateAdvanced("positiveCurve", v as WaveshaperBandCurve)}
                        >
                          <SelectTrigger className="h-5 text-[9px]" data-testid="select-pos-curve">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {bandCurveOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-[9px]">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <span className="text-[8px] text-muted-foreground">- Curve</span>
                        <Select
                          value={localAdvanced.negativeCurve}
                          onValueChange={(v) => updateAdvanced("negativeCurve", v as WaveshaperBandCurve)}
                        >
                          <SelectTrigger className="h-5 text-[9px]" data-testid="select-neg-curve">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {bandCurveOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-[9px]">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-center gap-1">
                      <Knob
                        value={localAdvanced.positiveAmount}
                        min={0}
                        max={100}
                        step={1}
                        label="+Amt"
                        unit="%"
                        onChange={(v) => updateAdvanced("positiveAmount", v)}
                        size="xs"
                        modulationPath="waveshaper.positiveAmount"
                      />
                      <Knob
                        value={localAdvanced.negativeAmount}
                        min={0}
                        max={100}
                        step={1}
                        label="-Amt"
                        unit="%"
                        onChange={(v) => updateAdvanced("negativeAmount", v)}
                        size="xs"
                        modulationPath="waveshaper.negativeAmount"
                      />
                      <Knob
                        value={localAdvanced.dcOffset}
                        min={-50}
                        max={50}
                        step={1}
                        label="DC"
                        unit="%"
                        onChange={(v) => updateAdvanced("dcOffset", v)}
                        size="xs"
                        modulationPath="waveshaper.dcOffset"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-medium">Multiband</span>
                  <Switch
                    checked={localAdvanced.multiband.enabled}
                    onCheckedChange={(v) => updateMultiband("enabled", v)}
                    className="scale-50"
                    data-testid="switch-multiband"
                  />
                </div>
                {localAdvanced.multiband.enabled && (
                  <div className="space-y-1">
                    <div className="flex justify-center gap-1">
                      <Knob
                        value={localAdvanced.multiband.lowCrossover}
                        min={20}
                        max={500}
                        step={10}
                        label="LoCut"
                        unit="Hz"
                        onChange={(v) => updateMultiband("lowCrossover", v)}
                        size="xs"
                        modulationPath="waveshaper.multiband.lowCrossover"
                      />
                      <Knob
                        value={localAdvanced.multiband.highCrossover}
                        min={1000}
                        max={10000}
                        step={100}
                        label="HiCut"
                        unit="Hz"
                        onChange={(v) => updateMultiband("highCrossover", v)}
                        size="xs"
                        modulationPath="waveshaper.multiband.highCrossover"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="text-center">
                        <span className="text-[8px] text-muted-foreground">Low</span>
                        <Select
                          value={localAdvanced.multiband.lowCurve}
                          onValueChange={(v) => updateMultiband("lowCurve", v)}
                        >
                          <SelectTrigger className="h-5 text-[8px]" data-testid="select-low-curve">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {bandCurveOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-[9px]">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-center mt-1">
                          <Knob
                            value={localAdvanced.multiband.lowDrive}
                            min={0}
                            max={100}
                            step={1}
                            label=""
                            unit="%"
                            onChange={(v) => updateMultiband("lowDrive", v)}
                            size="xs"
                            modulationPath="waveshaper.multiband.lowDrive"
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[8px] text-muted-foreground">Mid</span>
                        <Select
                          value={localAdvanced.multiband.midCurve}
                          onValueChange={(v) => updateMultiband("midCurve", v)}
                        >
                          <SelectTrigger className="h-5 text-[8px]" data-testid="select-mid-curve">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {bandCurveOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-[9px]">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-center mt-1">
                          <Knob
                            value={localAdvanced.multiband.midDrive}
                            min={0}
                            max={100}
                            step={1}
                            label=""
                            unit="%"
                            onChange={(v) => updateMultiband("midDrive", v)}
                            size="xs"
                            modulationPath="waveshaper.multiband.midDrive"
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[8px] text-muted-foreground">High</span>
                        <Select
                          value={localAdvanced.multiband.highCurve}
                          onValueChange={(v) => updateMultiband("highCurve", v)}
                        >
                          <SelectTrigger className="h-5 text-[8px]" data-testid="select-high-curve">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {bandCurveOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-[9px]">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-center mt-1">
                          <Knob
                            value={localAdvanced.multiband.highDrive}
                            min={0}
                            max={100}
                            step={1}
                            label=""
                            unit="%"
                            onChange={(v) => updateMultiband("highDrive", v)}
                            size="xs"
                            modulationPath="waveshaper.multiband.highDrive"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-medium">Dynamic</span>
                  <Switch
                    checked={localAdvanced.dynamicEnabled}
                    onCheckedChange={(v) => updateAdvanced("dynamicEnabled", v)}
                    className="scale-50"
                    data-testid="switch-dynamic"
                  />
                </div>
                {localAdvanced.dynamicEnabled && (
                  <div className="flex justify-center gap-1">
                    <Knob
                      value={localAdvanced.dynamicSensitivity}
                      min={0}
                      max={100}
                      step={1}
                      label="Sens"
                      unit="%"
                      onChange={(v) => updateAdvanced("dynamicSensitivity", v)}
                      size="xs"
                      modulationPath="waveshaper.dynamicSensitivity"
                    />
                    <Knob
                      value={localAdvanced.dynamicAttack}
                      min={1}
                      max={500}
                      step={1}
                      label="Atk"
                      unit="ms"
                      onChange={(v) => updateAdvanced("dynamicAttack", v)}
                      size="xs"
                    />
                    <Knob
                      value={localAdvanced.dynamicRelease}
                      min={10}
                      max={2000}
                      step={10}
                      label="Rel"
                      unit="ms"
                      onChange={(v) => updateAdvanced("dynamicRelease", v)}
                      size="xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-1">
                <Knob
                  value={localAdvanced.chebyshevOrder}
                  min={2}
                  max={7}
                  step={1}
                  label="ChebOrd"
                  unit=""
                  onChange={(v) => updateAdvanced("chebyshevOrder", v)}
                  size="xs"
                  modulationPath="waveshaper.chebyshevOrder"
                />
                <Knob
                  value={localAdvanced.foldbackIterations}
                  min={1}
                  max={5}
                  step={1}
                  label="FoldItr"
                  unit=""
                  onChange={(v) => updateAdvanced("foldbackIterations", v)}
                  size="xs"
                  modulationPath="waveshaper.foldbackIterations"
                />
              </div>

              <div className="space-y-1 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground font-medium">Custom Curve</span>
                  </div>
                  <Switch
                    checked={localAdvanced.customCurveEnabled}
                    onCheckedChange={(v) => updateAdvanced("customCurveEnabled", v)}
                    className="scale-50"
                    data-testid="switch-custom-curve"
                  />
                </div>
                {localAdvanced.customCurveEnabled && (
                  <CustomCurveEditor
                    points={localAdvanced.customCurvePoints.map(p => ({
                      x: (p.x + 1) / 2,
                      y: (p.y + 1) / 2
                    }))}
                    onChange={(points: CurvePoint[]) => {
                      const normalizedPoints = points.map(p => ({
                        x: p.x * 2 - 1,
                        y: p.y * 2 - 1
                      }));
                      updateAdvanced("customCurvePoints", normalizedPoints);
                    }}
                    width={180}
                    height={120}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
