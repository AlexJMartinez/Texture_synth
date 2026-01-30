// Wavetable Oscillator Engine
// Provides wavetable oscillator creation for integration with the main synthesizer

import type { WavetableData, OscWavetableSettings, WavetableInterpolation } from "./wavetableSettings";
import { getFrameAtPosition, frameToPeriodicWave } from "./wavetableSettings";
import { getFactoryWavetables, getWavetableById, getCustomWavetables } from "./factoryWavetables";

// Cache for PeriodicWave objects to avoid regenerating them
const periodicWaveCache = new Map<string, PeriodicWave>();

// Generate cache key for a specific wavetable position
function getCacheKey(wavetableId: string, position: number, interpolation: WavetableInterpolation): string {
  // Round position to reduce cache size (every 2% step)
  const roundedPos = Math.round(position / 2) * 2;
  return `${wavetableId}-${roundedPos}-${interpolation}`;
}

// Get or create PeriodicWave for a wavetable at a specific position
export function getPeriodicWaveAtPosition(
  audioContext: AudioContext | OfflineAudioContext,
  wavetable: WavetableData,
  position: number,
  interpolation: WavetableInterpolation = "linear"
): PeriodicWave {
  const cacheKey = getCacheKey(wavetable.id, position, interpolation);
  
  if (periodicWaveCache.has(cacheKey)) {
    return periodicWaveCache.get(cacheKey)!;
  }
  
  const frame = getFrameAtPosition(wavetable, position, interpolation);
  const periodicWave = frameToPeriodicWave(audioContext, frame, true);
  
  // Cache with size limit (clear old entries if too large)
  if (periodicWaveCache.size > 500) {
    const keys = Array.from(periodicWaveCache.keys());
    for (let i = 0; i < 100; i++) {
      periodicWaveCache.delete(keys[i]);
    }
  }
  
  periodicWaveCache.set(cacheKey, periodicWave);
  return periodicWave;
}

// Clear cache (useful when loading new wavetables)
export function clearPeriodicWaveCache(): void {
  periodicWaveCache.clear();
}

// Create a wavetable oscillator node
export interface WavetableOscillatorResult {
  oscillator: OscillatorNode;
  setPosition: (position: number) => void;
}

export function createWavetableOscillator(
  audioContext: AudioContext | OfflineAudioContext,
  settings: OscWavetableSettings,
  frequency: number,
  startTime: number,
  stopTime: number
): WavetableOscillatorResult | null {
  const wavetable = getWavetableById(settings.wavetableId);
  if (!wavetable) {
    console.warn(`Wavetable not found: ${settings.wavetableId}`);
    return null;
  }
  
  const osc = audioContext.createOscillator();
  osc.frequency.value = frequency;
  
  // Set initial wavetable position
  const periodicWave = getPeriodicWaveAtPosition(
    audioContext,
    wavetable,
    settings.position,
    settings.interpolation
  );
  osc.setPeriodicWave(periodicWave);
  
  osc.start(startTime);
  osc.stop(stopTime);
  
  // Return with position setter for real-time modulation
  return {
    oscillator: osc,
    setPosition: (position: number) => {
      const newWave = getPeriodicWaveAtPosition(
        audioContext,
        wavetable,
        position,
        settings.interpolation
      );
      osc.setPeriodicWave(newWave);
    },
  };
}

// Create multiple unison wavetable oscillators
export interface UnisonWavetableResult {
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  panNodes: StereoPannerNode[];
  outputGain: GainNode;
  setPosition: (position: number) => void;
}

export function createUnisonWavetableOscillators(
  audioContext: AudioContext | OfflineAudioContext,
  settings: OscWavetableSettings,
  frequency: number,
  startTime: number,
  stopTime: number
): UnisonWavetableResult | null {
  const wavetable = getWavetableById(settings.wavetableId);
  if (!wavetable) {
    console.warn(`Wavetable not found: ${settings.wavetableId}`);
    return null;
  }
  
  const voiceCount = Math.max(1, Math.min(8, settings.unison));
  const oscillators: OscillatorNode[] = [];
  const gainNodes: GainNode[] = [];
  const panNodes: StereoPannerNode[] = [];
  
  const outputGain = audioContext.createGain();
  // Scale down volume for unison to prevent clipping
  outputGain.gain.value = 1 / Math.sqrt(voiceCount);
  
  const detuneRange = settings.unisonDetune; // cents
  const blendAmount = settings.unisonBlend / 100; // 0-1
  
  for (let i = 0; i < voiceCount; i++) {
    const osc = audioContext.createOscillator();
    
    // Calculate detune for this voice (spread evenly)
    let detune = 0;
    if (voiceCount > 1) {
      const normalizedPos = i / (voiceCount - 1); // 0 to 1
      detune = (normalizedPos * 2 - 1) * detuneRange; // -range to +range
    }
    
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    
    // Set wavetable
    const periodicWave = getPeriodicWaveAtPosition(
      audioContext,
      wavetable,
      settings.position,
      settings.interpolation
    );
    osc.setPeriodicWave(periodicWave);
    
    // Create gain node for this voice
    const gain = audioContext.createGain();
    gain.gain.value = 1;
    
    // Create panner for stereo spread
    const panner = audioContext.createStereoPanner();
    if (voiceCount > 1) {
      const normalizedPos = i / (voiceCount - 1);
      panner.pan.value = (normalizedPos * 2 - 1) * blendAmount; // -blend to +blend
    } else {
      panner.pan.value = 0;
    }
    
    // Connect: osc -> gain -> panner -> output
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(outputGain);
    
    osc.start(startTime);
    osc.stop(stopTime);
    
    oscillators.push(osc);
    gainNodes.push(gain);
    panNodes.push(panner);
  }
  
  return {
    oscillators,
    gainNodes,
    panNodes,
    outputGain,
    setPosition: (position: number) => {
      const newWave = getPeriodicWaveAtPosition(
        audioContext,
        wavetable,
        position,
        settings.interpolation
      );
      oscillators.forEach(osc => osc.setPeriodicWave(newWave));
    },
  };
}

