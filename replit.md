# OneShot Synth - Multi-Oscillator One-Shot Generator

## Overview
A professional web-based one-shot synthesizer built with React and Web Audio API. Create unique sounds for music production with 3-oscillator architecture, advanced synthesis engines, extensive effects processing, and WAV export. Features FM/AM/Modal/Additive/Granular synthesis for creating everything from clean tones to abrasive, impactful sounds.

## Features

### Multi-Oscillator Architecture (3 OSC)
- 4 waveforms: Sine, triangle, sawtooth, and square
- Per-oscillator: Pitch (20-20000Hz), detune (-100 to +100 cents), drift (0-100%), level (0-100%)
- FM synthesis per oscillator: ratio, depth, modulator waveform
- AM synthesis per oscillator: ratio, depth, modulator waveform
- Individual enable/disable switches

### Advanced Synthesis Engines (Dropdown Selector)
- **Modal Synthesis**: 4 resonant modes with ratio/decay/level controls, impact noise, metallic/percussive sounds
- **Additive Synthesis**: 8 harmonic partials with individual levels, spread, and decay slope
- **Granular Synthesis**: Grain clouds with density, size, pitch, spray, scatter, and texture (noise/sine/saw/click)

### 3-Envelope System with Routing
- Attack/Hold/Decay (AHD) envelopes with linear, exponential, and logarithmic curves
- ENV1: Primary amplitude envelope
- ENV2/ENV3: Assignable modulation envelopes with routing targets:
  - Amplitude, Filter, Pitch, OSC1, OSC2, OSC3
- Modulation amount control (0-100%)

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

### Impact/Transient Tools
- **Transient Shaper**: Attack boost/cut (-100 to +100%), sustain control (-100 to +100%)
- **Hard Limiter**: Threshold (-30 to 0 dB), release time (10-500ms)
- **Multiband Distortion**: 3-band frequency splitting with individual drive controls per band

### Output & Export
- Volume and stereo panning controls
- WAV export at 44.1kHz or 48kHz, mono or stereo
- Normalization option

### Preset Management
- 19 factory presets showcasing various sounds:
  - Basic: Soft Pluck, Deep Bass, Sharp Click, Warm Pad, Dirty Synth, Comb Pluck, Space Delay, Chorus Strings
  - FM/AM: FM Bell, FM Brass, AM Tremolo
  - Modal: Modal Bell, Metal Hit, Industrial Clang
  - Additive: Organ Tones
  - Granular: Grain Cloud, Noise Burst
  - Impact: Impact Slam, Glitch Stab
- User presets with save/load/delete
- Import/export presets as JSON

### Randomization
- Full randomization with chaos control slider
- Gentle mutation for variations
- Reset to default

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Audio**: Web Audio API with OfflineAudioContext for rendering
- **State**: React hooks with localStorage for presets

## Project Structure
```
client/src/
├── components/
│   └── synth/
│       ├── Knob.tsx              # Rotary knob control (xs/sm/md/lg sizes)
│       ├── WaveformDisplay.tsx   # Audio visualization
│       ├── CollapsiblePanel.tsx  # Collapsible panel wrapper for sections
│       ├── EnvelopePanel.tsx     # AHD envelope with routing
│       ├── OscillatorPanel.tsx   # Waveform & pitch controls + FM/AM
│       ├── FilterPanel.tsx       # 9 filter types
│       ├── EffectsPanel.tsx      # Distortion, delay, reverb, chorus, impact tools
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
Integrated in Synthesizer.tsx using Web Audio API:

1. **Real-time playback**: AudioContext for live preview
2. **Offline rendering**: OfflineAudioContext for WAV export
3. **Signal chain**: 
   - 3 Oscillators (mixed) → Filter (optional) → Effects → Panner → Gain → Output
4. **Comb filter**: Delay node with feedback loop
5. **Reverb**: ConvolverNode with generated impulse response
6. **Chorus**: Dual LFO-modulated delay lines

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
