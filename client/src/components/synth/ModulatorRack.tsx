import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Knob } from "./Knob";
import { Switch } from "@/components/ui/switch";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { Plus, X, Waves, TrendingUp, Shuffle, Sliders } from "lucide-react";
import type { 
  Modulator, 
  ModulationRoute, 
  LfoModulator, 
  EnvelopeModulator, 
  RandomModulator, 
  MacroModulator,
  LfoShape,
  DelayDivision,
  ModulatorType 
} from "@shared/schema";

interface ModulatorRackProps {
  modulators: Modulator[];
  routes: ModulationRoute[];
  tempo: number;
  onUpdateModulators: (modulators: Modulator[]) => void;
  onUpdateRoutes: (routes: ModulationRoute[]) => void;
  curveEnabled?: boolean;
  stepSequencerEnabled?: boolean;
}

const LFO_SHAPES: { value: LfoShape; label: string }[] = [
  { value: "sine", label: "Sin" },
  { value: "triangle", label: "Tri" },
  { value: "sawtooth", label: "Saw" },
  { value: "square", label: "Sqr" },
  { value: "random", label: "Rnd" },
];

const RATE_DIVISIONS: { value: DelayDivision; label: string }[] = [
  { value: "1/1", label: "1/1" },
  { value: "1/2", label: "1/2" },
  { value: "1/4", label: "1/4" },
  { value: "1/8", label: "1/8" },
  { value: "1/16", label: "1/16" },
  { value: "1/4T", label: "1/4T" },
  { value: "1/8T", label: "1/8T" },
];

const MODULATOR_COLORS: Record<ModulatorType, string> = {
  lfo: "bg-blue-500/20 border-blue-500/50",
  envelope: "bg-orange-500/20 border-orange-500/50",
  random: "bg-purple-500/20 border-purple-500/50",
  macro: "bg-green-500/20 border-green-500/50",
};

// Glow classes for when modulator has active routes
export const MODULATOR_GLOW_COLORS: Record<ModulatorType, string> = {
  lfo: "shadow-[0_0_8px_2px_rgba(59,130,246,0.5)]",
  envelope: "shadow-[0_0_8px_2px_rgba(249,115,22,0.5)]",
  random: "shadow-[0_0_8px_2px_rgba(168,85,247,0.5)]",
  macro: "shadow-[0_0_8px_2px_rgba(34,197,94,0.5)]",
};

// RGB colors for knob indicators
export const MODULATOR_INDICATOR_COLORS: Record<ModulatorType, string> = {
  lfo: "#3b82f6",
  envelope: "#f97316",
  random: "#a855f7",
  macro: "#22c55e",
};

const MODULATOR_ICONS: Record<ModulatorType, typeof Waves> = {
  lfo: Waves,
  envelope: TrendingUp,
  random: Shuffle,
  macro: Sliders,
};

interface ModulationTarget {
  path: string;
  label: string;
  category: string;
}

