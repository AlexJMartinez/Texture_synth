import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Envelope, EnvelopeCurve, EnvelopeTarget } from "@shared/schema";
import { Clock } from "lucide-react";

interface EnvelopePanelProps {
  envelope: Envelope;
  onChange: (envelope: Envelope) => void;
  title: string;
  index: number;
}

export function EnvelopePanel({ envelope, onChange, title, index }: EnvelopePanelProps) {
  const updateEnvelope = <K extends keyof Envelope>(
    key: K,
    value: Envelope[K]
  ) => {
    onChange({ ...envelope, [key]: value });
  };

  const totalDuration = envelope.attack + envelope.hold + envelope.decay;
  const attackWidth = (envelope.attack / Math.max(totalDuration, 1)) * 100;
  const holdWidth = (envelope.hold / Math.max(totalDuration, 1)) * 100;
  const decayWidth = (envelope.decay / Math.max(totalDuration, 1)) * 100;

  return (
    <CollapsiblePanel
      title={title}
      icon={<Clock className="w-3 h-3 text-primary" />}
      defaultOpen={envelope.enabled}
      data-testid={`panel-envelope-${index}`}
      className={`transition-opacity ${!envelope.enabled ? 'opacity-50' : ''}`}
      headerExtra={
        <Switch
          checked={envelope.enabled}
          onCheckedChange={(v) => updateEnvelope("enabled", v)}
          className="scale-75"
          data-testid={`switch-env-${index}`}
        />
      }
    >
      <div className="space-y-1.5">
        <div className="h-8 w-full rounded relative overflow-hidden" style={{
          background: 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--background)))',
        }}>
          <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`envGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path
              d={`M 0,22 
                  L ${attackWidth},3 
                  L ${attackWidth + holdWidth},3 
                  ${envelope.curve === 'exponential' 
                    ? `Q ${attackWidth + holdWidth + decayWidth * 0.5},12 ${100},22`
                    : envelope.curve === 'logarithmic'
                    ? `Q ${attackWidth + holdWidth + decayWidth * 0.2},18 ${100},22`
                    : `L ${100},22`
                  }
                  L 100,22 Z`}
              fill={`url(#envGradient-${index})`}
              fillOpacity="0.15"
            />
            <path
              d={`M 0,22 
                  L ${attackWidth},3 
                  L ${attackWidth + holdWidth},3 
                  ${envelope.curve === 'exponential' 
                    ? `Q ${attackWidth + holdWidth + decayWidth * 0.5},12 ${100},22`
                    : envelope.curve === 'logarithmic'
                    ? `Q ${attackWidth + holdWidth + decayWidth * 0.2},18 ${100},22`
                    : `L ${100},22`
                  }`}
              fill="none"
              stroke={`url(#envGradient-${index})`}
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="flex justify-center gap-1">
          <Knob
            value={envelope.attack}
            min={0}
            max={2000}
            step={1}
            label="A"
            unit="ms"
            onChange={(v) => updateEnvelope("attack", v)}
            accentColor="primary"
            size="xs"
          />
          <Knob
            value={envelope.hold}
            min={0}
            max={2000}
            step={1}
            label="H"
            unit="ms"
            onChange={(v) => updateEnvelope("hold", v)}
            size="xs"
          />
          <Knob
            value={envelope.decay}
            min={0}
            max={5000}
            step={1}
            label="D"
            unit="ms"
            onChange={(v) => updateEnvelope("decay", v)}
            accentColor="accent"
            size="xs"
          />
          <Knob
            value={envelope.amount}
            min={-100}
            max={100}
            step={1}
            label="Amt"
            unit="%"
            onChange={(v) => updateEnvelope("amount", v)}
            size="xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-1">
          <Select
            value={envelope.curve}
            onValueChange={(v) => updateEnvelope("curve", v as EnvelopeCurve)}
            disabled={!envelope.enabled}
          >
            <SelectTrigger className="h-5 text-[10px] px-1" data-testid={`select-curve-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Lin</SelectItem>
              <SelectItem value="exponential">Exp</SelectItem>
              <SelectItem value="logarithmic">Log</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={envelope.target}
            onValueChange={(v) => updateEnvelope("target", v as EnvelopeTarget)}
            disabled={!envelope.enabled}
          >
            <SelectTrigger className="h-5 text-[10px] px-1" data-testid={`select-target-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amplitude">Amp</SelectItem>
              <SelectItem value="filter">Flt</SelectItem>
              <SelectItem value="pitch">Pch</SelectItem>
              <SelectItem value="osc1">O1</SelectItem>
              <SelectItem value="osc2">O2</SelectItem>
              <SelectItem value="osc3">O3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
