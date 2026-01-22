import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { ModalSynth, ModalMode } from "@shared/schema";
import { Gem, ChevronDown, ChevronRight } from "lucide-react";

interface ModalPanelProps {
  modal: ModalSynth;
  onChange: (modal: ModalSynth) => void;
}

export function ModalPanel({ modal, onChange }: ModalPanelProps) {
  const [modesOpen, setModesOpen] = useState(true);

  const updateModal = <K extends keyof ModalSynth>(key: K, value: ModalSynth[K]) => {
    onChange({ ...modal, [key]: value });
  };

  const updateMode = (modeKey: keyof ModalSynth["modes"], key: keyof ModalMode, value: number) => {
    onChange({
      ...modal,
      modes: {
        ...modal.modes,
        [modeKey]: { ...modal.modes[modeKey], [key]: value },
      },
    });
  };

  const modeLabels = ["1", "2", "3", "4"];
  const modeKeys: (keyof ModalSynth["modes"])[] = ["mode1", "mode2", "mode3", "mode4"];

  return (
    <CollapsiblePanel
      title="Modal"
      icon={<Gem className="w-3 h-3 text-orange-400" />}
      defaultOpen={modal.enabled}
      data-testid="panel-modal"
      className={`transition-opacity ${!modal.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={modal.enabled}
          onCheckedChange={(v) => updateModal("enabled", v)}
          className="scale-75"
          data-testid="switch-modal"
        />
      }
    >
      <div className="space-y-1.5">
        <div className="flex justify-center gap-1">
          <Knob
            value={modal.basePitch}
            min={20}
            max={2000}
            step={1}
            label="Pitch"
            unit="Hz"
            onChange={(v) => updateModal("basePitch", v)}
            logarithmic
            accentColor="primary"
            size="xs"
          />
          <Knob
            value={modal.impactNoise}
            min={0}
            max={100}
            step={1}
            label="Noise"
            unit="%"
            onChange={(v) => updateModal("impactNoise", v)}
            accentColor="accent"
            size="xs"
          />
          <Knob
            value={modal.impactDecay}
            min={1}
            max={100}
            step={1}
            label="Imp"
            unit="ms"
            onChange={(v) => updateModal("impactDecay", v)}
            size="xs"
          />
        </div>

        <div className="rounded border border-border/50 bg-muted/20">
          <button
            type="button"
            onClick={() => setModesOpen(!modesOpen)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground w-full"
            data-testid="button-toggle-modes"
          >
            {modesOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
            Resonant Modes
          </button>
          {modesOpen && (
            <div className="px-1.5 pb-1.5 space-y-1">
              {modeKeys.map((modeKey, i) => (
                <div key={modeKey} className="flex items-center gap-1" data-testid={`modal-mode-${i + 1}`}>
                  <span className="text-[9px] text-muted-foreground w-3">{modeLabels[i]}</span>
                  <Knob
                    value={modal.modes[modeKey].ratio}
                    min={0.5}
                    max={16}
                    step={0.01}
                    label="Rat"
                    onChange={(v) => updateMode(modeKey, "ratio", v)}
                    size="xs"
                    accentColor="accent"
                  />
                  <Knob
                    value={modal.modes[modeKey].decay}
                    min={10}
                    max={5000}
                    step={10}
                    label="Dec"
                    unit="ms"
                    onChange={(v) => updateMode(modeKey, "decay", v)}
                    size="xs"
                  />
                  <Knob
                    value={modal.modes[modeKey].level}
                    min={0}
                    max={100}
                    step={1}
                    label="Lvl"
                    unit="%"
                    onChange={(v) => updateMode(modeKey, "level", v)}
                    size="xs"
                    accentColor="primary"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
