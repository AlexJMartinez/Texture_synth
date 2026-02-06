/****
 * Voice chat client utilities for Replit AI Integrations.
 * 
 * Usage:
 * 1. Copy audio-playback-worklet.js to your app's public folder (e.g. client/public/audio-playback-worklet.js)
 * 2. Import and use the React hooks in your components
 * 
 * Example:
 * ```tsx
 * import { useVoiceRecorder, useVoiceStream } from "./replit_integrations/audio";
 * 
 * function VoiceChat() {
 *   const [transcript, setTranscript] = useState("");
 *   const recorder = useVoiceRecorder();
 *   const stream = useVoiceStream({
 *     onTranscript: (_, full) => setTranscript(full),
 *     onComplete: (text) => console.log("Done:", text),
 *   });
 * 
 *   const handleClick = async () => {
 *     if (recorder.state === "recording") {
 *       const blob = await recorder.stopRecording();
 *       await stream.streamVoiceResponse("/api/voice-conversations/1/messages", blob);
 *     } else {
 *       await recorder.startRecording();
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleClick}>
 *         {recorder.state === "recording" ? "Stop" : "Record"}
 *       </button>
 *       <p>{transcript}</p>
 *     </div>
 *   );
 * }
 * ```
 */

// Default public URL for the audio playback worklet module.
// Ensure the file is served by your dev/prod server (e.g. placed under client/public).
export const AUDIO_PLAYBACK_WORKLET_PATH = "/audio-playback-worklet.js";

export { decodePCM16ToFloat32, createAudioPlaybackContext } from "./audio-utils";
export { useVoiceRecorder, type RecordingState } from "./useVoiceRecorder";
export { useAudioPlayback, type PlaybackState } from "./useAudioPlayback";
export { useVoiceStream } from "./useVoiceStream";