// Apply wavetable position modulation from envelope
// This creates an envelope that sweeps the wavetable position over time
export function applyWavetablePositionModulation(
  audioContext: AudioContext | OfflineAudioContext,
  wavetableResult: UnisonWavetableResult | WavetableOscillatorResult,
  wavetable: WavetableData,
  settings: OscWavetableSettings,
  startTime: number,
  duration: number,
  envelopeAmount: number, // -100 to 100 (modulation depth)
  envelopeAttack: number, // seconds
  envelopeDecay: number // seconds
): void {
  if (Math.abs(envelopeAmount) < 1) return;
  if (!wavetableResult.setPosition) return;
  
  const basePosition = settings.position;
  const modDepth = envelopeAmount;
  
  // Calculate modulation positions over time
  // Use more steps for longer durations, fewer for short sounds
  const totalModTime = Math.min(duration, envelopeAttack + envelopeDecay);
  const steps = Math.max(10, Math.min(50, Math.ceil(totalModTime * 30))); // ~30 updates per second
  const stepTime = totalModTime / steps;
  
  // For offline context, we need to schedule all changes before rendering starts
  // Use requestAnimationFrame for live context, or pre-calculate for offline
  const isOffline = audioContext instanceof OfflineAudioContext;
  
  if (isOffline) {
    // For offline rendering, pre-calculate all position changes
    // Schedule them relative to the context's timeline
    for (let i = 0; i <= steps; i++) {
      const t = i * stepTime;
      let envValue = 0;
      
      if (t < envelopeAttack) {
        envValue = envelopeAttack > 0 ? t / envelopeAttack : 1;
      } else {
        const decayTime = t - envelopeAttack;
        envValue = envelopeDecay > 0 ? 1 - Math.min(1, decayTime / envelopeDecay) : 0;
      }
      
      const position = Math.max(0, Math.min(100, basePosition + modDepth * envValue));
      
      // For offline rendering, we can't change PeriodicWave dynamically
      // Instead, we set the initial position only (modulation is for live playback)
    }
    // Note: Full wavetable modulation during offline export would require
    // creating multiple oscillators that crossfade, which is complex.
    // For now, offline export uses the static position.
  } else {
    // Live playback: use setTimeout for real-time updates
    const scheduleUpdate = (delayMs: number, position: number) => {
      setTimeout(() => {
        if (wavetableResult.setPosition) {
          wavetableResult.setPosition(position);
        }
      }, delayMs);
    };
    
    for (let i = 0; i <= steps; i++) {
      const t = i * stepTime;
      let envValue = 0;
      
      if (t < envelopeAttack) {
        envValue = envelopeAttack > 0 ? t / envelopeAttack : 1;
      } else {
        const decayTime = t - envelopeAttack;
        envValue = envelopeDecay > 0 ? 1 - Math.min(1, decayTime / envelopeDecay) : 0;
      }
      
      const position = Math.max(0, Math.min(100, basePosition + modDepth * envValue));
      scheduleUpdate(t * 1000, position);
    }
  }
}

// Get all available wavetables (factory + user)
export function getAllWavetables(): WavetableData[] {
  const factory = getFactoryWavetables();
  const custom = getCustomWavetables();
  return [...factory, ...custom];
}

// Initialize wavetable system (preload common wavetables)
export function initializeWavetableEngine(audioContext: AudioContext): void {
  // Pre-cache a few common wavetables at key positions
  const commonWavetables = ["basic-sine-to-saw", "basic-sine-to-square", "digital-pwm"];
  const commonPositions = [0, 25, 50, 75, 100];
  
  for (const id of commonWavetables) {
    const wt = getWavetableById(id);
    if (wt) {
      for (const pos of commonPositions) {
        getPeriodicWaveAtPosition(audioContext, wt, pos, "linear");
      }
    }
  }
}
