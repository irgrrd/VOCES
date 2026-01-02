
import { Type, Schema } from "@google/genai";

/**
 * ESQUEMAS DE VALIDACIÓN JSON PARA MOVIOLA
 * Compatible con Gemini Structured Outputs.
 */

// NOTA: Se definen constantes manuales para evitar dependencia cíclica de tipos en runtime
// si se usara reflection.

export const EditScriptMasterSchema: Schema = {
  type: Type.OBJECT,
  description: "Guion técnico maestro generado por el motor Moviola para orquestación de video generativo.",
  properties: {
    meta: {
      type: Type.OBJECT,
      properties: {
        traceId: { type: Type.STRING, description: "Identificador único de trazabilidad" },
        inputSnapshotHash: { type: Type.STRING, description: "SHA-256 del input canonicalizado" },
        createdAt: { type: Type.INTEGER },
        formatRatio: { type: Type.STRING, enum: ["1:1", "16:9", "9:16", "4:5"] },
        totalDurationSec: { type: Type.NUMBER },
        intent: { type: Type.STRING }
      },
      required: ["traceId", "inputSnapshotHash", "createdAt", "formatRatio", "totalDurationSec", "intent"]
    },
    rules: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING, enum: ["es-MX"] },
        negativesGlobal: { type: Type.STRING, description: "Frase de exclusión global (Exclude: ...)" },
        constraints: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["language", "negativesGlobal", "constraints"]
    },
    timeline: {
      type: Type.ARRAY,
      description: "Secuencia de clips de video.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          timecode: {
            type: Type.OBJECT,
            properties: {
              in: { type: Type.STRING },
              out: { type: Type.STRING },
              durationSec: { type: Type.NUMBER }
            },
            required: ["in", "out", "durationSec"]
          },
          visuals: {
            type: Type.OBJECT,
            properties: {
              shotType: { type: Type.STRING, enum: ["Wide", "Medium", "CloseUp", "Macro"] },
              cameraMove: { type: Type.STRING },
              description: { type: Type.STRING },
              focus: { type: Type.STRING }
            },
            required: ["shotType", "cameraMove", "description"]
          },
          audio: {
            type: Type.OBJECT,
            properties: {
              voiceover: { type: Type.STRING },
              sfx: { type: Type.STRING },
              music: { type: Type.STRING }
            }
          },
          genPromptBase: { type: Type.STRING, description: "Prompt técnico base en Inglés" }
        },
        required: ["id", "timecode", "visuals", "genPromptBase"]
      }
    },
    enginePackets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          engine: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["READY", "WARNING", "UNSUPPORTED", "UNKNOWN"] },
          optimizedPrompts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                clipId: { type: Type.STRING },
                prompt: { type: Type.STRING }
              },
              required: ["clipId", "prompt"]
            }
          },
          compatibilityNotes: {
            type: Type.OBJECT,
            properties: {
              ratioSupported: { type: Type.BOOLEAN },
              notes: { type: Type.STRING }
            }
          }
        },
        required: ["engine", "status", "optimizedPrompts"]
      }
    }
  },
  required: ["meta", "rules", "timeline", "enginePackets"]
};
