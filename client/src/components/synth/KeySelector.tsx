import { useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
type NoteName = typeof NOTES[number];

export interface KeyState {
  note: NoteName;
  octave: number;
}

export function noteToMidi(note: NoteName, octave: number): number {
  const noteIndex = NOTES.indexOf(note);
  return (octave + 1) * 12 + noteIndex;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function keyToFrequency(note: NoteName, octave: number): number {
  return midiToFrequency(noteToMidi(note, octave));
}

export function frequencyToNearestKey(frequency: number): KeyState {
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const roundedMidi = Math.round(midi);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  return {
    note: NOTES[noteIndex],
    octave: Math.max(0, Math.min(8, octave)),
  };
}

interface KeySelectorProps {
  value: KeyState;
  onChange: (key: KeyState) => void;
  className?: string;
}

export function KeySelector({ value, onChange, className = "" }: KeySelectorProps) {
  const handleNoteChange = useCallback((note: string) => {
    onChange({ ...value, note: note as NoteName });
  }, [value, onChange]);

  const handleOctaveUp = useCallback(() => {
    if (value.octave < 8) {
      onChange({ ...value, octave: value.octave + 1 });
    }
  }, [value, onChange]);

  const handleOctaveDown = useCallback(() => {
    if (value.octave > 0) {
      onChange({ ...value, octave: value.octave - 1 });
    }
  }, [value, onChange]);

  return (
    <div className={`flex items-center gap-1 ${className}`} data-testid="key-selector">
      <Select value={value.note} onValueChange={handleNoteChange}>
        <SelectTrigger 
          className="w-14 text-xs font-medium"
          data-testid="select-key-note"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NOTES.map((note) => (
            <SelectItem key={note} value={note} data-testid={`select-key-note-${note}`}>
              {note}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={handleOctaveUp}
          disabled={value.octave >= 8}
          className="p-0.5 rounded hover-elevate active-elevate-2 disabled:opacity-40"
          data-testid="button-octave-up"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <span 
          className="text-xs font-mono text-center leading-none select-none min-w-[1rem]"
          data-testid="text-octave-value"
        >
          {value.octave}
        </span>
        <button
          type="button"
          onClick={handleOctaveDown}
          disabled={value.octave <= 0}
          className="p-0.5 rounded hover-elevate active-elevate-2 disabled:opacity-40"
          data-testid="button-octave-down"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
