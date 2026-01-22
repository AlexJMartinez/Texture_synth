import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Knob } from "./Knob";
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
    <Card className="synth-panel" data-testid="panel-output">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Volume2 className="w-4 h-4 text-accent" />
          Output
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center gap-6">
          <Knob
            value={output.volume}
            min={0}
            max={100}
            step={1}
            label="Volume"
            unit="%"
            onChange={(v) => updateOutput("volume", v)}
            size="lg"
            accentColor="accent"
          />
          <Knob
            value={output.pan}
            min={-100}
            max={100}
            step={1}
            label="Pan"
            onChange={(v) => updateOutput("pan", v)}
            size="md"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">L</span>
            <span className="text-muted-foreground">Pan</span>
            <span className="text-muted-foreground">R</span>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="absolute top-0 h-full w-1 rounded-full bg-accent transition-all"
              style={{ 
                left: `calc(${(output.pan + 100) / 2}% - 2px)`,
                boxShadow: '0 0 8px hsl(var(--accent))',
              }}
            />
            <div 
              className="absolute top-0 left-1/2 h-full w-px bg-foreground/20"
            />
          </div>
        </div>

        <div className="flex justify-between px-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-8 rounded-full bg-muted overflow-hidden relative">
              <div 
                className="absolute bottom-0 w-full rounded-full transition-all"
                style={{ 
                  height: `${Math.max(0, (100 + output.pan) / 2) * (output.volume / 100)}%`,
                  background: 'linear-gradient(to top, hsl(var(--primary)), hsl(var(--accent)))',
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">L</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-8 rounded-full bg-muted overflow-hidden relative">
              <div 
                className="absolute bottom-0 w-full rounded-full transition-all"
                style={{ 
                  height: `${Math.max(0, (100 - output.pan) / 2) * (output.volume / 100)}%`,
                  background: 'linear-gradient(to top, hsl(var(--primary)), hsl(var(--accent)))',
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">R</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
