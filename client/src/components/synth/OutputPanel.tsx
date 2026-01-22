import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SynthParameters } from "@shared/schema";
import { Volume2 } from "lucide-react";

interface OutputPanelProps {
  output: SynthParameters["output"];
  onChange: (output: SynthParameters["output"]) => void;
}

export function OutputPanel({ output, onChange }: OutputPanelProps) {
  const updateOutput = <K extends keyof SynthParameters["output"]>(
    key: K,
    value: SynthParameters["output"][K]
  ) => {
    onChange({ ...output, [key]: value });
  };

  return (
    <CollapsiblePanel
      title="Out"
      icon={<Volume2 className="w-3 h-3 text-accent" />}
      defaultOpen={true}
      data-testid="panel-output"
    >
      <div className="space-y-1.5">
        <div className="flex justify-center gap-2">
          <Knob
            value={output.volume}
            min={0}
            max={100}
            step={1}
            label="Vol"
            unit="%"
            onChange={(v) => updateOutput("volume", v)}
            size="sm"
            accentColor="accent"
          />
          <Knob
            value={output.pan}
            min={-100}
            max={100}
            step={1}
            label="Pan"
            onChange={(v) => updateOutput("pan", v)}
            size="xs"
          />
        </div>

        <div className="flex justify-between px-2 gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-1.5 h-5 rounded-full bg-muted overflow-hidden relative">
              <div 
                className="absolute bottom-0 w-full rounded-full transition-all"
                style={{ 
                  height: `${Math.max(0, (100 + output.pan) / 2) * (output.volume / 100)}%`,
                  background: 'linear-gradient(to top, hsl(var(--primary)), hsl(var(--accent)))',
                }}
              />
            </div>
            <span className="text-[8px] text-muted-foreground">L</span>
          </div>
          <div className="flex-1 flex items-end">
            <div className="relative h-1 rounded-full bg-muted overflow-hidden w-full">
              <div 
                className="absolute top-0 h-full w-0.5 rounded-full bg-accent transition-all"
                style={{ left: `calc(${(output.pan + 100) / 2}% - 1px)` }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-1.5 h-5 rounded-full bg-muted overflow-hidden relative">
              <div 
                className="absolute bottom-0 w-full rounded-full transition-all"
                style={{ 
                  height: `${Math.max(0, (100 - output.pan) / 2) * (output.volume / 100)}%`,
                  background: 'linear-gradient(to top, hsl(var(--primary)), hsl(var(--accent)))',
                }}
              />
            </div>
            <span className="text-[8px] text-muted-foreground">R</span>
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
