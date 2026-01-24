import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SpectralScrambler } from "@shared/schema";

interface SpectralScramblerPanelProps {
  spectralScrambler: SpectralScrambler;
  onChange: (update: Partial<SpectralScrambler>) => void;
}

export function SpectralScramblerPanel({ spectralScrambler, onChange }: SpectralScramblerPanelProps) {
  return (
    <CollapsiblePanel 
      title="Spectral Scrambler" 
      defaultOpen={spectralScrambler.enabled}
      headerExtra={
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            id="spectral-enabled"
            checked={spectralScrambler.enabled}
            onCheckedChange={(checked) => onChange({ enabled: checked })}
            data-testid="switch-spectral-enabled"
          />
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">FFT Size</Label>
            <Select 
              value={spectralScrambler.fftSize} 
              onValueChange={(v) => onChange({ fftSize: v as "256" | "512" | "1024" | "2048" })}
            >
              <SelectTrigger className="w-20 h-8" data-testid="select-fft-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="256">256</SelectItem>
                <SelectItem value="512">512</SelectItem>
                <SelectItem value="1024">1024</SelectItem>
                <SelectItem value="2048">2048</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Knob
            label="Scramble"
            value={spectralScrambler.scrambleAmount}
            min={0}
            max={100}
            onChange={(v) => onChange({ scrambleAmount: v })}
            size="sm"
            data-testid="knob-scramble-amount"
          />
          
          <Knob
            label="Bin Shift"
            value={spectralScrambler.binShift}
            min={-50}
            max={50}
            onChange={(v) => onChange({ binShift: v })}
            size="sm"
            data-testid="knob-bin-shift"
          />
          
          <Knob
            label="Mix"
            value={spectralScrambler.mix}
            min={0}
            max={100}
            onChange={(v) => onChange({ mix: v })}
            size="sm"
            data-testid="knob-spectral-mix"
          />
          
          <div className="flex flex-col items-center gap-1">
            <Label className="text-xs text-muted-foreground">Freeze</Label>
            <Switch
              id="spectral-freeze"
              checked={spectralScrambler.freeze}
              onCheckedChange={(checked) => onChange({ freeze: checked })}
              data-testid="switch-spectral-freeze"
            />
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          FFT-based frequency bin manipulation for metallic, glitchy textures. 
          Scramble randomizes bin positions, Bin Shift moves frequencies up/down.
        </p>
      </div>
    </CollapsiblePanel>
  );
}
