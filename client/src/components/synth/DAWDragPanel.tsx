import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { GripVertical, Download, Check, AlertCircle } from "lucide-react";
import { initDragElement, downloadAudioBlob, checkDAWDragSupport } from "@/lib/dawDragDrop";

interface DAWDragPanelProps {
  onRenderAudio: () => Promise<Blob>;
  isExporting: boolean;
}

export function DAWDragPanel({ onRenderAudio, isExporting }: DAWDragPanelProps) {
  const [fileName, setFileName] = useState("oneshot");
  const [isDragging, setIsDragging] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastExportTime, setLastExportTime] = useState<number | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsSupported(checkDAWDragSupport());
  }, []);

  useEffect(() => {
    if (!dragRef.current) return;

    if (cleanupRef.current) {
      cleanupRef.current();
    }

    cleanupRef.current = initDragElement(
      dragRef.current,
      onRenderAudio,
      `${fileName}.wav`,
      () => setIsDragging(true),
      () => {
        setIsDragging(false);
        setLastExportTime(Date.now());
      }
    );

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [onRenderAudio, fileName]);

  const handleDownloadClick = async () => {
    try {
      const blob = await onRenderAudio();
      downloadAudioBlob(blob, `${fileName}.wav`);
      setLastExportTime(Date.now());
    } catch (err) {
      console.error("Failed to export audio:", err);
    }
  };

  return (
    <Card className="bg-card/50 border-primary/20" data-testid="daw-drag-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-primary">DAW Drag Export</CardTitle>
          {isSupported ? (
            <Badge variant="outline" className="text-xs border-primary/30">
              Drag to DAW
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-500">
              Download Only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">File Name</Label>
          <div className="flex gap-2">
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              placeholder="oneshot"
              className="h-8 text-sm"
              data-testid="daw-filename"
            />
            <span className="text-sm text-muted-foreground self-center">.wav</span>
          </div>
        </div>

        <div
          ref={dragRef}
          className={`
            relative flex items-center justify-center gap-3 p-4 rounded-lg border-2 border-dashed
            transition-all cursor-grab active:cursor-grabbing
            ${isDragging 
              ? "border-primary bg-primary/10 scale-[1.02]" 
              : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"
            }
            ${isExporting ? "opacity-50 pointer-events-none" : ""}
          `}
          data-testid="daw-drag-zone"
        >
          <GripVertical className="w-5 h-5 text-primary/60" />
          <div className="text-center">
            <div className="text-sm font-medium">
              {isDragging ? "Release in DAW" : "Drag to DAW"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isSupported 
                ? "Drop into your DAW track" 
                : "Use download button below"
              }
            </div>
          </div>
          {isDragging && (
            <div className="absolute inset-0 bg-primary/5 rounded-lg animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDownloadClick}
            disabled={isExporting}
            data-testid="daw-download"
          >
            <Download className="w-4 h-4 mr-2" />
            Download WAV
          </Button>
          {lastExportTime && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Check className="w-3 h-3" />
              Exported
            </div>
          )}
        </div>

        {!isSupported && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-xs text-yellow-500/80">
              Direct DAW drag not supported in this browser. Use download and import manually.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
