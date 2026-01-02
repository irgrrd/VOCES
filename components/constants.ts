
import { NarrativeTone, PredefinedVoice, DriftRule, SystemAssetsV4, CulturalLocation, CulturalElement, Theme, NarrativePreset, ImageAnalysis } from './types';

// V4 STANDARD INSTRUCTION (Efficient)
export const SYSTEM_INSTRUCTION = `
Eres "Voces de Guerrero – Motor Narrativo Visual v4.0.0", un sistema experto en generar narrativas arraigadas en la cultura de Guerrero, México.

DIRECTIVAS EDITORIALES Y REGLAS INMUTABLES:
1. Idioma: Español mexicano estricto (prohibidos modismos de España). Usa jerga local de Guerrero con naturalidad.
2. Realismo físico absoluto: Sin magia literal.
3. Contexto Obligatorio: Guerrero.
4. Elementos Clave: Mercados, lluvia tropical, milpa, desigualdad, esperanza, violencia latente o explícita (según tono), transporte público.
`;

// V3 LEGACY INSTRUCTION (Rich, Historical - Restored)
export const SYSTEM_INSTRUCTION_LEGACY = `
ACTÚA COMO: "Voces de Guerrero", un cronista omnisciente profundamente arraigado en la tierra y la sangre de Guerrero, México.
TU OBJETIVO: Tejer una narrativa inmersiva, sensorial y culturalmente densa basada en un análisis visual y parámetros específicos.

TONO Y ESTILO:
- Tu voz cambia según el "Voice Style" seleccionado, pero siempre mantiene la identidad guerrerense.
- No eres un turista. Eres local. Conoces el olor de la tierra mojada en la sierra, el calor seco de Tierra Caliente y el caos de los mercados.
- Usa lenguaje sensorial: describe olores, texturas, temperaturas.

REGLAS DE ORO:
1. REALISMO MÁGICO CONTENIDO: La magia está en la percepción, no en los hechos físicos.
2. NO CLICHÉS TURÍSTICOS: Evita descripciones de folleto de viajes. Busca la verdad cruda.
3. ESTRUCTURA: Inicio in media res (en la acción), desarrollo emocional, conclusión abierta o reflexiva.
`;

// --- MODEL DEFINITIONS ---

export const FREE_TEXT_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Estándar)', desc: 'Equilibrio ideal entre velocidad y coherencia. Recomendado para uso general.' },
];

export const PREMIUM_TEXT_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Calidad Ultra)', desc: 'Razonamiento complejo y máxima densidad literaria.' },
];

export const VISION_MODELS = [
  { id: 'gemini-2.5-flash-image', name: 'Flash Image', desc: 'Análisis y generación visual rápida.' },
];

export const LOCK_TEMPLATES = {
  LOCK_A: `### SYSTEM INSTRUCTION: HIGH FIDELITY RECONSTRUCTION (LOCK A)\nROLE: Forensic Digital Artist.\nINPUTS: REFERENCE_IMG, CONTEXT.\nSTRICT PRESERVATION: BIOMETRICS, DERMATOLOGY.`,
  LOCK_B: `### SYSTEM INSTRUCTION: NARRATIVE INTEGRATION (LOCK B)\nROLE: Cinematographer.\nINPUTS: REFERENCE_IMG, ACTION.\nPRESERVATION: IDENTITY, RELIGHTING.`,
  LOCK_C: `### SYSTEM INSTRUCTION: ATMOSPHERIC CONCEPT ART (LOCK C)\nROLE: Visual Storyteller.\nINPUTS: MOOD, CONTEXT.\nPRIORITIES: COMPOSITION, SCALE.`
};

export const IDENTITY_DRIFT_RULES: DriftRule[] = [
  { id: 1, trigger: "Cuerpo completo / Wide shot", cause: "Baja densidad de píxeles", recommendedLock: "LOCK_C", promptMod: "Cowboy shot", framingMod: "Zoom in" },
  { id: 2, trigger: "Gritando / Boca abierta", cause: "Distorsión geométrica", recommendedLock: "LOCK_B", promptMod: "Intense expression", framingMod: "Avoid jaw deformation" },
  { id: 3, trigger: "Silueta / Contraluz", cause: "Pérdida de contraste", recommendedLock: "LOCK_C", promptMod: "Rim lighting", framingMod: "Focus on shape" },
];

export const TONE_OPTIONS = Object.values(NarrativeTone);
export const VOICE_PRESETS = Object.values(PredefinedVoice);

export const VOICE_MAPPING = {
  fenrir: 'Fenrir', kore: 'Kore', neutral: 'Zephyr', puck: 'Puck', 
  charon: 'Charon', resiliencia: 'Kore', testimonio: 'Charon', aoede: 'Aoede'
};

// Mantenemos este template por si se necesita en el futuro, pero no se usa activamente.
export const VISUAL_PROMPT_TEMPLATE = (
  prompt: string,
  hasReference: boolean,
  hasBackground: boolean
): string => {
  let finalPrompt = `Create a visually compelling, cinematic, and emotionally resonant image based on the following scene: "${prompt}".`;
  if (hasReference) {
    finalPrompt += ` The main subject's face and identity MUST be preserved from the reference image provided. Adapt their expression and lighting to fit the scene.`;
  }
  if (hasBackground) {
    finalPrompt += ` Place the subject within the provided background image, integrating them naturally.`;
  }
  finalPrompt += ` Style: digital painting, dramatic lighting, high detail, masterpiece.`;
  return finalPrompt;
};


// --- V4 DEFAULT ASSETS GENERATION ---

