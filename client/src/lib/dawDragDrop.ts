export interface DAWDragDropState {
  isDragging: boolean;
  audioBlob: Blob | null;
  fileName: string;
}

export function createAudioDataTransfer(blob: Blob, fileName: string): DataTransfer {
  const dataTransfer = new DataTransfer();
  
  const file = new File([blob], fileName, { type: blob.type });
  dataTransfer.items.add(file);
  
  return dataTransfer;
}

export function initDragElement(
  element: HTMLElement,
  getAudioBlob: () => Promise<Blob>,
  fileName: string,
  onDragStart?: () => void,
  onDragEnd?: () => void
): () => void {
  let audioBlob: Blob | null = null;
  let objectUrl: string | null = null;
  
  const handleDragStart = async (e: DragEvent) => {
    if (!e.dataTransfer) return;
    
    onDragStart?.();
    
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", fileName);
    
    try {
      audioBlob = await getAudioBlob();
      
      if (audioBlob) {
        objectUrl = URL.createObjectURL(audioBlob);
        
        const file = new File([audioBlob], fileName, { type: audioBlob.type });
        
        try {
          e.dataTransfer.items.add(file);
        } catch (err) {
          console.log("File drag not supported, using download URL fallback");
          e.dataTransfer.setData("DownloadURL", `audio/wav:${fileName}:${objectUrl}`);
        }
      }
    } catch (err) {
      console.error("Failed to generate audio for drag:", err);
    }
  };
  
  const handleDragEnd = () => {
    onDragEnd?.();
    
    if (objectUrl) {
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl!);
        objectUrl = null;
      }, 1000);
    }
    audioBlob = null;
  };
  
  element.setAttribute("draggable", "true");
  element.addEventListener("dragstart", handleDragStart);
  element.addEventListener("dragend", handleDragEnd);
  
  return () => {
    element.removeAttribute("draggable");
    element.removeEventListener("dragstart", handleDragStart);
    element.removeEventListener("dragend", handleDragEnd);
    
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  };
}

export function downloadAudioBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function checkDAWDragSupport(): boolean {
  try {
    const dataTransfer = new DataTransfer();
    const blob = new Blob(["test"], { type: "text/plain" });
    const file = new File([blob], "test.txt", { type: "text/plain" });
    dataTransfer.items.add(file);
    return dataTransfer.files.length > 0;
  } catch (e) {
    return false;
  }
}
