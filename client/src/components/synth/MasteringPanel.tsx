import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Mastering } from "@shared/schema";
import { AudioWaveform } from "lucide-react";

interface MasteringPanelProps {
  mastering: Mastering;
  onChange: (mastering: Mastering) => void;
}

export function MasteringPanel({ mastering, onChange }: MasteringPanelProps) {
  const update = <K extends keyof Mastering>(key: K, value: Mastering[K]) => {
    onChange({ ...mastering, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Mastering"
      icon={<AudioWaveform className="w-3 h-3 text-purple-400" />}
      defaultOpen={false}
      data-testid="panel-mastering"
    >
      <div className="space-y-1.5">
        <div className={`rounded border border-border/50 p-1.5 ${!mastering.compressorEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Compressor</span>
            <Switch
              checked={mastering.compressorEnabled}
              onCheckedChange={(v) => update("compressorEnabled", v)}
              className="scale-50"
              data-testid="switch-compressor"
            />
          </div>
          <div className="flex justify-center gap-1 flex-wrap">
            <Knob
              value={mastering.compressorThreshold}
              min={-40}
              max={0}
              step={1}
              label="Thresh"
              unit="dB"
              onChange={(v) => update("compressorThreshold", v)}
              accentColor="primary"
              size="xs"
            />
            <Knob
              value={mastering.compressorRatio}
              min={1}
              max={20}
              step={0.5}
              label="Ratio"
              unit=":1"
              onChange={(v) => update("compressorRatio", v)}
              accentColor="primary"
              size="xs"
            />
            <Knob
              value={mastering.compressorAttack}
              min={0.1}
              max={100}
              step={0.5}
              label="Attack"
              unit="ms"
              onChange={(v) => update("compressorAttack", v)}
              accentColor="primary"
              size="xs"
            />
            <Knob
              value={mastering.compressorRelease}
              min={10}
              max={1000}
              step={10}
              label="Release"
              unit="ms"
              onChange={(v) => update("compressorRelease", v)}
              accentColor="primary"
              size="xs"
            />
          </div>
          <div className="flex justify-center gap-1 mt-1">
            <Knob
              value={mastering.compressorKnee}
              min={0}
              max={40}
              step={1}
              label="Knee"
              unit="dB"
              onChange={(v) => update("compressorKnee", v)}
              accentColor="primary"
              size="xs"
            />
            <Knob
              value={mastering.compressorMakeup}
              min={0}
              max={24}
              step={0.5}
              label="Makeup"
              unit="dB"
              onChange={(v) => update("compressorMakeup", v)}
              accentColor="primary"
              size="xs"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!mastering.exciterEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">HF Exciter</span>
            <Switch
              checked={mastering.exciterEnabled}
              onCheckedChange={(v) => update("exciterEnabled", v)}
              className="scale-50"
              data-testid="switch-exciter"
            />
          </div>
          <div className="flex justify-center gap-1">
            <Knob
              value={mastering.exciterFreq}
              min={2000}
              max={12000}
              step={100}
              label="Freq"
              unit="Hz"
              onChange={(v) => update("exciterFreq", v)}
              logarithmic
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={mastering.exciterAmount}
              min={0}
              max={100}
              step={1}
              label="Amount"
              unit="%"
              onChange={(v) => update("exciterAmount", v)}
              accentColor="accent"
              size="xs"
            />
            <Knob
              value={mastering.exciterMix}
              min={0}
              max={100}
              step={1}
              label="Mix"
              unit="%"
              onChange={(v) => update("exciterMix", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>

        <div className={`rounded border border-border/50 p-1.5 ${!mastering.stereoEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Stereo Width</span>
            <Switch
              checked={mastering.stereoEnabled}
              onCheckedChange={(v) => update("stereoEnabled", v)}
              className="scale-50"
              data-testid="switch-stereo"
            />
          </div>
          <div className="flex justify-center">
            <Knob
              value={mastering.stereoWidth}
              min={0}
              max={200}
              step={5}
              label="Width"
              unit="%"
              onChange={(v) => update("stereoWidth", v)}
              accentColor="accent"
              size="xs"
            />
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
