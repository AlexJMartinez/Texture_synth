# OneShot Synth - Multi-Oscillator One-Shot Generator

## Overview
OneShot Synth is a professional web-based one-shot synthesizer built with React and Tone.js. Its primary purpose is to enable music producers to create unique, percussive sounds with an aggressive envelope style, similar to the hyperpop genre and the Synplant VST. It features a 3-oscillator architecture, advanced synthesis engines (FM/AM/Modal/Additive/Granular), extensive effects processing, and flexible export capabilities (WAV/MP3 formats, 44.1k/48k/96k sample rates). The project aims to provide a powerful tool for generating everything from clean tones to abrasive and impactful sounds.

## User Preferences
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `shared`.

## System Architecture
The application is built using React with TypeScript and Vite for the frontend, styled with Tailwind CSS and shadcn/ui components. Tone.js is utilized for audio context management, leveraging the Web Audio API for synthesis. State management relies on React hooks with localStorage for presets and custom impulse responses.

The UI features a clean, professional audio design with a tabbed organization system: Sound, Layers, FX, Master, and Export. It employs a soft green color palette inspired by Felt Instruments, with a dark background, primary soft sage green, and accent mint green hues. Visualizations include a 3D terrain waveform display with a purple to cyan gradient that animates in response to audio data. Controls are compact knobs with double-click/double-tap functionality to reset values.

Core architectural decisions include:
- **Multi-Oscillator Architecture**: Three main oscillators with sine, triangle, sawtooth, and square waveforms, featuring per-oscillator pitch, detune, drift, level, and FM/PM/AM synthesis capabilities.
  - **Advanced FM Synthesis**: 2-operator FM per oscillator with algorithm routing (series/parallel/feedback/mixed), operator 2 controls (ratio, detune, depth, waveform, feedback), and fine-tuning for both operators. Settings stored in localStorage.
- **Per-Oscillator Envelopes**: Independent AHD (Attack/Hold/Decay) envelopes for each oscillator, allowing individual amplitude shaping before mixing to master. Stored in localStorage separately from presets. Each oscillator's ENV section has a toggle to enable and A/H/D knobs for timing control.
- **Click Layer**: A dedicated transient generator with ultra-fast noise, various noise types, filter options, and sample rate reduction.
- **Sub Oscillator**: A separate layer for low-end, offering sine and triangle waveforms with dedicated envelopes and filtering.
- **Advanced Synthesis Engines**: Selectable Modal, Additive, and Granular synthesis engines for diverse sound generation.
  - **Modal Synthesis**: Physical modeling with modeCount (1-4 resonant modes), inharmonicity (0-100% quadratic detuning), exciterType (noise burst/sharp impulse/soft mallet/pitched pluck), plus per-mode ratio, decay, and level controls.
  - **Additive Synthesis**: Harmonic stacking with partialCount (1-8 active harmonics), randomness (0-100% pitch and level variation), spread, decay slope, and per-partial level/detune controls.
  - **Granular Synthesis**: Cloud-based textures with density, grain size, pitch, pitchSpray (pitch randomness), scatter (position jitter), and texture selection (noise/sine/saw/click). Advanced controls include envelope shapes (hanning/gaussian/triangle/trapezoid/rectangular), position jitter, overlap control, reverse grain probability, stereo spread, and freeze mode.
- **3-Envelope System**: Hard-wired Attack/Hold/Decay (AHD) envelopes for filter cutoff, pitch, and amplitude control.
  - **Amp Envelope**: Extended ranges matching contemporary synths - Attack 0-10s (logarithmic), Hold 0-5s, Decay 0-30s (logarithmic) for fine control at fast times and long pad tails.
  - **Filter Envelope**: Extended ranges - Attack 0-10s (logarithmic), Hold 0-5s, Decay 0-30s (logarithmic) for sweeping filter movements.
  - **Pitch Envelope**: Standard ranges - Attack 0-2s, Hold 0-2s, Decay 0-10s.
  - **Pitch Envelope**: Uses semitone-based modulation (-48 to +48 st) for authentic 808-style pitch drops with exponential curve option.
- **Advanced Filters**: Nine filter types including standard, advanced, and comb filters. Enhanced with:
  - **Filter Drive/Saturation**: Pre or post-filter saturation with soft/hard/tube/tape modes.
  - **Dual Filter Mode**: Series or parallel routing of two independent filters with morph control.
  - **Formant Filter**: Vowel-based filtering (A, E, I, O, U) with resonant peak shaping.
  - **Filter FM**: Modulate cutoff frequency from oscillators or LFO with configurable depth.
  - **Keytracking**: Scale filter cutoff based on pitch (-100% to +100%).
  - **Self-Oscillation**: Enable filter resonance to produce tones at high Q.
- **Effects Chain**: Integrated Distortion, Bitcrusher, Delay (with beat-sync option), Convolution Reverb, Algorithmic Reverb, and Chorus.
  - **Algorithmic Reverb**: Three reverb types (Hall/Plate/Room) with enhanced impulse response generation featuring:
    - Type-specific early reflections (8/6/4 reflections for hall/plate/room)
    - Pre-delay control (0-200ms)
    - Damping for high-frequency decay control (0-100%)
    - Diffusion for tail density (0-100%)
    - Internal modulation to prevent metallic artifacts (0-100%)
    - Stereo width/decorrelation control (0-100%)
    - All settings stored in localStorage
  - **Delay Beat Sync**: Switch between milliseconds and tempo-synced delay times (1/1, 1/2, 1/4, 1/8, 1/16, 1/32, triplets, dotted notes).
  - **Enhanced Convolver**: Kilohearts-style convolution reverb with custom IR loading plus advanced processing: pre-delay (0-500ms), size/decay (10-100% with exponential curve), lo/hi cut filters (20Hz-20kHz with frequency clamping), reverse toggle, and time-stretch (0.5x-2x with linear interpolation). Settings stored in localStorage separately from presets.
- **Modulation System**: Phaseplant-style modulator rack at the bottom of the UI.
  - **LFO**: Sine, triangle, sawtooth, square, random shapes with rate sync option, phase control, and bipolar/unipolar modes.
  - **Envelope**: ADSR modulator with attack, decay, sustain, release controls.
  - **Random/S&H**: Sample-and-hold random modulation with rate and smoothing controls.
  - **Macro**: Manual control knobs assignable to multiple parameters.
  - **Modulation Routing**: Assign any modulator to 75+ parameters with depth control, including filter, oscillators, effects, spectral scrambler, mastering, and envelope amounts. Visual feedback shows colored rings on modulated knobs matching modulator colors (LFO=blue, Envelope=orange, Random=purple, Macro=green).
- **Waveshaper**: A Dent-style waveshaper with 7 curve types and 4x oversampling. Enhanced with:
  - **Asymmetric Shaping**: Apply different curves to positive and negative signal with DC offset control.
  - **Multi-Band Waveshaping**: 3-band split (low/mid/high) with independent curves and drive per band.
  - **Dynamic Shaping**: Envelope-follower driven distortion with sensitivity, attack, and release controls.
  - **Chebyshev Polynomials**: Order 2-7 for harmonic-rich distortion.
  - **Foldback Iterations**: 1-5 iterations for aggressive wavefold saturation.
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
