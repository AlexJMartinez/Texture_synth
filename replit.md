# OneShot Synth - Multi-Oscillator One-Shot Generator

## Overview
A professional web-based one-shot synthesizer built with React and Tone.js. Create unique sounds for music production with 3-oscillator architecture, advanced synthesis engines, extensive effects processing, and WAV export. Features FM/AM/Modal/Additive/Granular synthesis for creating everything from clean tones to abrasive, impactful sounds. All sounds are percussive by default with aggressive envelopes, targeting hyperpop-style hard-hitting sounds similar to Synplant VST.

## Features

### Multi-Oscillator Architecture (3 OSC)
- 4 waveforms: Sine, triangle, sawtooth, and square
- Per-oscillator: Pitch (20-20000Hz), detune (-100 to +100 cents), drift (0-100%), level (0-100%)
- Pitch mode selector: Hz, Semitones (ST), or Octaves (Oct) display modes with automatic conversion
- Per-module randomize button for quick sound design exploration
- FM synthesis per oscillator: ratio presets (0.5, 1, 2, 3, 4, 6, 8, custom), depth, modulator waveform, feedback (0-100%)
- PM synthesis per oscillator: DX7-style phase modulation via frequency deviation, ratio presets, modulation index (0-60), feedback (0-100%), modulator waveform (Note: Uses FM-style implementation for Web Audio API compatibility)
- AM synthesis per oscillator: ratio, depth, modulator waveform
- Index envelope per oscillator: fast exponential decay (2-100ms), depth (0-60) for FM/PM modulation
- Individual enable/disable switches

### Click Layer (Transient Generator)
- Ultra-fast noise transient layer (1-10ms decay) for percussive attack
- Noise types: White, Pink (Voss-McCartney algorithm), Brown (Brownian motion)
- Filter options: Highpass or Bandpass
- Filter frequency (1000-15000Hz) and Q (1-10)
- Optional sample rate reduction (SRR) for crushed/bitcrushed clicks
- Level control (0-100%)

### Sub Oscillator (Low-End Layer)
- Dedicated sub bass layer for deep low-end weight
- Waveforms: Sine, Triangle
- Octave selection: -2, -1, 0 (relative to main oscillators)
- Dedicated attack/decay envelope (0-2000ms)
- Optional lowpass filter (20-200Hz) for focused sub frequencies
- Level control (0-100%)

### Advanced Synthesis Engines (Dropdown Selector)
- **Modal Synthesis**: 4 resonant modes with ratio/decay/level controls, impact noise, metallic/percussive sounds
- **Additive Synthesis**: 8 harmonic partials with individual levels, spread, and decay slope
- **Granular Synthesis**: Grain clouds with density, size, pitch, spray, scatter, and texture (noise/sine/saw/click)

### 3-Envelope System (Hard-Wired Routing)
- Attack/Hold/Decay (AHD) envelopes with linear, exponential, and logarithmic curves
- **Filter Env (env1)**: Modulates filter cutoff with depth/direction control (-100% to +100%)
- **Pitch Env (env2)**: Modulates pitch of all 3 oscillators with drop amount control
- **Amp Env (env3)**: Controls final gain, always active (hard-wired)

### Advanced Filters (9 types)
- Standard: Low-pass, high-pass, band-pass
- Advanced: Notch, allpass, peaking, lowshelf, highshelf
- Comb filter with delay time control
- Frequency (20-20000Hz) and resonance (0-30) controls

### Effects Chain
- **Distortion**: Saturation with adjustable waveshaping amount
- **Bitcrusher**: Bit depth reduction (1-16 bits)
- **Delay**: Time (0-2000ms), feedback (0-95%), wet/dry mix
- **Reverb**: Convolution-based with impulse response generation, size, decay (0.1-10s), mix
- **Chorus**: Dual LFO-modulated delays with rate (0.1-10Hz), depth, mix

### Waveshaper (Dent-style)
- 7 curve types: Softclip, hardclip, foldback, sinefold, chebyshev, asymmetric, tube
- Drive control (0-100%)
- Pre-filter (highpass) and post-filter (lowpass) options
- Wet/dry mix control
- 4x oversampling for alias-free distortion

### Convolution Reverb
- Custom IR import (WAV/AIFF files)
- IR files stored in localStorage as base64
- Wet/dry mix control
- Generates synthetic impulse responses when no custom IR loaded

### Multi-Stage Saturation Chain
- 3-stage saturation for rich harmonic content
- **Tape**: Soft saturation with warmth control for analog character
- **Tube**: Vacuum tube emulation with bias control for even harmonics
- **Transistor**: Hard clipping with asymmetry control for aggressive odd harmonics
- Individual enable/drive controls per stage
- Global wet/dry mix control

### Mastering Section
- **Soft-Knee Compressor**: Threshold, ratio, attack (0.1-100ms), release (10-1000ms), knee (0-20dB), makeup gain
- **HF Exciter**: Harmonic enhancement for high frequencies (frequency, amount, mix)
- **Stereo Widener**: Mid/side processing for stereo width control (50-200%)

### Impact/Transient Tools
- **Transient Shaper**: Attack boost/cut (-100 to +100%), sustain control (-100 to +100%)
- **Hard Limiter**: Threshold (-30 to 0 dB), release time (10-500ms)
- **Multiband Distortion**: 3-band frequency splitting with individual drive controls per band

### Output & Export
- Volume and stereo panning controls
- WAV export at 44.1kHz or 48kHz, mono or stereo
- Normalization option

