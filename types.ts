
/**
 * DICCIONARIO DE DATOS - VOCES DE GUERRERO
 * Definiciones de tipos para el sistema SNAC v4.0.0
 */

export type AppMode = 'FREE' | 'PREMIUM';

export type VoiceOption = 'fenrir' | 'kore' | 'neutral' | 'puck' | 'charon' | 'resiliencia' | 'testimonio' | 'aoede';

export enum NarrativeTone {
  SUSPENSE = 'Suspense',
  SOCIAL = 'Social',
  PSICOLOGICO = 'Psicológico',
  ROMANCE = 'Romance',
  DOCUMENTAL = 'Documental',
  SATIRA = 'Sátira Picante'
}

export type LockLevel = 'LOCK_A' | 'LOCK_B' | 'LOCK_C';

export interface DriftRule {
  id: number;
  trigger: string;
  cause: string;
  recommendedLock: LockLevel;
  promptMod: string;
  framingMod: string;
}

export enum PredefinedVoice {
  FOCUS_GUERRERO = 'Voz Focus Guerrero',
  COTORREO = 'Voz El Cotorreo',
  RESILIENCIA = 'Voz Resiliencia',
  TESTIMONIO = 'Voz Testimonio',
  CINE_GUERRERO = 'Voz Cine Guerrero'
}

// --- PIPELINE V4.3 CONTROL ---
export enum PipelineStep {
  WELCOME = 0, // Nuevo paso inicial de seguridad
  ANALYSIS = 1,
  CONFIG = 2,
  DRAFT = 3,
  DERIVED = 4, // Estado transicional (Generando assets)
  MEDIA = 5
}

export interface PipelineState {
  step: PipelineStep;
  analysisStatus: 'idle' | 'loading' | 'done' | 'error';
  draftStatus: 'idle' | 'loading' | 'done' | 'error';
  derivedStatus: 'idle' | 'loading' | 'done' | 'error'; // Controla Script/Article/Prompt
  finalNarrativeApproved: boolean;
  error: string | null;
}

// --- SCHEMA V4: ENTIDADES NORMALIZADAS ---

export interface BaseAssetV4 {
  id: string; // Slug estable (ej. 'mercado-central')
  label: string; // Texto visible (ej. 'Mercado Central')
  tags?: string[];
  source: 'default' | 'user' | 'import';
  createdAt: number;
  updatedAt: number;
  hidden?: boolean; // Soft delete
}

export interface CulturalLocation extends BaseAssetV4 {
  municipality?: string;
  region?: string;
}

export interface CulturalElement extends BaseAssetV4 {
  category?: 'comida' | 'danza' | 'fiesta' | 'objeto' | 'lugar' | 'leyenda' | 'musica' | 'oficio' | 'otro';
}

export interface Theme extends BaseAssetV4 {
  // Propiedades futuras
}

export interface NarrativePreset {
  id: string;
  label: string;
  description?: string;
  defaults: {
    voiceStyle?: string;
    audioVoice?: VoiceOption;
    protagonists?: string;
    locationId?: string; // Link a CulturalLocation.id
    selectedThemeId?: string; // Link a Theme.id
    culturalElementIds?: string[]; // Links a CulturalElement.id
    duration?: '30s' | '90s';
  };
  source: 'default' | 'user';
  createdAt: number;
  updatedAt: number;
}

export interface SystemAssetsV4 {
  version: '4';
  locations: CulturalLocation[];
  culturalElements: CulturalElement[];
  themes: Theme[];
  presets: NarrativePreset[];
  updatedAt: number;
}

/**
 * VISTA LEGACY (Compatibilidad UI v3.x)
 * Mantiene la estructura plana para componentes UI antiguos.
 */
export interface SystemAssets {
  locations: string[];
  culturalElements: string[];
  themes: string[];
}

// --- CORE TYPES ---

export interface ImageAnalysis {
  context: string;
  people: {
    personA?: string;
    personB?: string;
    personC?: string;
  };
  atmosphere: string;
  lighting: string;
  palette: string[];
  artisanPatterns?: string[];
}

export type NarrativeDepth = 'standard' | 'deep_legacy';

export interface NarrativeConfig {
  presetId?: string; // Nuevo campo opcional V4
  voiceStyle: PredefinedVoice | string;
  protagonists: string;
  location: string;
  selectedTheme: string;
  duration: '30s' | '90s' | 'both';
  culturalElements: string[];
  formats: ('script' | 'article' | 'prompt')[];
  audioVoice: VoiceOption;
  
  // Coexistence & Control Features (New)
  narrativeDepth: NarrativeDepth; // Controla si usamos prompts históricos o nuevos
  textModel: string; // ID del modelo de texto a usar (ej. 'gemini-3-flash-preview')
  visionModel: string; // ID del modelo de visión a usar (ej. 'gemini-2.5-flash-image')
  
  // Feature V4.3: Grounding
  useGrounding: boolean; // Si es true, usa Google Search para verificar datos en el artículo

  // Structured Character Data (V4.3)
  protagonistObject?: {
    name: string;
    role: 'protagonist' | 'antagonist' | 'observer' | 'victim' | 'hero';
    description?: string;
  };
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface GeneratedContent {
  narrativeText: string; 
  socialScript?: string;
  article?: string;
  visualPrompt?: string;
  generatedImage?: string;
  generatedVideo?: string; // URL del video generado por Veo
  groundingSources?: GroundingSource[]; // Fuentes de Google Search si se usó grounding
}

export interface ProcessingState {
  isAnalyzing: boolean;
  isGeneratingText: boolean;
  isGeneratingAudio: boolean;
  error: string | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  analysis: ImageAnalysis;
  config: NarrativeConfig;
  content: GeneratedContent;
}
