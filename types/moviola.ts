
/**
 * TIPOS: MOVIOLA ENGINE v5.0 (Expanded Darkroom)
 * Contrato estricto para la generación de guiones técnicos y revelado expandido.
 */

export type FidelityLock = "LOCK_A" | "LOCK_B" | "LOCK_C";

export type AspectRatio = 
  | "1:1" | "16:9" | "9:16" | "4:3" | "3:4" 
  | "21:9" | "4:5" | "2:3" | "3:2" | "5:4";

export type FilmStyle = 
  // REALISMO
  | "raw" | "documentary" | "editorial" | "cinematic" | "studio" | "portrait_skin" | "hyperreal"
  // ARTE
  | "analog" | "cyber" | "oil" | "sketch" | "watercolor";

export type UsageTemplate = 
  | "none" | "news" | "social_organic" | "poster" | "thumbnail" 
  | "catalog" | "archive" | "cinema";

export type WatermarkPosition = "top_left" | "top_right" | "bottom_left" | "bottom_right" | "center";

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  position: WatermarkPosition;
  opacity: number;
}

export interface RevealSettingsSnapshot {
  aspectRatio: AspectRatio;
  fidelity: FidelityLock;
  lens: string;
  lighting: string;
  filmStyle: FilmStyle;
  templatePreset: UsageTemplate;
  referenceWeight: number;
  negativePrompt: string;
  watermark: WatermarkConfig;
  manualOverride?: string;
}

export interface MoviolaInput {
  traceId: string;
  createdAt: number;
  analysisContext: string;
  narrativeText: string;
  culturalElements: string[];
  compiledVisualPrompt: string; // El prompt final en Inglés
  revealSettings: RevealSettingsSnapshot;
  moviola: {
    engine: string;
    durationSec: number;
    intent: string;
  };
}

export interface Timecode { in: string; out: string; durationSec: number; }

export interface TimelineClip {
  id: string;
  timecode: Timecode;
  visuals: { 
    shotType: string; 
    cameraMove: string; 
    description: string; 
    focus?: string; 
  };
  audio: { 
    voiceover?: string; 
    sfx?: string; 
    music?: string; 
  };
  genPromptBase: string; // Prompt agnóstico
}

export interface EnginePacket {
  engine: string;
  status: "READY" | "WARNING" | "UNSUPPORTED" | "UNKNOWN";
  optimizedPrompts: Array<{ clipId: string; prompt: string }>;
  compatibilityNotes?: { ratioSupported?: boolean; notes?: string; };
}

export interface EditScriptMaster {
  meta: { 
    traceId: string; 
    inputSnapshotHash: string; 
    createdAt: number; 
    formatRatio: AspectRatio; 
    totalDurationSec: number; 
    intent: string; 
  };
  rules: { 
    language: string; 
    negativesGlobal: string; 
    constraints: string[]; 
  };
  timeline: TimelineClip[];
  enginePackets: EnginePacket[];
}
