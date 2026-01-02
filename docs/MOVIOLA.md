
# MOVIOLA: Motor de Guionización Técnica
**Versión:** 1.0 (Integrada en Voces de Guerrero v4.3)

## 1. Definición y Propósito
**MOVIOLA** no es un generador de video. Es un **orquestador de instrucciones** que traduce decisiones creativas (narrativa, revelado de imagen, cultura) en un **Edit Script Master** (JSON). 

Este script sirve como fuente de verdad inmutable para alimentar motores de video generativo externos (Google Veo, OpenAI Sora, Wanx, etc.), asegurando coherencia visual y narrativa sin "alucinaciones" de API.

## 2. Flujo de Datos

1.  **Input (MoviolaInput):** Se captura el estado del "Cuarto de Revelado" + Narrativa.
2.  **Hashing:** Se genera un SHA-256 del input canonicalizado para asegurar trazabilidad.
3.  **Compilación:** Se segmenta la narrativa en clips de 3-6 segundos.
4.  **Prompt Engineering:** Se construye un prompt técnico en inglés para cada clip, inyectando datos de lentes, iluminación y estilo sin usar flags propietarios.
5.  **Output (EditScriptMaster):** JSON final listo para consumo.

## 3. Diccionario de Datos

### MoviolaInput (Entrada)
| Campo | Origen | Descripción |
| :--- | :--- | :--- |
| `traceId` | Sistema | UUID determinista de la sesión. |
| `analysisContext` | IA (Visión) | Descripción de la escena original. |
| `revealSettings` | Usuario (UI) | Ajustes de cámara (Lente, Ratio, Estilo). |
| `compiledVisualPrompt`| Sistema | Prompt usado para la imagen base. |

### EditScriptMaster (Salida)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `meta.inputSnapshotHash`| String | Hash de integridad. Si el input cambia, el hash cambia. |
| `timeline` | Array | Lista secuencial de clips. |
| `timeline[].genPromptBase`| String | Prompt "vanilla" en inglés técnico. |
| `enginePackets` | Array | Instrucciones optimizadas por motor (Veo, Sora, etc). |

## 4. Ejemplo de Salida (JSON Snippet)

```json
{
  "meta": {
    "traceId": "trace_1740000000_abc12",
    "inputSnapshotHash": "a1b2c3d4...",
    "formatRatio": "16:9",
    "totalDurationSec": 5
  },
  "rules": {
    "language": "es-MX",
    "negativesGlobal": "Exclude: watermark, text, logo, deformed..."
  },
  "timeline": [
    {
      "id": "clip_01",
      "timecode": { "in": "00:00", "out": "00:05", "durationSec": 5 },
      "visuals": {
        "shotType": "Wide",
        "cameraMove": "Establish scene",
        "description": "El mercado de Chilpancingo amanece con neblina..."
      },
      "genPromptBase": "Shot on 35mm lens. Analog look. Natural lighting. Cultural context: Mezcal, Mercado. Segment action: Market opening scene. Target aspect ratio: 16:9..."
    }
  ],
  "enginePackets": [
    {
      "engine": "Veo",
      "status": "READY",
      "optimizedPrompts": [
        {
          "clipId": "clip_01",
          "prompt": "Shot on 35mm lens... . Cinematic camera movement, smooth motion, coherent scene, HDR. Exclude: watermark, text..."
        }
      ]
    }
  ]
}
```

## 5. Disclaimer Técnico
Moviola opera bajo el principio de **"Prompt Engineering Puro"**. No interactúa con APIs de video directamente ni garantiza parámetros físicos (fps, seed) fuera del control textual del modelo destino. La calidad del video final depende del motor externo utilizado y su interpretación del prompt generado.
