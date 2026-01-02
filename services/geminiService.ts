
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ImageAnalysis, NarrativeConfig, GeneratedContent, LockLevel, GroundingSource } from "../types";
import { 
  SYSTEM_INSTRUCTION, 
  SYSTEM_INSTRUCTION_LEGACY, 
  VOICE_MAPPING, 
  VISUAL_PROMPT_TEMPLATE,
  GUERRERO_LOCATIONS,
  VOICE_STYLES
} from "../constants";

// -----------------------------
// Debug helpers (safe for mobile logs)
// -----------------------------
const sliceHead = (s: string, n: number) => (s ? s.slice(0, n) : "");
const sliceTail = (s: string, n: number) => (s ? s.slice(Math.max(0, s.length - n)) : "");

// Helpers
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const cleanAndParseJSON = (text: string): any => {
  if (!text) return null;

  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("🔴 JSON PARSE FAIL LENGTH:", text.length);
    console.error("🔴 JSON PARSE FAIL HEAD:", sliceHead(text, 200));
    console.error("🔴 JSON PARSE FAIL TAIL:", sliceTail(text, 200));
    console.error("🔴 JSON PARSE ERROR:", error);
    // Fallback: If it's not JSON, maybe return the text itself if permitted
    throw new Error("Formato JSON inválido o incompleto generado por el modelo.");
  }
};

// -----------------------------
// RETRY & FALLBACK LOGIC
// -----------------------------

