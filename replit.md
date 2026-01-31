# OneShot Synth - Multi-Oscillator One-Shot Generator

## Overview
OneShot Synth is a professional web-based synthesizer designed for music producers to create unique, aggressive, percussive sounds akin to hyperpop and Synplant VST. It features a 3-oscillator architecture, advanced synthesis engines (FM/AM/Modal/Additive), extensive effects, and flexible export options (WAV/MP3, various sample rates). The project aims to be a powerful tool for generating a wide range of impactful sounds.

## User Preferences
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `shared`.

## System Architecture
The application uses React with TypeScript and Vite for the frontend, styled with Tailwind CSS and shadcn/ui. Tone.js manages audio, leveraging the Web Audio API. State relies on React hooks with localStorage for local settings, and PostgreSQL for global user presets.

The UI features a clean, professional audio design with tabbed organization (Sound, Layers, FX, Master, Export), using a soft green color palette and a dark background. Visualizations include a 3D terrain waveform display. Controls are compact knobs with double-click reset.

Key architectural decisions include:
- **Multi-Oscillator Architecture**: Three main oscillators with multiple waveforms, per-oscillator pitch, detune, drift, level, and advanced FM/PM/AM capabilities. FM synthesis bypasses the main oscillator waveform when active.
- **Per-Oscillator AHD Envelopes**: Independent Attack/Hold/Decay envelopes for each oscillator's amplitude.
- **Dedicated Layers**: A Click Layer for transients and a Sub Oscillator for low-end.
- **Advanced Synthesis Engines**: Selectable Modal and Additive synthesis, which update their basePitch based on the global key selector.
  - **Modal Synthesis**: Physical modeling with modeCount, inharmonicity, and various exciter types.
  - **Additive Synthesis**: Harmonic stacking with partialCount, randomness, spread, and decay slope.
- **Granular Synthesis Engine**: Real-time granular synthesis with sample-accurate grain scheduling. Features two modes (Cinematic and Design with guardrails vs full range), sample input (capture synth or drag-drop), density-based grain scheduling. Window types include Hann, Gauss, Blackman, Rect, Tukey, and Trapezoid. Industry-standard parameter ranges aligned with PhasePlant/Quanta (grain size 1-500ms, density 1-500 gps, pitch ±48 semitones). Advanced features include reverse probability for backwards grains, timing jitter for spawn randomization, per-grain amplitude variance, and warm start mode. Per-grain AHD envelopes with automatic phase scaling to fit grain duration. Window skew using power curve to shift grain energy front/back. Scan rate animation using audio-clock timing for deterministic export. Post-bus processing chain includes HP/LP filters (anti-mud), soft saturation waveshaper, and Haas stereo widening with mono source handling. Parameters update in real-time during playback via a main-thread scheduler. Uses AudioWorkletProcessor when available, with automatic ScriptProcessorNode fallback. Post-processing nodes are properly cleaned up on chain rebuild to prevent memory leaks.
- **3-Envelope System**: Dedicated AHD envelopes for filter cutoff, pitch, and amplitude, with extended ranges for precise control. Pitch envelope uses semitone-based modulation.
- **Advanced Filters**: Nine filter types with enhancements like Filter Drive/Saturation, Dual Filter Mode (series/parallel), Formant Filter, Filter FM, Keytracking, and Self-Oscillation.
- **Effects Chain**: Integrated Distortion, Bitcrusher, Delay (with beat-sync), Convolution Reverb (with custom IR loading and advanced processing), Algorithmic Reverb (with type-specific early reflections, pre-delay, damping, diffusion, modulation), and Chorus.
- **Modulation System**: A Phaseplant-style modulator rack offering LFO, ADSR Envelope, Random/S&H, and Macro controls. Features flexible routing to 95+ parameters including all granular synthesis controls, with visual feedback.
- **Waveshaper**: A Dent-style waveshaper with 7 curve types and 4x oversampling. Enhanced with Asymmetric Shaping, Multi-Band Waveshaping, Dynamic Shaping, Chebyshev Polynomials, Foldback Iterations, and a Custom Curve Editor.
- **Spectral Bin Scrambler**: An FFT-based frequency manipulation tool with scramble amount, bin shift, freeze mode, spectral gating, stretch/squeeze, and bin density control. Includes audibility safeguards.
- **Multi-Stage Saturation Chain**: Three-stage saturation (Tape, Tube, Transistor).
- **Mastering Section**: Soft-Knee Compressor, HF Exciter, and Stereo Widener.
- **Impact/Transient Tools**: Transient Shaper, Hard Limiter, and Multiband Distortion.
- **Real-time Playback & Offline Rendering**: Tone.js for live preview and Tone.Offline for WAV export.
- **Canonical Pitch Model**: Internal pitch representation for consistent audio generation.
- **Audio Retriggering**: Gain ramps and scheduled stops prevent audio artifacts.
- **Preset Management**: Factory presets and shared user presets (PostgreSQL), with local hiding and import/export.
- **Randomization**: Full randomization with chaos control and gentle mutation, including audibility safeguards.
- **Unison/Super Mode**: Per-oscillator voice stacking with detune, stereo width, and blend controls.
- **Ring Modulation**: Dedicated modulator oscillator with configurable frequency, waveform, depth, and AHD envelope.
- **Sample Layer**: Drag-and-drop audio import with pitch, envelopes, position, reverse, and loop controls.
- **Multiband Compression**: 3-band compressor with adjustable crossovers and per-band controls.
- **Phaser/Flanger Effects**: Modulation effects with rate, depth, feedback, mix, and specific parameters like phaser stages or flanger base delay.
- **Parametric EQ**: 3-band EQ (low shelf, peaking, high shelf) with frequency, gain, and Q controls.
- **Round-Robin Export**: Generates subtle variations of sounds for realistic playback.
- **Parallel Processing**: Global dry/wet blend for the effects chain with separate gain controls.
- **MIDI Input**: Web MIDI API integration for triggering sounds, with device selection, velocity sensitivity, and note range filtering.
- **Undo/Redo System**: 50-state parameter history for main synth parameters.
- **Keyboard Shortcuts**: Spacebar (play/trigger), E (export), Ctrl+Z/Y (undo/redo).
- **Curve Modulator**: Drawable one-shot envelope curves with control points, spline interpolation, and loop modes.
- **Step Sequencer Modulator**: 8/16-step sequencer with tempo-synced rates, swing, and smoothing.
- **DAW Drag Export**: Drag-and-drop audio files into DAWs, with fallback download.

## External Dependencies
- **React**: Frontend library.
- **TypeScript**: Type-safe JavaScript.
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components.
- **Tone.js**: Web Audio framework.
- **Web Audio API**: Browser-native audio processing.
- **PostgreSQL**: Database for user presets.