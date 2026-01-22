import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Knob } from "./Knob";
import type { SynthParameters, EnvelopeCurve } from "@shared/schema";
import { Clock } from "lucide-react";

interface EnvelopePanelProps {
  envelope: SynthParameters["envelope"];
  onChange: (envelope: SynthParameters["envelope"]) => void;
}

export function EnvelopePanel({ envelope, onChange }: EnvelopePanelProps) {
  const updateEnvelope = <K extends keyof SynthParameters["envelope"]>(
    key: K,
    value: SynthParameters["envelope"][K]
  ) => {
    onChange({ ...envelope, [key]: value });
  };

  const totalDuration = envelope.attack + envelope.hold + envelope.decay;
  const attackWidth = (envelope.attack / Math.max(totalDuration, 1)) * 100;
  const holdWidth = (envelope.hold / Math.max(totalDuration, 1)) * 100;
  const decayWidth = (envelope.decay / Math.max(totalDuration, 1)) * 100;

  return (
    <Card className="synth-panel" data-testid="panel-envelope">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 text-primary" />
          Envelope (AHD)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-16 w-full rounded-md relative overflow-hidden" style={{
          background: 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--background)))',
        }}>
          <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="envGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path
              d={`M 0,40 
                  L ${attackWidth},5 
                  L ${attackWidth + holdWidth},5 
                  ${envelope.curve === 'exponential' 
                    ? `Q ${attackWidth + holdWidth + decayWidth * 0.5},20 ${100},40`
                    : envelope.curve === 'logarithmic'
                    ? `Q ${attackWidth + holdWidth + decayWidth * 0.2},35 ${100},40`
                    : `L ${100},40`
                  }
                  L 100,40 Z`}
              fill="url(#envGradient)"
              fillOpacity="0.2"
            />
            <path
              d={`M 0,40 
                  L ${attackWidth},5 
                  L ${attackWidth + holdWidth},5 
                  ${envelope.curve === 'exponential' 
                    ? `Q ${attackWidth + holdWidth + decayWidth * 0.5},20 ${100},40`
                    : envelope.curve === 'logarithmic'
                    ? `Q ${attackWidth + holdWidth + decayWidth * 0.2},35 ${100},40`
                    : `L ${100},40`
                  }`}
              fill="none"
              stroke="url(#envGradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line x1={attackWidth} y1="5" x2={attackWidth} y2="40" 
                  stroke="hsl(var(--primary))" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.5" />
            <line x1={attackWidth + holdWidth} y1="5" x2={attackWidth + holdWidth} y2="40" 
                  stroke="hsl(var(--accent))" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.5" />
          </svg>
          <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2">
            <span className="text-[10px] text-primary/70 font-mono">A</span>
            <span className="text-[10px] text-foreground/50 font-mono">H</span>
            <span className="text-[10px] text-accent/70 font-mono">D</span>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <Knob
            value={envelope.attack}
            min={0}
            max={2000}
            step={1}
            label="Attack"
            unit="ms"
            onChange={(v) => updateEnvelope("attack", v)}
            accentColor="primary"
            size="sm"
          />
          <Knob
            value={envelope.hold}
            min={0}
            max={2000}
            step={1}
            label="Hold"
            unit="ms"
            onChange={(v) => updateEnvelope("hold", v)}
            size="sm"
          />
          <Knob
            value={envelope.decay}
            min={0}
            max={5000}
            step={1}
            label="Decay"
            unit="ms"
            onChange={(v) => updateEnvelope("decay", v)}
            accentColor="accent"
            size="sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Curve</label>
          <Select
            value={envelope.curve}
            onValueChange={(v) => updateEnvelope("curve", v as EnvelopeCurve)}
          >
            <SelectTrigger className="h-8 text-xs" data-testid="select-curve">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="exponential">Exponential</SelectItem>
              <SelectItem value="logarithmic">Logarithmic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