### Preset Management
- 41 factory presets showcasing various sounds:
  - Basic: Soft Pluck, Deep Bass, Sharp Click, Warm Pad, Dirty Synth, Comb Pluck, Space Delay, Chorus Strings
  - FM/AM: FM Bell, FM Brass, AM Tremolo
  - Modal: Modal Bell, Metal Hit, Industrial Clang
  - Additive: Organ Tones
  - Granular: Grain Cloud, Noise Burst
  - Impact: Impact Slam, Glitch Stab
  - Waveshaper: Tube Warmth, Fold Crunch, Sine Destroyer, Cheby Brass, Hard Clip Perc
  - SOPHIE-style: SOPHIE Punch, Hyperpop Kick, Metal Snare, Glass Shatter, Sub Thump
- User presets with save/load/delete
- Import/export presets as JSON

### Randomization
- Full randomization with chaos control slider
- Gentle mutation for variations
- Reset to default

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Audio**: Tone.js for audio context management, Web Audio API nodes for synthesis
- **State**: React hooks with localStorage for presets and custom impulse responses

## Project Structure
```
client/src/
├── components/
│   └── synth/
│       ├── Knob.tsx              # Rotary knob control (xs/sm/md/lg sizes)
│       ├── WaveformDisplay.tsx   # Audio visualization
│       ├── CollapsiblePanel.tsx  # Collapsible panel wrapper for sections
│       ├── EnvelopePanel.tsx     # AHD envelope with routing
│       ├── OscillatorPanel.tsx   # Waveform & pitch controls + FM/AM/PM
│       ├── ClickLayerPanel.tsx   # Click layer transient generator with noise types
│       ├── SubOscillatorPanel.tsx # Sub oscillator for low-end weight
│       ├── FilterPanel.tsx       # 9 filter types
│       ├── EffectsPanel.tsx      # Distortion, delay, reverb, chorus, impact tools
│       ├── SaturationChainPanel.tsx # Multi-stage saturation (tape/tube/transistor)
│       ├── MasteringPanel.tsx    # Compressor, exciter, stereo widener
│       ├── WaveshaperPanel.tsx   # Dent-style waveshaper with 7 curves
│       ├── ConvolverPanel.tsx    # Convolution reverb with IR import
│       ├── SynthEngineSelector.tsx # Dropdown for Modal/Additive/Granular engines
│       ├── OutputPanel.tsx       # Volume & pan
│       ├── PresetPanel.tsx       # Preset management
│       ├── ExportPanel.tsx       # WAV export settings
│       ├── TriggerButton.tsx     # Play button (sm/md/lg sizes)
│       ├── RandomizeControls.tsx
│       └── WaveformIcons.tsx     # SVG waveform icons
├── pages/
│   └── Synthesizer.tsx          # Main synth with audio engine
└── lib/
    └── queryClient.ts

shared/
└── schema.ts                    # TypeScript types for all synth parameters
```

## Audio Engine
Integrated in Synthesizer.tsx using Tone.js and Web Audio API:

1. **Real-time playback**: Tone.js-managed AudioContext for live preview
2. **Offline rendering**: Tone.Offline for WAV export and waveform display
3. **Signal chain**: 
   - Sources: 3 Oscillators + Click Layer + Sub Osc (mixed) → Filter (optional) → Waveshaper → Convolver → Effects → Saturation Chain → Mastering (Compressor → Exciter → Stereo Widener) → Limiter → Panner → Gain → Output
4. **Comb filter**: Delay node with feedback loop
5. **Reverb**: ConvolverNode with generated or custom impulse response
6. **Chorus**: Dual LFO-modulated delay lines
7. **Waveshaper**: 4x oversampling with 7 curve types

## Usage
1. Click the trigger button or press Space to play
2. Toggle and adjust oscillators (OSC1/2/3)
3. Configure envelopes and routing (ENV1/2/3)
4. Select filter type and adjust parameters
5. Enable and tweak effects (saturation, bitcrusher, delay, reverb, chorus)
6. Use Randomize/Mutate for new sounds
7. Save presets for later use
8. Export to WAV for DAW integration

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production

## Color Scheme
Dark audio-themed UI with purple primary (#8B5CF6) and cyan accent (#14B8A6) colors.

## UI Design
Compact 50% scale design for professional audio feel:
- xs/sm knobs and controls
- 10px-xs font sizes
- Reduced padding throughout
- Collapsible panels for organized layout
- Dropdown selector for synthesis engine switching

## Technical Notes
- Presets stored in localStorage under 'synth-presets-v2' key
- Old v1 presets automatically cleared on first load
- Factory presets defined in shared/schema.ts
- Custom IR files stored in localStorage (key: "synth-custom-irs") as base64-encoded audio buffers
- Audio context unlocking uses Tone.start() for mobile compatibility
- Default envelope: 2ms attack, 20ms hold, 200ms decay with transient shaper (+50 attack, -20 sustain) and limiter (-6dB threshold) enabled
- **Canonical Pitch Model**: Pitch is stored internally as `PitchState {mode, baseHz, st, cents}` rather than raw Hz. Converted to Hz only during audio generation using `pitchToHz()`. Supports Hz/Semitones/Octaves display modes with automatic quantization and hysteresis.
- **Pitch Utilities**: `client/src/lib/pitchUtils.ts` provides pitch conversion functions. `normalizePitch()` handles backward compatibility with old numeric presets.
- **Audio Retrigger**: Gain ramps (1-2ms fadeout before stopping, fadein on start) prevent audio pops/clicks during sound retriggering.
- **AHD Envelope System**: Uses `client/src/lib/envelopeAHD.ts` with `triggerAHD()` for all envelopes. Features:
  - `setTargetAtTime` for smooth exponential curves (timeConstant = segment/5 reaches ~99% by segment end)
  - `cancelAndHoldAtTime` when available for click-free retriggers
  - EPS (1e-5) to avoid exponential-to-zero pitfall
  - `stopWithFade()` for smooth fadeouts on retrigger