const isRateLimitError = (error: any): boolean => {
  const message = error?.message || '';
  return (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
};

const callWithRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 2,
  initialDelay: number = 1500
): Promise<T> => {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error: any) {
      if (isRateLimitError(error) && attempt < retries) {
        const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`⚠️ Rate limit (429). Retrying... (Attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      } else {
        throw error;
      }
    }
  }
  throw new Error("API Quota Exceeded.");
};


/**
 * Stage 1: Analyze Image
 */
export const analyzeImage = async (file: File, visionModel: string): Promise<ImageAnalysis> => {
  const base64Data = await fileToGenerativePart(file);
  const prompt = `
Actúa como un antropólogo visual especializado en la artesanía y textiles de Guerrero, México. Analiza la imagen proporcionada.
Responde ÚNICA y EXCLUSIVAMENTE con un objeto JSON válido, sin usar bloques de código markdown ni texto adicional.

Estructura JSON requerida:
{
  "context": "Descripción general de la escena (máx 30 palabras)",
  "people": { "personA": "descripción breve o null", "personB": "descripción breve o null", "personC": "descripción breve o null" },
  "atmosphere": "El mood emocional (ej. Melancolía tropical, orgullo artesanal)",
  "lighting": "Descripción técnica breve de la iluminación",
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "artisanPatterns": ["Descripción del patrón textil detectado", "Nombre de la técnica artesanal observada", "u otro elemento artesanal relevante"]
}`;

  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: visionModel,
      contents: { parts: [{ inlineData: { mimeType: file.type, data: base64Data } }, { text: prompt }] },
    });
    if (!response.text) throw new Error("No response from Gemini");
    return cleanAndParseJSON(response.text) as ImageAnalysis;
  });
};

/**
 * Stage 2A: Generate Narrative Draft
 * NOW SUPPORTS THINKING MODE for Gemini 3 Pro
 */
export const generateNarrativeDraft = async (
  analysis: ImageAnalysis,
  config: NarrativeConfig
): Promise<{ narrativeText: string }> => {
  let protagonists = config.protagonists;
  if (config.protagonistObject) {
    const { name, role, description } = config.protagonistObject;
    const roleLabel = role === 'protagonist' ? 'protagonista' : role === 'antagonist' ? 'antagonista' : role === 'observer' ? 'observador' : role === 'victim' ? 'víctima' : 'héroe';
    const safeName = name?.trim() || 'Personaje principal';
    const safeDesc = (description || '').trim();
    protagonists = safeDesc ? `${safeName} (${roleLabel}) – ${safeDesc}` : `${safeName} (${roleLabel})`;
  }

  const isDeep = config.narrativeDepth === 'deep_legacy';
  const isThinkingModel = config.textModel === 'gemini-3-pro-preview';
  
  let locationContext = config.location;
  let voiceContext = config.voiceStyle;

  if (isDeep) {
      const locDetails = GUERRERO_LOCATIONS.find(l => l.name === config.location);
      if (locDetails) locationContext = `${locDetails.name}: ${locDetails.details} Atmósfera: ${locDetails.atmosphere}.`;
      
      const voiceDetails = VOICE_STYLES.find(v => v.name === config.voiceStyle);
      if (voiceDetails) voiceContext = `${voiceDetails.name}: ${voiceDetails.description}. ${voiceDetails.usage}.`;
  }

  const prompt = `
Genera EXCLUSIVAMENTE la narrativa principal (la historia) basada en este análisis y configuración.
MODO DE GENERACIÓN: ${isDeep ? 'PROFUNDO (LITERARIO/DENSO)' : 'ESTÁNDAR (ÁGIL/DIRECTO)'}

ANÁLISIS:
${JSON.stringify(analysis)}

CONFIGURACIÓN
- Estilo de Voz: ${voiceContext}
- Protagonistas: ${protagonists}
- Lugar/Escenario: ${locationContext}
- Temática Central: ${config.selectedTheme}
- Elementos Culturales: ${config.culturalElements.join(', ')}

FORMATO DE SALIDA (JSON): { "narrativeText": "La historia completa aquí..." }

Asegúrate de cumplir con: 
1. Español mexicano (Guerrero).
2. Realismo físico.
3. ${isDeep ? 'Usa descripciones sensoriales ricas, metáforas culturales y un tono profundamente arraigado.' : 'Mantén la narrativa clara y directa.'}
`;

  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Configuración condicional para Thinking Mode
    const requestConfig: any = {
        systemInstruction: isDeep ? SYSTEM_INSTRUCTION_LEGACY : SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties: { narrativeText: { type: Type.STRING } } },
    };

    if (isThinkingModel) {
        requestConfig.thinkingConfig = { thinkingBudget: 32768 }; // Max budget for Pro
        // IMPORTANT: Do NOT set maxOutputTokens when using thinkingConfig unless intentional management is done.
        // We leave it unset to allow the model full range.
    }

    const response = await ai.models.generateContent({
      model: config.textModel,
      contents: prompt,
      config: requestConfig,
    });
    
    if (!response.text) throw new Error("No text response");
    return cleanAndParseJSON(response.text) as { narrativeText: string };
  });
};

/**
 * Stage 2B: Generate Derived Content
 * UPDATED: Uses gemini-3-flash-preview specifically for Search Grounding
 */
export const generateDerivedContent = async (
  finalNarrative: string,
  config: NarrativeConfig,
  analysis: ImageAnalysis
): Promise<Partial<GeneratedContent>> => {
  const commonContext = `NARRATIVA APROBADA: "${finalNarrative.substring(0, 5000)}"\nANÁLISIS DE IMAGEN ORIGINAL: ${JSON.stringify(analysis)}`;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Generic generator for Script and Prompt
  const generate = async (task: string, schema: any) => {
    return callWithRetry(async () => {
      const res = await ai.models.generateContent({
        model: config.textModel,
        contents: `${commonContext}\nTAREA: ${task}`,
        config: { systemInstruction: SYSTEM_INSTRUCTION, responseMimeType: "application/json", responseSchema: schema },
      });
      return cleanAndParseJSON(res.text);
    });
  };

  // Specialized generator for Article with optional Grounding
  const generateArticle = async () => {
    return callWithRetry(async () => {
      const task = "Genera un 'article' breve estilo periodístico o blog (título y cuerpo, Máx 400 palabras). Incluye datos verificables si tienes acceso a búsqueda.";
      
      const requestConfig: any = {
          systemInstruction: SYSTEM_INSTRUCTION,
          // Gemini 3 Flash supports responseSchema with Search Tool, but sometimes it's stricter.
          // We will attempt JSON enforcement.
          responseMimeType: "application/json",
          responseSchema: { type: Type.OBJECT, properties: { article: { type: Type.STRING } } }
      };

      if (config.useGrounding) {
          requestConfig.tools = [{ googleSearch: {} }];
      }
      
      // Force use of gemini-3-flash-preview for grounding tasks if not already selected, 
      // as it is optimized for it.
      const modelForSearch = config.useGrounding ? 'gemini-3-flash-preview' : config.textModel;

      const res = await ai.models.generateContent({
        model: modelForSearch,
        contents: `${commonContext}\nTAREA: ${task}`,
        config: requestConfig,
      });

      // Extract text
      const parsed = cleanAndParseJSON(res.text);
      
      // Extract grounding metadata if present
      let groundingSources: GroundingSource[] = [];
      if (res.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          res.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
              if (chunk.web?.uri && chunk.web?.title) {
                  groundingSources.push({
                      title: chunk.web.title,
                      url: chunk.web.uri
                  });
              }
          });
      }

      return {
          article: parsed?.article,
          groundingSources: groundingSources.length > 0 ? groundingSources : undefined
      };
    });
  };

  const [scriptRes, articleRes, promptRes] = await Promise.allSettled([
    config.formats.includes("script") ? generate("Genera un 'socialScript' (guion video vertical, Reels/TikTok) BREVE y viral (Máx 60 seg).", { type: Type.OBJECT, properties: { socialScript: { type: Type.STRING } } }) : Promise.resolve(null),
    config.formats.includes("article") ? generateArticle() : Promise.resolve(null),
    generate("Genera un 'visualPrompt' técnico en INGLÉS (Máx 100 palabras) para esta historia. Incluye parámetros negativos.", { type: Type.OBJECT, properties: { visualPrompt: { type: Type.STRING } } })
  ]);

  return {
    socialScript: scriptRes.status === "fulfilled" ? scriptRes.value?.socialScript : "",
    article: articleRes.status === "fulfilled" ? articleRes.value?.article : "",
    groundingSources: articleRes.status === "fulfilled" ? articleRes.value?.groundingSources : [],
    visualPrompt: promptRes.status === "fulfilled" ? promptRes.value?.visualPrompt : "",
  };
};

/**
 * Stage 3: Generate Audio (TTS)
 */
export const generateSpeech = async (text: string, voiceKey: string): Promise<string> => {
  const voiceName = (VOICE_MAPPING as any)[voiceKey] || "Zephyr";
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
      },
    });
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("Audio generation failed: No audio data returned.");
    return audioData;
  });
};

/**
 * Stage 4: Generate Image
 * REFACTORED to use a simpler, more direct prompt to avoid model confusion.
 */
export const generateIllustrativeImage = async (
  prompt: string,
  referenceImageBase64: string,
  visionModel: string,
  backgroundImageBase64: string | null = null,
  aspectRatio: string = "1:1",
  lockLevel: LockLevel = "LOCK_B" // lockLevel is now unused but kept for type compatibility
): Promise<string> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [];
    
    if (referenceImageBase64) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: referenceImageBase64 } });
    }
    
    if (backgroundImageBase64) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: backgroundImageBase64 } });
    }
    
    const logicPrompt = VISUAL_PROMPT_TEMPLATE(
      prompt,
      !!referenceImageBase64,
      !!backgroundImageBase64
    );
    parts.push({ text: logicPrompt });

    const response = await ai.models.generateContent({
      model: visionModel,
      contents: { parts: parts },
      config: { imageConfig: { aspectRatio: aspectRatio } },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model. The model may have responded with text instead.");
  });
};

/**
 * Stage 5: Generate Video (Veo) - NEW
 * Uses polling logic as required by the Long Running Operation (LRO) nature of Veo.
 */
export const generateVideoFromImage = async (
    imageBase64: string,
    prompt: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'veo-3.1-fast-generate-preview';
    
    console.log("Starting Veo generation...");

    let operation = await ai.models.generateVideos({
        model: model,
        prompt: prompt || "Cinematic movement, slow motion, high quality", // Optional but recommended
        image: {
            imageBytes: imageBase64,
            mimeType: 'image/png',
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9' // Force cinematic for this app
        }
    });

    console.log("Veo Operation started:", operation);

    // Polling loop
    while (!operation.done) {
        console.log("Waiting for Veo...");
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s poll interval
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    if (operation.error) {
        throw new Error(`Veo generation failed: ${operation.error.message}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Veo completed but no video URI returned.");

    // The URI needs the API Key appended to be accessible via fetch/src
    return `${videoUri}&key=${process.env.API_KEY}`;
};


/**
 * Helper: Suggest creative visual prompts
 */
export const generateVisualPromptIdeas = async (
  narrative: string,
  analysis: ImageAnalysis,
  textModel: string
): Promise<string[]> => {
  const prompt = `Como Director de Fotografía, genera 3 propuestas de prompt visual (en INGLÉS) para ilustrar esta narrativa, coherente con el análisis visual.
NARRATIVA: "${narrative.substring(0, 1000)}..."
ANÁLISIS VISUAL: ${JSON.stringify(analysis)}
ENFOQUES: 1. Cinematográfico. 2. Emocional. 3. Simbólico.
REGLA: Cada prompt debe incluir parámetros negativos (ej. "Exclude: ugly, deformed, blurry").
Salida JSON Array de strings.`;

  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    });
    if (!response.text) return [];
    return cleanAndParseJSON(response.text) as string[];
  });
};
