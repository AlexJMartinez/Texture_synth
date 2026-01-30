import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import type { SynthParameters, ModalExciterType } from "@shared/schema";
import { Sparkles } from "lucide-react";

interface SynthEngineSelectorProps {
  modal: SynthParameters["modal"];
  additive: SynthParameters["additive"];
  onModalChange: (modal: SynthParameters["modal"]) => void;
  onAdditiveChange: (additive: SynthParameters["additive"]) => void;
}

type SynthEngineType = "modal" | "additive";

export function SynthEngineSelector({
  modal,
  additive,
  onModalChange,
  onAdditiveChange,
}: SynthEngineSelectorProps) {
  const [selectedEngine, setSelectedEngine] = useState<SynthEngineType>(() => {
    if (additive.enabled) return "additive";
    if (modal.enabled) return "modal";
    return "modal";
  });

  useEffect(() => {
    if (additive.enabled && selectedEngine !== "additive") setSelectedEngine("additive");
    else if (modal.enabled && selectedEngine !== "modal" && !additive.enabled) setSelectedEngine("modal");
  }, [modal.enabled, additive.enabled]);

  const isCurrentEngineEnabled = 
    (selectedEngine === "modal" && modal.enabled) ||
    (selectedEngine === "additive" && additive.enabled);

  const toggleCurrentEngine = (enabled: boolean) => {
    switch (selectedEngine) {
      case "modal":
        onModalChange({ ...modal, enabled });
        break;
      case "additive":
        onAdditiveChange({ ...additive, enabled });
        break;
    }
  };

  const engineLabels: Record<SynthEngineType, string> = {
    modal: "Modal",
    additive: "Additive",
  };

  return (
    <Card className="synth-panel" data-testid="panel-synth-engine">
      <CardHeader className="pb-1 pt-1.5 px-2">
        <CardTitle className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs font-medium">
          <div className="flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-accent" />
            <span>Synth</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Select
              value={selectedEngine}
              onValueChange={(v) => setSelectedEngine(v as SynthEngineType)}
            >
              <SelectTrigger className="h-5 w-[70px] text-[10px] px-1" data-testid="select-synth-engine">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modal">Modal</SelectItem>
                <SelectItem value="additive">Additive</SelectItem>
              </SelectContent>
            </Select>
            <Switch
              checked={isCurrentEngineEnabled}
              onCheckedChange={toggleCurrentEngine}
              className="scale-75"
              data-testid={`switch-engine-${selectedEngine}`}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        <div className={`transition-opacity ${!isCurrentEngineEnabled ? 'opacity-50' : ''}`}>
          {selectedEngine === "modal" && (
            <ModalPanelContent modal={modal} onChange={onModalChange} />
          )}
          {selectedEngine === "additive" && (
            <AdditivePanelContent additive={additive} onChange={onAdditiveChange} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ModalPanelContent({ modal, onChange }: { modal: SynthParameters["modal"]; onChange: (m: SynthParameters["modal"]) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-center gap-1">
        <Knob value={modal.basePitch} min={20} max={2000} step={1} label="Pit" unit="Hz" onChange={(v) => onChange({ ...modal, basePitch: v })} logarithmic accentColor="accent" size="xs" data-testid="knob-modal-pitch" />
        <Knob value={modal.modeCount} min={1} max={4} step={1} label="Mds" onChange={(v) => onChange({ ...modal, modeCount: v })} size="xs" data-testid="knob-modal-count" />
        <Knob value={modal.inharmonicity} min={0} max={100} step={1} label="Inh" unit="%" onChange={(v) => onChange({ ...modal, inharmonicity: v })} size="xs" data-testid="knob-modal-inharmonicity" />
      </div>
      <div className="flex justify-center gap-1">
        <Knob value={modal.impactNoise} min={0} max={100} step={1} label="Nse" unit="%" onChange={(v) => onChange({ ...modal, impactNoise: v })} size="xs" data-testid="knob-modal-noise" />
        <Knob value={modal.impactDecay} min={1} max={100} step={1} label="Imp" unit="ms" onChange={(v) => onChange({ ...modal, impactDecay: v })} size="xs" data-testid="knob-modal-impact" />
      </div>
      <Select
        value={modal.exciterType}
        onValueChange={(v) => onChange({ ...modal, exciterType: v as ModalExciterType })}
      >
        <SelectTrigger className="h-5 text-[10px]" data-testid="select-modal-exciter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="noise">Noise</SelectItem>
          <SelectItem value="impulse">Impulse</SelectItem>
          <SelectItem value="mallet">Mallet</SelectItem>
          <SelectItem value="pluck">Pluck</SelectItem>
        </SelectContent>
      </Select>
      <div className="text-[9px] text-muted-foreground text-center">Modes</div>
      <div className="grid grid-cols-4 gap-0.5">
        {(['mode1', 'mode2', 'mode3', 'mode4'] as const).map((modeKey, i) => {
          const mode = modal.modes[modeKey];
          const isActive = i < modal.modeCount;
          return (
            <div key={modeKey} className={`flex flex-col items-center gap-0.5 p-0.5 rounded bg-muted/30 ${!isActive ? 'opacity-30' : ''}`}>
              <span className="text-[8px] text-muted-foreground">M{i + 1}</span>
              <Knob value={mode.ratio} min={0.5} max={16} step={0.1} label="R" onChange={(v) => onChange({ ...modal, modes: { ...modal.modes, [modeKey]: { ...mode, ratio: v } } })} size="xs" />
              <Knob value={mode.level} min={0} max={100} step={1} label="L" unit="%" onChange={(v) => onChange({ ...modal, modes: { ...modal.modes, [modeKey]: { ...mode, level: v } } })} size="xs" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdditivePanelContent({ additive, onChange }: { additive: SynthParameters["additive"]; onChange: (a: SynthParameters["additive"]) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-center gap-1">
        <Knob value={additive.basePitch} min={20} max={2000} step={1} label="Pit" unit="Hz" onChange={(v) => onChange({ ...additive, basePitch: v })} logarithmic accentColor="accent" size="xs" data-testid="knob-additive-pitch" />
        <Knob value={additive.partialCount} min={1} max={8} step={1} label="Cnt" onChange={(v) => onChange({ ...additive, partialCount: v })} size="xs" data-testid="knob-additive-count" />
        <Knob value={additive.randomness} min={0} max={100} step={1} label="Rnd" unit="%" onChange={(v) => onChange({ ...additive, randomness: v })} size="xs" data-testid="knob-additive-random" />
      </div>
      <div className="flex justify-center gap-1">
        <Knob value={additive.spread} min={0} max={100} step={1} label="Str" unit="%" onChange={(v) => onChange({ ...additive, spread: v })} size="xs" data-testid="knob-additive-spread" />
        <Knob value={additive.decaySlope} min={0} max={100} step={1} label="Dec" unit="%" onChange={(v) => onChange({ ...additive, decaySlope: v })} size="xs" data-testid="knob-additive-slope" />
      </div>
      <div className="text-[9px] text-muted-foreground text-center">Partials</div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-0.5">
        {(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'] as const).map((pKey, i) => {
          const partial = additive.partials[pKey];
          const isActive = i < additive.partialCount;
          return (
            <div key={pKey} className={`flex flex-col items-center gap-0.5 ${!isActive ? 'opacity-30' : ''}`}>
              <span className="text-[8px] text-muted-foreground">{i + 1}</span>
              <Knob value={partial.level} min={0} max={100} step={1} label="" onChange={(v) => onChange({ ...additive, partials: { ...additive.partials, [pKey]: { ...partial, level: v } } })} size="xs" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

