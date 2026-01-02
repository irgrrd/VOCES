// types/moviola.ts

export type FidelityLock = "LOCK_A" | "LOCK_B" | "LOCK_C";

// Expanded ratios (10)
export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3"
  | "3:4"
  | "21:9"
  | "4:5"
  | "2:3"
  | "3:2"
  | "5:4";

// Expanded film styles (realism + art)
export type FilmStyle =
  // Realismo
  | "raw"
  | "documentary"
  | "editorial"
  | "cinematic"
  | "studio"
  | "portrait_skin"
  | "hyperreal"
  | "analog"
  | "cyber"
  // Arte
  | "oil"
  | "sketch";

export type UsageTemplate =
  | "none"
  | "news"
  | "social_organic"
  | "poster"
  | "thumbnail"
  | "catalog"
  | "archive";

export type WatermarkPosition =
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right"
  | "center";

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  position: WatermarkPosition;
  opacity: number; // 0–100 (metadata)
}

export interface MoviolaInput {
  traceId: string;
  createdAt: number;

  // Contexto heredado del pipeline previo
  analysisContext: string;
  narrativeText: string;
  culturalElements: string[];

  // Prompt resultante del Cuarto de Revelado (visual compiler)
  compiledVisualPrompt: string;

  revealSettings: {
    aspectRatio: AspectRatio;
    fidelity: FidelityLock;

    lens: string; // e.g. "24mm" | "35mm" | "85mm" | etc
    lighting: string; // e.g. "natural" | "studio" | "neon" | etc
    filmStyle: FilmStyle;

    templatePreset: UsageTemplate;

    referenceWeight: number; // 0–100 (heurística textual)
    negativePrompt: string;

    watermark: WatermarkConfig;

    // Texto opcional que el usuario fuerza (no validamos semántica)
    manualOverride?: string;
  };

  // Configuración de Moviola (guion)
  moviola: {
    engine: string; // "Veo"|"Sora"|"Wan"|"Grok"|"Otro"
    durationSec: number;
    intent: string;
  };
}

export interface Timecode {
  in: string; // "00:00"
  out: string; // "00:04"
  durationSec: number;
}

export type ShotType = "Wide" | "Medium" | "CloseUp" | "Macro";

export interface TimelineClip {
  id: string;
  timecode: Timecode;

  visuals: {
    shotType: ShotType;
    cameraMove: string;
    description: string;
    focus?: string;
  };

  audio: {
    voiceover?: string;
    sfx?: string;
    music?: string;
  };

  // Prompt base (EN) para este clip
  genPromptBase: string;
}

export type EngineStatus = "READY" | "WARNING" | "UNSUPPORTED" | "UNKNOWN";

export interface EnginePacket {
  engine: string;
  status: EngineStatus;
  optimizedPrompts: Array<{ clipId: string; prompt: string }>;
  compatibilityNotes?: {
    ratioSupported?: boolean;
    notes?: string;
  };
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
    language: "es-MX";
    negativesGlobal: string; // texto
    constraints: string[]; // lista de reglas/avisos
  };

  timeline: TimelineClip[];
  enginePackets: EnginePacket[];
}