const MODULATION_TARGETS: ModulationTarget[] = [
  // Filter
  { path: "filter.frequency", label: "Filter Freq", category: "Filter" },
  { path: "filter.resonance", label: "Filter Res", category: "Filter" },
  { path: "filter.gain", label: "Filter Gain", category: "Filter" },
  
  // Oscillators
  { path: "oscillators.osc1.level", label: "OSC1 Level", category: "Oscillators" },
  { path: "oscillators.osc1.detune", label: "OSC1 Detune", category: "Oscillators" },
  { path: "oscillators.osc1.fmDepth", label: "OSC1 FM Depth", category: "Oscillators" },
  { path: "oscillators.osc1.drift", label: "OSC1 Drift", category: "Oscillators" },
  { path: "oscillators.osc2.level", label: "OSC2 Level", category: "Oscillators" },
  { path: "oscillators.osc2.detune", label: "OSC2 Detune", category: "Oscillators" },
  { path: "oscillators.osc2.fmDepth", label: "OSC2 FM Depth", category: "Oscillators" },
  { path: "oscillators.osc2.drift", label: "OSC2 Drift", category: "Oscillators" },
  { path: "oscillators.osc3.level", label: "OSC3 Level", category: "Oscillators" },
  { path: "oscillators.osc3.detune", label: "OSC3 Detune", category: "Oscillators" },
  { path: "oscillators.osc3.fmDepth", label: "OSC3 FM Depth", category: "Oscillators" },
  { path: "oscillators.osc3.drift", label: "OSC3 Drift", category: "Oscillators" },
  
  // Effects - Delay
  { path: "effects.delay.time", label: "Delay Time", category: "Effects" },
  { path: "effects.delay.feedback", label: "Delay Feedback", category: "Effects" },
  { path: "effects.delay.mix", label: "Delay Mix", category: "Effects" },
  
  // Effects - Distortion
  { path: "effects.distortion.drive", label: "Distortion Drive", category: "Effects" },
  { path: "effects.distortion.mix", label: "Distortion Mix", category: "Effects" },
  
  // Effects - Bitcrusher
  { path: "effects.bitcrusher.bitDepth", label: "Bitcrush Bits", category: "Effects" },
  { path: "effects.bitcrusher.mix", label: "Bitcrush Mix", category: "Effects" },
  
  // Effects - Reverb
  { path: "effects.reverb.size", label: "Reverb Size", category: "Effects" },
  { path: "effects.reverb.decay", label: "Reverb Decay", category: "Effects" },
  { path: "effects.reverb.mix", label: "Reverb Mix", category: "Effects" },
  { path: "effects.reverb.predelay", label: "Reverb Pre", category: "Effects" },
  { path: "effects.reverb.damping", label: "Reverb Damp", category: "Effects" },
  { path: "effects.reverb.diffusion", label: "Reverb Diff", category: "Effects" },
  { path: "effects.reverb.stereoWidth", label: "Reverb Width", category: "Effects" },
  { path: "effects.reverb.modulation", label: "Reverb Mod", category: "Effects" },
  
  // Effects - Chorus
  { path: "effects.chorus.depth", label: "Chorus Depth", category: "Effects" },
  { path: "effects.chorus.rate", label: "Chorus Rate", category: "Effects" },
  { path: "effects.chorus.mix", label: "Chorus Mix", category: "Effects" },
  
  // Layers
  { path: "clickLayer.level", label: "Click Level", category: "Layers" },
  { path: "clickLayer.decay", label: "Click Decay", category: "Layers" },
  { path: "subOsc.level", label: "Sub Level", category: "Layers" },
  { path: "subOsc.pitch", label: "Sub Pitch", category: "Layers" },
  
  // Shaping - Waveshaper
  { path: "waveshaper.amount", label: "Waveshaper Amt", category: "Shaping" },
  { path: "waveshaper.mix", label: "Waveshaper Mix", category: "Shaping" },
  
  // Shaping - Spectral Scrambler
  { path: "spectralScrambler.scrambleAmount", label: "Spectral Scramble", category: "Shaping" },
  { path: "spectralScrambler.binShift", label: "Spectral Shift", category: "Shaping" },
  { path: "spectralScrambler.binDensity", label: "Spectral Density", category: "Shaping" },
  { path: "spectralScrambler.gate", label: "Spectral Gate", category: "Shaping" },
  { path: "spectralScrambler.stretch", label: "Spectral Stretch", category: "Shaping" },
  { path: "spectralScrambler.mix", label: "Spectral Mix", category: "Shaping" },
  
  // Saturation
  { path: "saturationChain.tapeDrive", label: "Tape Drive", category: "Saturation" },
  { path: "saturationChain.tubeDrive", label: "Tube Drive", category: "Saturation" },
  { path: "saturationChain.transistorDrive", label: "Transistor Drive", category: "Saturation" },
  { path: "saturationChain.mix", label: "Saturation Mix", category: "Saturation" },
  
  // Mastering
  { path: "mastering.compressor.threshold", label: "Comp Threshold", category: "Mastering" },
  { path: "mastering.compressor.ratio", label: "Comp Ratio", category: "Mastering" },
  { path: "mastering.exciter.amount", label: "Exciter Amt", category: "Mastering" },
  { path: "mastering.widener.amount", label: "Widener Amt", category: "Mastering" },
  { path: "mastering.limiter.ceiling", label: "Limiter Ceiling", category: "Mastering" },
  
  // Envelopes
  { path: "envelopes.pitch.amount", label: "Pitch Env Amt", category: "Envelopes" },
  { path: "envelopes.filter.amount", label: "Filter Env Amt", category: "Envelopes" },
  
  // Advanced Filter
  { path: "filter.driveAmount", label: "Filter Drive", category: "Filter" },
  { path: "filter.filter2Frequency", label: "Filter 2 Freq", category: "Filter" },
  { path: "filter.filter2Resonance", label: "Filter 2 Res", category: "Filter" },
  { path: "filter.dualMix", label: "Dual Mix", category: "Filter" },
  { path: "filter.formantMix", label: "Formant Mix", category: "Filter" },
  { path: "filter.fmDepth", label: "Filter FM", category: "Filter" },
  { path: "filter.keytrackAmount", label: "Keytrack Amt", category: "Filter" },
  
  // Advanced Waveshaper
  { path: "waveshaper.positiveAmount", label: "WS +Amt", category: "Shaping" },
  { path: "waveshaper.negativeAmount", label: "WS -Amt", category: "Shaping" },
  { path: "waveshaper.dcOffset", label: "WS DC", category: "Shaping" },
  { path: "waveshaper.dynamicSensitivity", label: "WS Dynamic", category: "Shaping" },
  { path: "waveshaper.chebyshevOrder", label: "WS ChebOrd", category: "Shaping" },
  { path: "waveshaper.foldbackIterations", label: "WS FoldItr", category: "Shaping" },
  { path: "waveshaper.preFilterFreq", label: "WS PreFilt", category: "Shaping" },
  { path: "waveshaper.postFilterFreq", label: "WS PostFilt", category: "Shaping" },
  { path: "waveshaper.multiband.lowCrossover", label: "WS Lo Cross", category: "Shaping" },
  { path: "waveshaper.multiband.highCrossover", label: "WS Hi Cross", category: "Shaping" },
  { path: "waveshaper.multiband.lowDrive", label: "WS Lo Drive", category: "Shaping" },
  { path: "waveshaper.multiband.midDrive", label: "WS Mid Drive", category: "Shaping" },
  { path: "waveshaper.multiband.highDrive", label: "WS Hi Drive", category: "Shaping" },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createDefaultModulator(type: ModulatorType): Modulator {
  const id = generateId();
  const baseProps = { id, enabled: true };
  
  switch (type) {
    case "lfo":
      return {
        ...baseProps,
        type: "lfo",
        name: "LFO",
        shape: "sine",
        rate: 1,
        rateSync: false,
        rateDivision: "1/4",
        phase: 0,
        amount: 50,
        bipolar: true,
      };
    case "envelope":
      return {
        ...baseProps,
        type: "envelope",
        name: "Env",
        attack: 10,
        decay: 200,
        sustain: 50,
        release: 300,
        amount: 50,
        bipolar: false,
      };
    case "random":
      return {
        ...baseProps,
        type: "random",
        name: "Rnd",
        rate: 4,
        smooth: 20,
        amount: 50,
        bipolar: true,
      };
    case "macro":
      return {
        ...baseProps,
        type: "macro",
        name: "Macro",
        value: 50,
        amount: 100,
      };
  }
}

function LfoEditor({ mod, onChange }: { mod: LfoModulator; onChange: (m: LfoModulator) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <div className="flex flex-col items-center">
        <Select value={mod.shape} onValueChange={(v) => onChange({ ...mod, shape: v as LfoShape })}>
          <SelectTrigger className="h-5 w-12 text-[8px]" data-testid={`select-lfo-shape-${mod.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LFO_SHAPES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-[9px]">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[7px] text-muted-foreground">Shape</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onChange({ ...mod, rateSync: !mod.rateSync })}
          className={`px-1 py-0.5 text-[7px] rounded ${mod.rateSync ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          data-testid={`button-lfo-sync-${mod.id}`}
        >
          {mod.rateSync ? "Sync" : "Hz"}
        </button>
      </div>
      {mod.rateSync ? (
        <div className="flex flex-col items-center">
          <Select value={mod.rateDivision} onValueChange={(v) => onChange({ ...mod, rateDivision: v as DelayDivision })}>
            <SelectTrigger className="h-5 w-12 text-[8px]" data-testid={`select-lfo-division-${mod.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATE_DIVISIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="text-[9px]">{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[7px] text-muted-foreground">Div</span>
        </div>
      ) : (
        <Knob value={mod.rate} min={0.01} max={50} step={0.01} label="Rate" unit="Hz" onChange={(v) => onChange({ ...mod, rate: v })} size="xs" />
      )}
      <Knob value={mod.phase} min={0} max={360} step={1} label="Phs" unit="°" onChange={(v) => onChange({ ...mod, phase: v })} size="xs" />
      <Knob value={mod.amount} min={0} max={100} step={1} label="Amt" unit="%" onChange={(v) => onChange({ ...mod, amount: v })} size="xs" />
    </div>
  );
}

function EnvelopeEditor({ mod, onChange }: { mod: EnvelopeModulator; onChange: (m: EnvelopeModulator) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <Knob value={mod.attack} min={0} max={2000} step={1} label="A" unit="ms" onChange={(v) => onChange({ ...mod, attack: v })} size="xs" />
      <Knob value={mod.decay} min={0} max={5000} step={1} label="D" unit="ms" onChange={(v) => onChange({ ...mod, decay: v })} size="xs" />
      <Knob value={mod.sustain} min={0} max={100} step={1} label="S" unit="%" onChange={(v) => onChange({ ...mod, sustain: v })} size="xs" />
      <Knob value={mod.release} min={0} max={5000} step={1} label="R" unit="ms" onChange={(v) => onChange({ ...mod, release: v })} size="xs" />
      <Knob value={mod.amount} min={0} max={100} step={1} label="Amt" unit="%" onChange={(v) => onChange({ ...mod, amount: v })} size="xs" />
    </div>
  );
}

function RandomEditor({ mod, onChange }: { mod: RandomModulator; onChange: (m: RandomModulator) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <Knob value={mod.rate} min={0.1} max={50} step={0.1} label="Rate" unit="Hz" onChange={(v) => onChange({ ...mod, rate: v })} size="xs" />
      <Knob value={mod.smooth} min={0} max={100} step={1} label="Smth" unit="%" onChange={(v) => onChange({ ...mod, smooth: v })} size="xs" />
      <Knob value={mod.amount} min={0} max={100} step={1} label="Amt" unit="%" onChange={(v) => onChange({ ...mod, amount: v })} size="xs" />
    </div>
  );
}

function MacroEditor({ mod, onChange }: { mod: MacroModulator; onChange: (m: MacroModulator) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <Knob value={mod.value} min={0} max={100} step={1} label="Val" unit="%" onChange={(v) => onChange({ ...mod, value: v })} size="sm" accentColor="primary" />
      <Knob value={mod.amount} min={0} max={100} step={1} label="Amt" unit="%" onChange={(v) => onChange({ ...mod, amount: v })} size="xs" />
    </div>
  );
}

function ModulatorCard({ 
  mod, 
  routes,
  onUpdate, 
  onDelete,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
}: { 
  mod: Modulator;
  routes: ModulationRoute[];
  onUpdate: (m: Modulator) => void;
  onDelete: () => void;
  onAddRoute: () => void;
  onUpdateRoute: (route: ModulationRoute) => void;
  onDeleteRoute: (routeId: string) => void;
}) {
  const Icon = MODULATOR_ICONS[mod.type];
  const modRoutes = routes.filter(r => r.modulatorId === mod.id);
  
  const updateMod = <K extends keyof Modulator>(key: K, value: Modulator[K]) => {
    onUpdate({ ...mod, [key]: value } as Modulator);
  };

  // Check if modulator has active routes with valid targets
  const hasActiveRoutes = modRoutes.some(r => r.targetPath && r.targetPath.length > 0);
  const glowClass = hasActiveRoutes ? MODULATOR_GLOW_COLORS[mod.type] : "";

  return (
    <div className={`rounded-md border p-2 ${MODULATOR_COLORS[mod.type]} ${glowClass} min-w-[180px] transition-shadow duration-300`} data-testid={`modulator-card-${mod.id}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          <input
            type="text"
            value={mod.name}
            onChange={(e) => updateMod("name", e.target.value)}
            className="bg-transparent border-none text-[10px] font-medium w-16 focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-0.5"
            data-testid={`input-mod-name-${mod.id}`}
          />
        </div>
        <div className="flex items-center gap-1">
          <Switch
            checked={mod.enabled}
            onCheckedChange={(v) => updateMod("enabled", v)}
            className="scale-50"
            data-testid={`switch-mod-enabled-${mod.id}`}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive" 
            data-testid={`button-delete-mod-${mod.id}`}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {mod.type === "lfo" && <LfoEditor mod={mod} onChange={onUpdate as (m: LfoModulator) => void} />}
      {mod.type === "envelope" && <EnvelopeEditor mod={mod} onChange={onUpdate as (m: EnvelopeModulator) => void} />}
      {mod.type === "random" && <RandomEditor mod={mod} onChange={onUpdate as (m: RandomModulator) => void} />}
      {mod.type === "macro" && <MacroEditor mod={mod} onChange={onUpdate as (m: MacroModulator) => void} />}

      {("bipolar" in mod) && (
        <div className="flex justify-center mt-1">
          <button
            type="button"
            onClick={() => onUpdate({ ...mod, bipolar: !mod.bipolar } as Modulator)}
            className={`px-1.5 py-0.5 text-[7px] rounded ${mod.bipolar ? "bg-primary/80 text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            data-testid={`button-mod-bipolar-${mod.id}`}
          >
            {mod.bipolar ? "±" : "+"}
          </button>
        </div>
      )}

      <div className="mt-2 border-t border-border/30 pt-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] text-muted-foreground">Targets</span>
          <Button size="icon" variant="ghost" onClick={onAddRoute} className="h-4 w-4" data-testid={`button-add-route-${mod.id}`}>
            <Plus className="w-2.5 h-2.5" />
          </Button>
        </div>
        <div className="space-y-1 max-h-20 overflow-y-auto">
          {modRoutes.map((route) => (
            <div key={route.id} className="flex items-center gap-1 text-[8px]">
              <Select 
                value={route.targetPath} 
                onValueChange={(v) => onUpdateRoute({ ...route, targetPath: v })}
              >
                <SelectTrigger className="flex-1 h-5 text-[8px]" data-testid={`select-route-target-${route.id}`}>
                  <SelectValue placeholder="Select target..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {["Filter", "Oscillators", "Effects", "Layers", "Shaping", "Saturation"].map((category) => (
                    <SelectGroup key={category}>
                      <SelectLabel className="text-[9px] font-semibold">{category}</SelectLabel>
                      {MODULATION_TARGETS.filter(t => t.category === category).map((target) => (
                        <SelectItem key={target.path} value={target.path} className="text-[9px]">
                          {target.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="number"
                value={route.depth}
                onChange={(e) => onUpdateRoute({ ...route, depth: Number(e.target.value) })}
                className="w-10 bg-muted/50 rounded px-1 py-0.5 text-[8px] text-center border-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                min={-100}
                max={100}
                data-testid={`input-route-depth-${route.id}`}
              />
              <Button size="icon" variant="ghost" onClick={() => onDeleteRoute(route.id)} className="h-3.5 w-3.5" data-testid={`button-delete-route-${route.id}`}>
                <X className="w-2 h-2" />
              </Button>
            </div>
          ))}
          {modRoutes.length === 0 && (
            <span className="text-[7px] text-muted-foreground italic">No targets</span>
          )}
        </div>
      </div>
    </div>
  );
}

function VirtualModulatorCard({
  id,
  name,
  color,
  routes,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
}: {
  id: string;
  name: string;
  color: string;
  routes: ModulationRoute[];
  onAddRoute: () => void;
  onUpdateRoute: (route: ModulationRoute) => void;
  onDeleteRoute: (routeId: string) => void;
}) {
  const modRoutes = routes.filter(r => r.modulatorId === id);
  const hasActiveRoutes = modRoutes.some(r => r.targetPath && r.targetPath.length > 0);
  const glowClass = hasActiveRoutes ? "shadow-[0_0_10px_rgba(100,200,200,0.5)]" : "";

  return (
    <div className={`rounded-md border p-2 ${color} ${glowClass} min-w-[140px] transition-shadow duration-300`} data-testid={`modulator-card-${id}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <Waves className="w-3 h-3" />
          <span className="text-[10px] font-medium">{name}</span>
        </div>
      </div>
      
      <div className="text-[9px] text-muted-foreground text-center py-1">
        Virtual modulator
      </div>

      <div className="mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-medium">Routes</span>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onAddRoute} 
            className="h-4 w-4"
            data-testid={`button-add-route-${id}`}
          >
            <Plus className="w-2.5 h-2.5" />
          </Button>
        </div>
        {modRoutes.length === 0 ? (
          <div className="text-[8px] text-muted-foreground text-center py-0.5">No routes</div>
        ) : (
          <div className="space-y-1 max-h-[80px] overflow-y-auto">
            {modRoutes.map((route) => (
              <div key={route.id} className="flex items-center gap-1" data-testid={`route-row-${route.id}`}>
                <Select
                  value={route.targetPath || ""}
                  onValueChange={(v) => onUpdateRoute({ ...route, targetPath: v })}
                >
                  <SelectTrigger className="h-5 text-[8px] flex-1 px-1" data-testid={`select-route-target-${route.id}`}>
                    <SelectValue placeholder="Target" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {["Filter", "Oscillators", "Effects", "Layers", "Shaping", "Saturation", "Mastering", "Envelopes"].map((category) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-[9px] font-semibold">{category}</SelectLabel>
                        {MODULATION_TARGETS.filter(t => t.category === category).map((target) => (
                          <SelectItem key={target.path} value={target.path} className="text-[9px]">
                            {target.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <Knob
                  value={route.depth}
                  min={-100}
                  max={100}
                  step={1}
                  size="xs"
                  label="Depth"
                  onChange={(v) => onUpdateRoute({ ...route, depth: v })}
                  format={(v) => `${v > 0 ? "+" : ""}${v}%`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDeleteRoute(route.id)}
                  className="h-4 w-4"
                  data-testid={`button-delete-route-${route.id}`}
                >
                  <X className="w-2 h-2" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModulatorRack({ modulators, routes, tempo, onUpdateModulators, onUpdateRoutes, curveEnabled, stepSequencerEnabled }: ModulatorRackProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const addModulator = (type: ModulatorType) => {
    const newMod = createDefaultModulator(type);
    onUpdateModulators([...modulators, newMod]);
    setAddMenuOpen(false);
  };

  const updateModulator = (id: string, updated: Modulator) => {
    onUpdateModulators(modulators.map(m => m.id === id ? updated : m));
  };

  const deleteModulator = (id: string) => {
    onUpdateModulators(modulators.filter(m => m.id !== id));
    onUpdateRoutes(routes.filter(r => r.modulatorId !== id));
  };

  const addRoute = (modulatorId: string) => {
    const newRoute: ModulationRoute = {
      id: generateId(),
      modulatorId,
      targetPath: "",
      depth: 50,
    };
    onUpdateRoutes([...routes, newRoute]);
  };

  const updateRoute = (updated: ModulationRoute) => {
    onUpdateRoutes(routes.map(r => r.id === updated.id ? updated : r));
  };

  const deleteRoute = (routeId: string) => {
    onUpdateRoutes(routes.filter(r => r.id !== routeId));
  };

  return (
    <CollapsiblePanel
      title="Modulators"
      icon={<Waves className="w-3 h-3 text-accent" />}
      defaultOpen={true}
      headerExtra={
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setAddMenuOpen(!addMenuOpen); }}
            className="h-6 text-[9px] gap-1"
            data-testid="button-add-modulator"
          >
            <Plus className="w-3 h-3" /> Add
          </Button>
          {addMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 py-1 min-w-[100px]">
              {(["lfo", "envelope", "random", "macro"] as const).map((type) => {
                const Icon = MODULATOR_ICONS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addModulator(type); }}
                    className="w-full px-3 py-1.5 text-[10px] text-left hover:bg-accent flex items-center gap-2"
                    data-testid={`button-add-${type}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="capitalize">{type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      }
    >
      {modulators.length === 0 && !curveEnabled && !stepSequencerEnabled ? (
        <div className="text-center py-4 text-[10px] text-muted-foreground">
          No modulators added. Click "Add" to create LFOs, envelopes, or macros.
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {modulators.map((mod) => (
            <ModulatorCard
              key={mod.id}
              mod={mod}
              routes={routes}
              onUpdate={(m) => updateModulator(mod.id, m)}
              onDelete={() => deleteModulator(mod.id)}
              onAddRoute={() => addRoute(mod.id)}
              onUpdateRoute={updateRoute}
              onDeleteRoute={deleteRoute}
            />
          ))}
          {curveEnabled && (
            <VirtualModulatorCard
              id="curve"
              name="Curve"
              color="bg-cyan-500/20 border-cyan-500/50"
              routes={routes}
              onAddRoute={() => addRoute("curve")}
              onUpdateRoute={updateRoute}
              onDeleteRoute={deleteRoute}
            />
          )}
          {stepSequencerEnabled && (
            <VirtualModulatorCard
              id="stepSequencer"
              name="Step Seq"
              color="bg-pink-500/20 border-pink-500/50"
              routes={routes}
              onAddRoute={() => addRoute("stepSequencer")}
              onUpdateRoute={updateRoute}
              onDeleteRoute={deleteRoute}
            />
          )}
        </div>
      )}
    </CollapsiblePanel>
  );
}
