# OneShot Synth - Multi-Oscillator One-Shot Generator

## Overview
OneShot Synth is a professional web-based one-shot synthesizer built with React and Tone.js. Its primary purpose is to enable music producers to create unique, percussive sounds with an aggressive envelope style, similar to the hyperpop genre and the Synplant VST. It features a 3-oscillator architecture, advanced synthesis engines (FM/AM/Modal/Additive/Granular), extensive effects processing, and WAV export capabilities. The project aims to provide a powerful tool for generating everything from clean tones to abrasive and impactful sounds.

## User Preferences
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `shared`.

## System Architecture
The application is built using React with TypeScript and Vite for the frontend, styled with Tailwind CSS and shadcn/ui components. Tone.js is utilized for audio context management, leveraging the Web Audio API for synthesis. State management relies on React hooks with localStorage for presets and custom impulse responses.

The UI features a clean, professional audio design with a tabbed organization system: Sound, Layers, FX, Master, and Export. It employs a soft green color palette inspired by Felt Instruments, with a dark background, primary soft sage green, and accent mint green hues. Visualizations include a 3D terrain waveform display with a purple to cyan gradient that animates in response to audio data. Controls are compact knobs with double-click/double-tap functionality to reset values.

Core architectural decisions include:
- **Multi-Oscillator Architecture**: Three main oscillators with sine, triangle, sawtooth, and square waveforms, featuring per-oscillator pitch, detune, drift, level, and FM/PM/AM synthesis capabilities.
- **Click Layer**: A dedicated transient generator with ultra-fast noise, various noise types, filter options, and sample rate reduction.
- **Sub Oscillator**: A separate layer for low-end, offering sine and triangle waveforms with dedicated envelopes and filtering.
- **Advanced Synthesis Engines**: Selectable Modal, Additive, and Granular synthesis engines for diverse sound generation.
  - **Modal Synthesis**: Physical modeling with modeCount (1-4 resonant modes), inharmonicity (0-100% quadratic detuning), exciterType (noise burst/sharp impulse/soft mallet/pitched pluck), plus per-mode ratio, decay, and level controls.
  - **Additive Synthesis**: Harmonic stacking with partialCount (1-8 active harmonics), randomness (0-100% pitch and level variation), spread, decay slope, and per-partial level/detune controls.
  - **Granular Synthesis**: Cloud-based textures with density, grain size, pitch, pitchSpray (pitch randomness), scatter (position jitter), and texture selection (noise/sine/saw/click).
- **3-Envelope System**: Hard-wired Attack/Hold/Decay (AHD) envelopes for filter cutoff, pitch, and amplitude control.
- **Advanced Filters**: Nine filter types including standard, advanced, and comb filters.
- **Effects Chain**: Integrated Distortion, Bitcrusher, Delay (with beat-sync option), Convolution Reverb, and Chorus.
  - **Delay Beat Sync**: Switch between milliseconds and tempo-synced delay times (1/1, 1/2, 1/4, 1/8, 1/16, 1/32, triplets, dotted notes).
- **Modulation System**: Phaseplant-style modulator rack at the bottom of the UI.
  - **LFO**: Sine, triangle, sawtooth, square, random shapes with rate sync option, phase control, and bipolar/unipolar modes.
  - **Envelope**: ADSR modulator with attack, decay, sustain, release controls.
  - **Random/S&H**: Sample-and-hold random modulation with rate and smoothing controls.
  - **Macro**: Manual control knobs assignable to multiple parameters.
  - **Modulation Routing**: Assign any modulator to any parameter with depth control.
- **Waveshaper**: A Dent-style waveshaper with 7 curve types and 4x oversampling.
- **Spectral Bin Scrambler**: An FFT-based frequency manipulation tool using radix-2 Cooley-Tukey algorithm (O(N log N)) with overlap-add windowing and Hermitian symmetry for real-valued output. Features FFT size selection (256-2048 bins), scramble amount, bin shift, freeze mode, spectral gating (-60dB to 0dB threshold for tearing/crackle effects), spectral stretch/squeeze (0.5x-2.0x for moving frequencies up/down), bin density control (5%-100% for sparse/broken sounds), and wet/dry mix for metallic, glitchy hyperpop textures. Includes audibility safeguards: wet mix capped at 70%, energy normalization (up to 4x gain), and automatic wet reduction if processed signal is too quiet. DC and Nyquist bins are preserved unshifted but apply gating/density for signal integrity.
- **Multi-Stage Saturation Chain**: Three-stage saturation (Tape, Tube, Transistor) for harmonic content.
- **Mastering Section**: Includes a Soft-Knee Compressor, HF Exciter, and Stereo Widener.
- **Impact/Transient Tools**: Features a Transient Shaper, Hard Limiter, and Multiband Distortion.
- **Real-time Playback & Offline Rendering**: Tone.js for live preview and Tone.Offline for WAV export.
- **Canonical Pitch Model**: Internal pitch representation uses `PitchState {mode, baseHz, st, cents}` for flexible display and consistent audio generation.
- **Audio Retriggering**: Gain ramps and scheduled stops prevent audio pops/clicks.
- **Preset Management**: Factory presets and user presets with save/load/delete functionality, stored in localStorage.
- **Randomization**: Features full randomization with chaos control slider (10-100%) and gentle mutation. Includes audibility safeguards to prevent silent outputs.

## External Dependencies
- **React**: Frontend library.
- **TypeScript**: Superset of JavaScript for type safety.
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components.
- **Tone.js**: Web Audio framework for audio synthesis and manipulation.
- **Web Audio API**: Browser-native API for processing and synthesizing audio.