const now = Date.now();

const createLoc = (id: string, label: string, region: string = 'General'): CulturalLocation => ({
  id, label, region, source: 'default', createdAt: now, updatedAt: now
});

const createElem = (id: string, label: string, category: CulturalElement['category'] = 'otro'): CulturalElement => ({
  id, label, category, source: 'default', createdAt: now, updatedAt: now
});

const createTheme = (id: string, label: string): Theme => ({
  id, label, source: 'default', createdAt: now, updatedAt: now
});

export const DEFAULT_LOCATIONS: CulturalLocation[] = [
  createLoc('chilpancingo', 'Chilpancingo', 'Centro'),
  createLoc('acapulco', 'Acapulco', 'Costa'),
  createLoc('iguala', 'Iguala', 'Norte'),
  createLoc('taxco', 'Taxco', 'Norte'),
  createLoc('zihuatanejo', 'Zihuatanejo', 'Costa Grande'),
  createLoc('tlapa', 'Tlapa de Comonfort', 'Montaña'),
  createLoc('tierra-caliente', 'Tierra Caliente', 'Tierra Caliente'),
  createLoc('sierra-madre', 'Sierra Madre del Sur', 'Sierra')
];

export const DEFAULT_ELEMENTS: CulturalElement[] = [
  createElem('mercado-local', 'Mercado local', 'lugar'),
  createElem('lluvia-sierra', 'Lluvia en la Sierra', 'lugar'),
  createElem('pozole', 'Jueves de Pozole', 'comida'),
  createElem('mezcal', 'Mezcal artesanal', 'comida'),
  createElem('transporte-combi', 'Combis (Transporte)', 'objeto'),
  createElem('fiesta-patronal', 'Fiesta Patronal', 'fiesta'),
  createElem('tlacololeros', 'Danza de los Tlacololeros', 'danza'),
  createElem('plata-taxco', 'Plata de Taxco', 'oficio'),
  createElem('chilate', 'Chilate bien frío', 'comida'),
  createElem('tigrada', 'La Tigrada', 'fiesta'),
  createElem('milpa', 'Sembradíos de Milpa', 'lugar'),
  createElem('musica-viento', 'Música de Viento (Chile Frito)', 'musica')
];

export const DEFAULT_THEMES: Theme[] = [
  createTheme('vida-cotidiana', 'Vida Cotidiana y Resiliencia'),
  createTheme('misticismo', 'Misticismo y Leyendas'),
  createTheme('esperanza', 'Inseguridad y Esperanza'),
  createTheme('fiesta', 'Fiesta y Tradición'),
  createTheme('soledad-sierra', 'Soledad en la Sierra'),
  createTheme('amor-dificil', 'Amor en tiempos difíciles')
];

const DEFAULT_PRESETS: NarrativePreset[] = [
  {
    id: 'cronica-mercado',
    label: 'Crónica de Mercado',
    description: 'Caos, olores y vida en el corazón del comercio.',
    defaults: {
      voiceStyle: PredefinedVoice.COTORREO,
      locationId: 'chilpancingo',
      selectedThemeId: 'vida-cotidiana',
      culturalElementIds: ['mercado-local', 'comida'],
      audioVoice: 'puck'
    },
    source: 'default', createdAt: now, updatedAt: now
  },
  {
    id: 'leyenda-urbana',
    label: 'Leyenda Urbana',
    description: 'Misterio en las calles modernas con ecos del pasado.',
    defaults: {
      voiceStyle: PredefinedVoice.CINE_GUERRERO,
      locationId: 'iguala',
      selectedThemeId: 'misticismo',
      culturalElementIds: ['noche', 'callejones'],
      audioVoice: 'fenrir'
    },
    source: 'default', createdAt: now, updatedAt: now
  },
  {
    id: 'retrato-costeno',
    label: 'Postales de Costa',
    description: 'Brisa del mar, turismo y nostalgia.',
    defaults: {
      voiceStyle: PredefinedVoice.RESILIENCIA,
      locationId: 'acapulco',
      selectedThemeId: 'amor-dificil',
      culturalElementIds: ['chilate', 'playa'],
      audioVoice: 'kore'
    },
    source: 'default', createdAt: now, updatedAt: now
  },
  {
    id: 'fiesta-pueblo',
    label: 'Fiesta del Pueblo',
    description: 'Música de viento, danza y comunidad.',
    defaults: {
      voiceStyle: PredefinedVoice.FOCUS_GUERRERO,
      locationId: 'tlapa',
      selectedThemeId: 'fiesta',
      culturalElementIds: ['musica-viento', 'fiesta-patronal'],
      audioVoice: 'neutral'
    },
    source: 'default', createdAt: now, updatedAt: now
  },
  {
    id: 'rutas-sierra',
    label: 'Rutas de la Sierra',
    description: 'Caminos difíciles, naturaleza imponente y soledad.',
    defaults: {
      voiceStyle: PredefinedVoice.TESTIMONIO,
      locationId: 'sierra-madre',
      selectedThemeId: 'soledad-sierra',
      culturalElementIds: ['lluvia-sierra', 'transporte-combi'],
      audioVoice: 'charon'
    },
    source: 'default', createdAt: now, updatedAt: now
  }
];

export const DEFAULT_ASSETS_V4: SystemAssetsV4 = {
  version: '4',
  locations: DEFAULT_LOCATIONS,
  culturalElements: DEFAULT_ELEMENTS,
  themes: DEFAULT_THEMES,
  presets: DEFAULT_PRESETS,
  updatedAt: now
};