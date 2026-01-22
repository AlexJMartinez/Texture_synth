# OneShot Synth - Web Audio Generator

## Overview
A powerful web-based one-shot synthesizer built with React and Web Audio API. Create unique sounds for music production with FM synthesis capabilities, offline rendering, and WAV export.

## Features
- **Oscillator**: Sine, triangle, sawtooth, and square waveforms with pitch, detune, and drift controls
- **Envelope**: Attack/Hold/Decay (AHD) envelope with linear, exponential, and logarithmic curves
- **Filter**: Low-pass, high-pass, and band-pass filters with frequency and resonance controls
- **Effects**: Saturation (waveshaping) and bit depth control
- **Output**: Volume and stereo panning
- **Presets**: Save/load custom presets, factory presets included
- **Randomize**: Full randomization with chaos control, and gentle mutation
- **Export**: Render to WAV at 44.1kHz or 48kHz, mono or stereo, with normalization option
- **Waveform Display**: Real-time visualization of generated audio

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Audio**: Web Audio API with OfflineAudioContext for rendering
- **State**: React hooks (no backend required for core functionality)

## Project Structure
```
client/src/
├── components/
│   └── synth/           # Synthesizer UI components
│       ├── Knob.tsx           # Rotary knob control
│       ├── WaveformDisplay.tsx # Audio visualization
│       ├── EnvelopePanel.tsx   # AHD envelope controls
│       ├── OscillatorPanel.tsx # Waveform & pitch
│       ├── FilterPanel.tsx     # Filter controls
│       ├── EffectsPanel.tsx    # Saturation & bitcrusher
│       ├── OutputPanel.tsx     # Volume & pan
│       ├── PresetPanel.tsx     # Preset management
│       ├── ExportPanel.tsx     # WAV export settings
│       ├── TriggerButton.tsx   # Play button
│       ├── RandomizeControls.tsx # Randomize/mutate
│       └── WaveformIcons.tsx   # SVG waveform icons
├── pages/
│   └── Synthesizer.tsx  # Main synth page with audio engine
└── lib/
    └── queryClient.ts   # React Query setup

shared/
└── schema.ts            # TypeScript types for synth parameters
```

## Audio Engine
The audio engine uses the Web Audio API and is integrated directly in the Synthesizer component:

1. **Real-time playback**: Uses AudioContext for live preview
2. **Offline rendering**: Uses OfflineAudioContext for consistent WAV export
3. **Signal chain**: Oscillator → Filter (optional) → Saturation → Panner → Gain → Output

## Usage
1. Click the large trigger button or press Space to play a sound
2. Adjust oscillator, envelope, filter, and effects parameters
3. Use Randomize for new sounds, Mutate for variations
4. Save presets for later use
5. Export to WAV for use in DAWs

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production

## Color Scheme
Dark audio-themed UI with purple primary (#8B5CF6) and cyan accent (#14B8A6) colors.
