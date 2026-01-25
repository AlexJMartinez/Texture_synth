import type { Express, Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const HYPERPOP_PROMPT = `You are an expert sound designer specializing in hyperpop, PC Music, and avant-garde electronic percussion. Generate synth parameters for extreme, hard-hitting one-shot percussive sounds inspired by SOPHIE, Umru, 100 Gecs, A.G. Cook, and Danny L Harle.

STYLE GUIDELINES:
- Aggressive FM/PM synthesis with fast index envelopes for metallic/glassy textures
- Heavy saturation, distortion, and bitcrushing for grit and edge
- Sharp transients with extreme attack shaping
- Pitch drops and sweeps for impact
- Click layers for added snap and presence
- Sub bass layers for weight
- Creative use of spectral scrambling for glitchy, alien textures
- Hard limiting and compression for loudness

Generate parameters that create interesting, abrasive, impactful percussion sounds. Be creative and push boundaries.

Respond with a JSON object matching this exact structure. All numeric values must be within the specified ranges:

{
  "oscillators": {
    "osc1": { "enabled": true/false, "waveform": "sine"|"triangle"|"sawtooth"|"square"|"noise", "pitchHz": 50-8000, "detune": -100 to 100, "drift": 0-100, "level": 50-100, "fmEnabled": true/false, "fmRatio": 0.25-16, "fmDepth": 0-1000, "fmWaveform": "sine"|"triangle"|"sawtooth"|"square", "fmFeedback": 0-1, "pmEnabled": true/false, "pmRatio": 0.25-16, "pmDepth": 0-60, "pmWaveform": "sine"|"triangle"|"sawtooth"|"square", "pmFeedback": 0-1, "indexEnvEnabled": true/false, "indexEnvDecay": 2-100, "indexEnvDepth": 0-60 },
    "osc2": { same structure },
    "osc3": { same structure }
  },
  "envelopes": {
    "env1": { "enabled": true, "attack": 0-2000, "hold": 0-2000, "decay": 0-5000, "curve": "linear"|"exponential"|"logarithmic", "target": "amplitude", "amount": -100 to 100 },
    "env2": { same, "target": "filter" },
    "env3": { same, "target": "pitch" }
  },
  "filter": { "enabled": true/false, "frequency": 20-20000, "resonance": 0-30, "type": "lowpass"|"highpass"|"bandpass"|"notch"|"comb", "combDelay": 0.1-50, "gain": -24 to 24 },
  "clickLayer": { "enabled": true/false, "level": 0-100, "decay": 1-10, "filterType": "highpass"|"bandpass", "filterFreq": 1000-15000, "filterQ": 1-10, "srrEnabled": true/false, "srrAmount": 1-16, "noiseType": "white"|"pink"|"brown" },
  "subOsc": { "enabled": true/false, "waveform": "sine"|"triangle", "octave": -2|-1|0, "level": 0-100, "attack": 0-100, "decay": 10-2000, "filterEnabled": true/false, "filterFreq": 20-200, "hpFreq": 10-60, "drive": 0-100 },
  "spectralScrambler": { "enabled": true/false, "fftSize": "256"|"512"|"1024"|"2048", "scrambleAmount": 0-50, "binShift": -20 to 20, "freeze": false, "mix": 20-50 },
  "saturationChain": { "enabled": true/false, "tapeEnabled": true/false, "tapeDrive": 0-100, "tapeWarmth": 0-100, "tubeEnabled": true/false, "tubeDrive": 0-100, "tubeBias": 0-100, "transistorEnabled": true/false, "transistorDrive": 0-100, "transistorAsymmetry": 0-100, "mix": 0-100 },
  "waveshaper": { "enabled": true/false, "curve": "softclip"|"hardclip"|"foldback"|"sinefold"|"chebyshev"|"asymmetric"|"tube", "drive": 0-100, "mix": 0-100, "preFilterFreq": 20-20000, "preFilterEnabled": true/false, "postFilterFreq": 20-20000, "postFilterEnabled": true/false, "oversample": "none"|"2x"|"4x" },
  "effects": { "saturation": 0-100, "bitcrusher": 1-16, "delayEnabled": true/false, "delayTime": 0-2000, "delayFeedback": 0-95, "delayMix": 0-100, "reverbEnabled": true/false, "reverbSize": 0-100, "reverbMix": 0-100, "reverbDecay": 0.1-10, "transientEnabled": true/false, "transientAttack": -100 to 100, "transientSustain": -100 to 100, "limiterEnabled": true/false, "limiterThreshold": -30 to 0, "limiterRelease": 10-500, "multibandEnabled": true/false, "multibandLowFreq": 80-400, "multibandHighFreq": 2000-10000, "multibandLowDrive": 0-100, "multibandMidDrive": 0-100, "multibandHighDrive": 0-100 },
  "mastering": { "compressorEnabled": true/false, "compressorThreshold": -40 to 0, "compressorRatio": 1-20, "compressorAttack": 0.1-100, "compressorRelease": 10-1000, "compressorKnee": 0-40, "compressorMakeup": 0-24, "exciterEnabled": true/false, "exciterFreq": 2000-12000, "exciterAmount": 0-100, "exciterMix": 0-100, "stereoEnabled": true/false, "stereoWidth": 0-200 }
}

Only respond with valid JSON. No markdown, no explanation.`;

export function registerAIRandomizeRoutes(app: Express): void {
  app.post("/api/ai-randomize", async (req: Request, res: Response) => {
    try {
      const { style = "hyperpop" } = req.body;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: HYPERPOP_PROMPT },
          { role: "user", content: `Generate a unique ${style} percussion sound with extreme character. Make it punchy, metallic, and impactful.` }
        ],
        temperature: 1.0,
        max_tokens: 2000,
      });
      
      const content = response.choices[0]?.message?.content || "{}";
      
      // Parse the JSON response
      let aiParams;
      try {
        aiParams = JSON.parse(content.trim());
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          aiParams = JSON.parse(jsonMatch[1].trim());
        } else {
          throw parseError;
        }
      }
      
      res.json({ success: true, params: aiParams });
    } catch (error) {
      console.error("AI Randomize error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate AI parameters" 
      });
    }
  });
}
