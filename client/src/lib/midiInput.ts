// MIDI Input support for triggering sounds

export interface MIDIInputSettings {
  enabled: boolean;
  selectedInputId: string | null;
  velocitySensitive: boolean;
  noteRange: { min: number; max: number }; // MIDI note numbers 0-127
}

export const defaultMIDISettings: MIDIInputSettings = {
  enabled: false,
  selectedInputId: null,
  velocitySensitive: true,
  noteRange: { min: 0, max: 127 },
};

const STORAGE_KEY = "synthMIDISettings";

export function loadMIDISettings(): MIDIInputSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultMIDISettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load MIDI settings:", e);
  }
  return { ...defaultMIDISettings };
}

export function saveMIDISettings(settings: MIDIInputSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save MIDI settings:", e);
  }
}

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export type MIDINoteCallback = (note: number, velocity: number) => void;

export class MIDIInputManager {
  private midiAccess: MIDIAccess | null = null;
  private noteOnCallback: MIDINoteCallback | null = null;
  private settings: MIDIInputSettings = { ...defaultMIDISettings };
  private currentInput: MIDIInput | null = null;

  async initialize(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API not supported in this browser");
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      return true;
    } catch (e) {
      console.error("Failed to get MIDI access:", e);
      return false;
    }
  }

  getAvailableInputs(): MIDIDevice[] {
    if (!this.midiAccess) return [];

    const devices: MIDIDevice[] = [];
    this.midiAccess.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name || "Unknown Device",
        manufacturer: input.manufacturer || "Unknown",
      });
    });
    return devices;
  }

  setNoteOnCallback(callback: MIDINoteCallback): void {
    this.noteOnCallback = callback;
  }

  updateSettings(settings: MIDIInputSettings): void {
    this.settings = settings;
    this.connectToSelectedInput();
  }

  private connectToSelectedInput(): void {
    // Disconnect from previous input
    if (this.currentInput) {
      this.currentInput.onmidimessage = null;
      this.currentInput = null;
    }

    if (!this.midiAccess || !this.settings.enabled || !this.settings.selectedInputId) {
      return;
    }

    const input = this.midiAccess.inputs.get(this.settings.selectedInputId);
    if (input) {
      this.currentInput = input;
      input.onmidimessage = this.handleMIDIMessage.bind(this);
    }
  }

  private handleMIDIMessage(event: MIDIMessageEvent): void {
    if (!this.noteOnCallback || !this.settings.enabled) return;

    const data = event.data;
    if (!data || data.length < 3) return;

    const command = data[0] & 0xf0;
    const note = data[1];
    const velocity = data[2];

    // Note On (0x90) with velocity > 0
    if (command === 0x90 && velocity > 0) {
      // Check note range
      if (note >= this.settings.noteRange.min && note <= this.settings.noteRange.max) {
        const normalizedVelocity = this.settings.velocitySensitive ? velocity / 127 : 1;
        this.noteOnCallback(note, normalizedVelocity);
      }
    }
  }

  disconnect(): void {
    if (this.currentInput) {
      this.currentInput.onmidimessage = null;
      this.currentInput = null;
    }
  }
}

// Singleton instance
export const midiInputManager = new MIDIInputManager();
