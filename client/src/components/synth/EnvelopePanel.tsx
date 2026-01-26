import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Knob } from "./Knob";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { Envelope, EnvelopeCurve } from "@shared/schema";
import { Clock, Shuffle, Filter, Music, Volume2 } from "lucide-react";

function randomizeEnvelope(): Partial<Envelope> {
  const curves: EnvelopeCurve[] = ["linear", "exponential", "logarithmic"];
  return {
    attack: Math.floor(Math.random() * 100),
    hold: Math.floor(Math.random() * 100),
    decay: Math.floor(50 + Math.random() * 500),
    curve: curves[Math.floor(Math.random() * curves.length)],
    amount: Math.floor(-50 + Math.random() * 100),
  };
}

interface EnvelopePanelProps {
  envelope: Envelope;
  onChange: (envelope: Envelope) => void;
  type: "filter" | "pitch" | "amp";
}

export function EnvelopePanel({ envelope, onChange, type }: EnvelopePanelProps) {
  const updateEnvelope = <K extends keyof Envelope>(
    key: K,
    value: Envelope[K]
  ) => {
    onChange({ ...envelope, [key]: value });
  };

  const handleRandomize = () => {
    onChange({ ...envelope, ...randomizeEnvelope() });
  };

  const totalDuration = envelope.attack + envelope.hold + envelope.decay;
  const attackWidth = (envelope.attack / Math.max(totalDuration, 1)) * 100;
  const holdWidth = (envelope.hold / Math.max(totalDuration, 1)) * 100;

  const config = {
    filter: {
      title: "Filter Env",
      icon: <Filter className="w-3 h-3 text-primary" />,
      amountLabel: "Depth",
      amountUnit: "%",
      amountMin: -100,
      amountMax: 100,
      showAmount: true,
      showEnable: true,
    },
    pitch: {
      title: "Pitch Env",
      icon: <Music className="w-3 h-3 text-accent" />,
      amountLabel: "Drop",
      amountUnit: "st",
      amountMin: -48,
      amountMax: 48,
      showAmount: true,
      showEnable: true,
    },
    amp: {
      title: "Amp Env",
      icon: <Volume2 className="w-3 h-3 text-primary" />,
      amountLabel: "",
      amountUnit: "%",
      amountMin: -100,
      amountMax: 100,
      showAmount: false,
      showEnable: false,
    },
  }[type];

  const isEnabled = type === "amp" ? true : envelope.enabled;
  const index = type === "filter" ? 1 : type === "pitch" ? 2 : 3;

  return (
    <CollapsiblePanel
      title={config.title}
      icon={config.icon}
      defaultOpen={true}
      data-testid={`panel-envelope-${type}`}
      className={`transition-opacity ${!isEnabled ? 'opacity-50' : ''}`}
      headerExtra={
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRandomize}
            data-testid={`btn-randomize-env-${type}`}
            className="h-5 w-5"
          >
            <Shuffle className="w-3 h-3" />
          </Button>
          {config.showEnable && (
            <Switch
              checked={envelope.enabled}
              onCheckedChange={(v) => updateEnvelope("enabled", v)}
              className="scale-75"
              data-testid={`switch-env-${type}`}
            />
          )}
        </div>
      }
    >
      <div className="space-y-2">
        <div className="h-8 w-full rounded relative overflow-hidden" style={{
          background: 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--background)))',
        }}>
          <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`envGradient-${type}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path
              d={`M 0,22 
                  L ${attackWidth},3 
                  L ${attackWidth + holdWidth},3 
                  ${envelope.curve === 'exponential' 
                    ? `Q ${attackWidth + holdWidth + (100 - attackWidth - holdWidth) * 0.5},12 ${100},22`
                    : envelope.curve === 'logarithmic'
                    ? `Q ${attackWidth + holdWidth + (100 - attackWidth - holdWidth) * 0.2},18 ${100},22`
                    : `L ${100},22`
                  }
                  L 100,22 Z`}
              fill={`url(#envGradient-${type})`}
              fillOpacity="0.15"
            />
            <path
              d={`M 0,22 
                  L ${attackWidth},3 
                  L ${attackWidth + holdWidth},3 
                  ${envelope.curve === 'exponential' 
                    ? `Q ${attackWidth + holdWidth + (100 - attackWidth - holdWidth) * 0.5},12 ${100},22`
                    : envelope.curve === 'logarithmic'
                    ? `Q ${attackWidth + holdWidth + (100 - attackWidth - holdWidth) * 0.2},18 ${100},22`
                    : `L ${100},22`
                  }`}
              fill="none"
              stroke={`url(#envGradient-${type})`}
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="flex justify-between gap-2">
          <Knob
            value={envelope.attack}
            min={0}
            max={type === "pitch" ? 2000 : 10000}
            step={1}
            label="Attack"
            unit="ms"
            onChange={(v) => updateEnvelope("attack", v)}
            accentColor="primary"
            size="xs"
            logarithmic={type !== "pitch"}
            defaultValue={0}
          />
          <Knob
            value={envelope.hold}
            min={0}
            max={type === "pitch" ? 2000 : 5000}
            step={1}
            label="Hold"
            unit="ms"
            onChange={(v) => updateEnvelope("hold", v)}
            size="xs"
            defaultValue={0}
          />
          <Knob
            value={envelope.decay}
            min={0}
            max={type === "pitch" ? 10000 : 30000}
            step={1}
            label="Decay"
            unit="ms"
            onChange={(v) => updateEnvelope("decay", v)}
            accentColor="accent"
            size="xs"
            logarithmic={type !== "pitch"}
            defaultValue={type === "amp" ? 500 : 200}
          />
          {config.showAmount && (
            <Knob
              value={envelope.amount}
              min={config.amountMin}
              max={config.amountMax}
              step={1}
              label={config.amountLabel}
              unit={config.amountUnit}
              onChange={(v) => updateEnvelope("amount", v)}
              size="xs"
            />
          )}
        </div>

        <div className="flex justify-center">
          <Select
            value={envelope.curve}
            onValueChange={(v) => updateEnvelope("curve", v as EnvelopeCurve)}
            disabled={!isEnabled}
          >
            <SelectTrigger className="h-6 text-[10px] px-2 w-24" data-testid={`select-curve-${type}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="exponential">Exp</SelectItem>
              <SelectItem value="logarithmic">Log</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
