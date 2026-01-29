import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, Music } from "lucide-react";
import { Knob } from "./Knob";
import type { MIDIInputSettings, MIDIDevice } from "@/lib/midiInput";
import { midiInputManager } from "@/lib/midiInput";

interface MIDIInputPanelProps {
  settings: MIDIInputSettings;
  onChange: (settings: MIDIInputSettings) => void;
  onNoteOn?: (note: number, velocity: number) => void;
}

export function MIDIInputPanel({ settings, onChange, onNoteOn }: MIDIInputPanelProps) {
  const [devices, setDevices] = useState<MIDIDevice[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastNote, setLastNote] = useState<number | null>(null);

  const refreshDevices = useCallback(async () => {
    const available = midiInputManager.getAvailableInputs();
    setDevices(available);
  }, []);

  useEffect(() => {
    const init = async () => {
      const success = await midiInputManager.initialize();
      setIsInitialized(success);
      if (success) {
        refreshDevices();
      }
    };
    init();
  }, [refreshDevices]);

  useEffect(() => {
    midiInputManager.updateSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (onNoteOn) {
      midiInputManager.setNoteOnCallback((note, velocity) => {
        setLastNote(note);
        onNoteOn(note, velocity);
        // Clear last note display after 500ms
        setTimeout(() => setLastNote(null), 500);
      });
    }
    return () => {
      midiInputManager.disconnect();
    };
  }, [onNoteOn]);

  const noteToName = (note: number): string => {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(note / 12) - 1;
    return `${names[note % 12]}${octave}`;
  };

  if (!isInitialized) {
    return (
      <Card className="w-full" data-testid="midi-input-panel">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-medium text-primary">MIDI Input</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-muted-foreground">
            MIDI not available in this browser. Use Chrome or Edge for MIDI support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="midi-input-panel">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">MIDI Input</CardTitle>
          <div className="flex items-center gap-2">
            {lastNote !== null && (
              <span className="text-xs bg-primary/20 px-2 py-0.5 rounded animate-pulse">
                {noteToName(lastNote)}
              </span>
            )}
            <Label htmlFor="midi-enabled" className="text-xs text-muted-foreground">
              On
            </Label>
            <Switch
              id="midi-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
              data-testid="switch-midi-enabled"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Device selection */}
        <div className="flex items-center gap-2">
          <Select
            value={settings.selectedInputId || "none"}
            onValueChange={(id) =>
              onChange({ ...settings, selectedInputId: id === "none" ? null : id })
            }
            disabled={!settings.enabled}
          >
            <SelectTrigger className="flex-1 h-7 text-xs" data-testid="select-midi-device">
              <SelectValue placeholder="Select MIDI device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No device</SelectItem>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  <div className="flex items-center gap-2">
                    <Music className="h-3 w-3" />
                    <span>{device.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            onClick={refreshDevices}
            disabled={!settings.enabled}
            title="Refresh devices"
            data-testid="button-refresh-midi"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {settings.enabled && (
          <>
            {/* Velocity sensitive toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Velocity Sensitive</Label>
              <Switch
                checked={settings.velocitySensitive}
                onCheckedChange={(velocitySensitive) =>
                  onChange({ ...settings, velocitySensitive })
                }
                data-testid="switch-velocity-sensitive"
              />
            </div>

            {/* Note range */}
            <div className="grid grid-cols-2 gap-2">
              <Knob
                value={settings.noteRange.min}
                onChange={(min) =>
                  onChange({ ...settings, noteRange: { ...settings.noteRange, min } })
                }
                min={0}
                max={126}
                step={1}
                label="Min Note"
                size="xs"
              />
              <Knob
                value={settings.noteRange.max}
                onChange={(max) =>
                  onChange({ ...settings, noteRange: { ...settings.noteRange, max } })
                }
                min={1}
                max={127}
                step={1}
                label="Max Note"
                size="xs"
              />
            </div>
          </>
        )}

        {devices.length === 0 && settings.enabled && (
          <p className="text-[10px] text-muted-foreground">
            No MIDI devices found. Connect a device and click refresh.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
