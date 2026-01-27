import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsiblePanel } from "./CollapsiblePanel";
import type { SpectralScrambler } from "@shared/schema";
import type { AdvancedSpectralSettings } from "@/lib/advancedSynthSettings";

interface SpectralScramblerPanelProps {
  spectralScrambler: SpectralScrambler;
  onChange: (update: Partial<SpectralScrambler>) => void;
  advancedSettings: AdvancedSpectralSettings;
  onAdvancedChange: (update: Partial<AdvancedSpectralSettings>) => void;
}

export function SpectralScramblerPanel({ spectralScrambler, onChange, advancedSettings, onAdvancedChange }: SpectralScramblerPanelProps) {
  const updateTilt = (update: Partial<AdvancedSpectralSettings["tilt"]>) => {
    onAdvancedChange({ tilt: { ...advancedSettings.tilt, ...update } });
  };
  
  const updateBlur = (update: Partial<AdvancedSpectralSettings["blur"]>) => {
    onAdvancedChange({ blur: { ...advancedSettings.blur, ...update } });
  };
  
  const updateHarmonicResynth = (update: Partial<AdvancedSpectralSettings["harmonicResynth"]>) => {
    onAdvancedChange({ harmonicResynth: { ...advancedSettings.harmonicResynth, ...update } });
  };

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
      <div className="space-y-4">
        {/* Basic Controls */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-4 items-end">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">FFT Size</Label>
            <Select 
              value={spectralScrambler.fftSize} 
              onValueChange={(v) => onChange({ fftSize: v as "256" | "512" | "1024" | "2048" })}
            >
              <SelectTrigger className="w-full h-8" data-testid="select-fft-size">
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
            modulationPath="spectralScrambler.scrambleAmount"
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
            label="Stretch"
            value={spectralScrambler.stretch}
            min={0.5}
            max={2.0}
            step={0.05}
            onChange={(v) => onChange({ stretch: v })}
            size="sm"
            unit="x"
            data-testid="knob-stretch"
          />
          
          <Knob
            label="Density"
            value={spectralScrambler.binDensity}
            min={5}
            max={100}
            onChange={(v) => onChange({ binDensity: v })}
            size="sm"
            unit="%"
            data-testid="knob-bin-density"
          />
          
          <Knob
            label="Gate"
            value={spectralScrambler.gateThreshold}
            min={-60}
            max={0}
            onChange={(v) => onChange({ gateThreshold: v })}
            size="sm"
            unit="dB"
            data-testid="knob-gate-threshold"
          />
          
          <Knob
            label="Mix"
            value={spectralScrambler.mix}
            min={0}
            max={100}
            onChange={(v) => onChange({ mix: v })}
            size="sm"
            data-testid="knob-spectral-mix"
            modulationPath="spectralScrambler.mix"
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
        
        {/* Advanced Effects Section */}
        <div className="border-t border-border pt-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Advanced Effects</p>
          
          {/* Spectral Tilt */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="tilt-enabled"
                checked={advancedSettings.tilt.enabled}
                onCheckedChange={(checked) => updateTilt({ enabled: checked })}
                data-testid="switch-tilt-enabled"
              />
              <Label htmlFor="tilt-enabled" className="text-xs">Tilt</Label>
            </div>
            <Knob
              label="Amount"
              value={advancedSettings.tilt.amount}
              min={-100}
              max={100}
              onChange={(v) => updateTilt({ amount: v })}
              size="sm"
              data-testid="knob-tilt-amount"
              disabled={!advancedSettings.tilt.enabled}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="tilt-env-follow"
                checked={advancedSettings.tilt.envelopeFollow}
                onCheckedChange={(checked) => updateTilt({ envelopeFollow: checked })}
                data-testid="switch-tilt-env-follow"
                disabled={!advancedSettings.tilt.enabled}
              />
              <Label htmlFor="tilt-env-follow" className="text-xs">Env</Label>
            </div>
            <Knob
              label="Env Amt"
              value={advancedSettings.tilt.envelopeAmount}
              min={-100}
              max={100}
              onChange={(v) => updateTilt({ envelopeAmount: v })}
              size="sm"
              data-testid="knob-tilt-env-amount"
              disabled={!advancedSettings.tilt.enabled || !advancedSettings.tilt.envelopeFollow}
            />
          </div>
          
          {/* Spectral Blur */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="blur-enabled"
                checked={advancedSettings.blur.enabled}
                onCheckedChange={(checked) => updateBlur({ enabled: checked })}
                data-testid="switch-blur-enabled"
              />
              <Label htmlFor="blur-enabled" className="text-xs">Blur</Label>
            </div>
            <Knob
              label="Amount"
              value={advancedSettings.blur.amount}
              min={0}
              max={100}
              onChange={(v) => updateBlur({ amount: v })}
              size="sm"
              data-testid="knob-blur-amount"
              disabled={!advancedSettings.blur.enabled}
            />
            <Knob
              label="Direction"
              value={advancedSettings.blur.direction}
              min={-100}
              max={100}
              onChange={(v) => updateBlur({ direction: v })}
              size="sm"
              data-testid="knob-blur-direction"
              disabled={!advancedSettings.blur.enabled}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="blur-asymmetric"
                checked={advancedSettings.blur.asymmetric}
                onCheckedChange={(checked) => updateBlur({ asymmetric: checked })}
                data-testid="switch-blur-asymmetric"
                disabled={!advancedSettings.blur.enabled}
              />
              <Label htmlFor="blur-asymmetric" className="text-xs">Asymmetric</Label>
            </div>
          </div>
          
          {/* Harmonic Resynthesis */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="harmonic-enabled"
                checked={advancedSettings.harmonicResynth.enabled}
                onCheckedChange={(checked) => updateHarmonicResynth({ enabled: checked })}
                data-testid="switch-harmonic-enabled"
              />
              <Label htmlFor="harmonic-enabled" className="text-xs">Harmonic</Label>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Mode</Label>
              <Select 
                value={advancedSettings.harmonicResynth.harmonicsMode} 
                onValueChange={(v) => updateHarmonicResynth({ harmonicsMode: v as "all" | "odd" | "even" | "prime" })}
                disabled={!advancedSettings.harmonicResynth.enabled}
              >
                <SelectTrigger className="w-20 h-8" data-testid="select-harmonic-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="odd">Odd</SelectItem>
                  <SelectItem value="even">Even</SelectItem>
                  <SelectItem value="prime">Prime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Knob
              label="Spread"
              value={advancedSettings.harmonicResynth.harmonicSpread}
              min={0}
              max={100}
              onChange={(v) => updateHarmonicResynth({ harmonicSpread: v })}
              size="sm"
              unit="%"
              data-testid="knob-harmonic-spread"
              disabled={!advancedSettings.harmonicResynth.enabled}
            />
            <Knob
              label="Boost"
              value={advancedSettings.harmonicResynth.harmonicBoost}
              min={0}
              max={24}
              onChange={(v) => updateHarmonicResynth({ harmonicBoost: v })}
              size="sm"
              unit="dB"
              data-testid="knob-harmonic-boost"
              disabled={!advancedSettings.harmonicResynth.enabled}
            />
            <Knob
              label="Cut"
              value={advancedSettings.harmonicResynth.inharmonicCut}
              min={-48}
              max={0}
              onChange={(v) => updateHarmonicResynth({ inharmonicCut: v })}
              size="sm"
              unit="dB"
              data-testid="knob-inharmonic-cut"
              disabled={!advancedSettings.harmonicResynth.enabled}
            />
            <Knob
              label="Decay"
              value={advancedSettings.harmonicResynth.harmonicDecay}
              min={0}
              max={100}
              onChange={(v) => updateHarmonicResynth({ harmonicDecay: v })}
              size="sm"
              unit="%"
              data-testid="knob-harmonic-decay"
              disabled={!advancedSettings.harmonicResynth.enabled}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="harmonic-detect"
                checked={advancedSettings.harmonicResynth.fundamentalDetect}
                onCheckedChange={(checked) => updateHarmonicResynth({ fundamentalDetect: checked })}
                data-testid="switch-harmonic-detect"
                disabled={!advancedSettings.harmonicResynth.enabled}
              />
              <Label htmlFor="harmonic-detect" className="text-xs">Auto F0</Label>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          FFT-based spectral manipulation for metallic, glitchy textures. 
          Tilt shifts bass/treble balance. Blur smears frequencies for washy textures.
          Harmonic resynthesis boosts/cuts harmonics for tonal reshaping.
        </p>
      </div>
    </CollapsiblePanel>
  );
}
