
# MOVIOLA & EXPANDED DARKROOM v5.0

## Visión General
Este módulo consolida dos funciones críticas del sistema Voces de Guerrero:
1.  **Expanded Darkroom:** Un editor visual avanzado para "revelar" imágenes con control total sobre lentes, iluminación y composición.
2.  **Moviola Engine:** Un motor de guionización técnica que traduce narrativa e imagen a instrucciones JSON precisas para plataformas de video generativo (Veo, Sora, Wan). **No genera video MP4 directamente.**

---

## 1. Expanded Darkroom (Revelado)

### Tira de Prueba (Session History)
*   **Funcionalidad:** Mantiene un registro temporal de los intentos de revelado durante la sesión actual.
*   **UX:** Barra horizontal ubicada bajo los botones principales.
*   **Acción:** Al hacer clic en una miniatura, se restauran todos los settings (Lente, Ratio, Estilo) utilizados para esa imagen, permitiendo iterar rápidamente sobre configuraciones exitosas.

### Controles Avanzados
*   **Formatos:** 10 Ratios soportados, incluyendo formatos de nicho (21:9 Cine, 4:5 Social).
*   **Estilos:** Agrupados semánticamente en "Realismo" y "Arte". Incluye soporte para estilos específicos como "Watercolor" y "Hyperreal".
*   **Watermark:** Se gestiona estrictamente como **metadato** e instrucción textual en el prompt (`[COMPOSITION]: Leave space...`). No realiza composición rasterizada en el cliente.
*   **Fidelidad:** Sistema de bloqueo (Lock A/B/C) para controlar cuánto se respeta la imagen de referencia.

---

## 2. Moviola Engine (Guionización)

Moviola no es un editor de video. Es un **arquitecto de prompts**. Su salida es un objeto JSON (`EditScriptMaster`) que orquesta la generación de video en sistemas externos.

### Estructura del Guion (JSON)

```json
{
  "meta": {
    "traceId": "uuid...",
    "formatRatio": "16:9",
    "totalDurationSec": 10
  },
  "timeline": [
    {
      "id": "clip_1",
      "timecode": { "in": "00:00", "out": "00:05", "durationSec": 5 },
      "visuals": {
        "shotType": "Wide Establishing Shot",
        "description": "El mercado despierta con la niebla..."
      },
      "genPromptBase": "Action: El mercado... Visuals: Shot on 35mm... Intent: Cinematic..."
    },
    {
      "id": "clip_2",
      "timecode": { "in": "00:05", "out": "00:10", "durationSec": 5 },
      "visuals": { "shotType": "Close Up", "description": "Manos cortando rábano..." },
      "genPromptBase": "Action: Manos..."
    }
  ],
  "enginePackets": [
    {
      "engine": "Veo",
      "status": "READY",
      "optimizedPrompts": [
        { "clipId": "clip_1", "prompt": "Action: El mercado... , cinematic camera movement, HDR..." }
      ]
    }
  ]
}
```

### Prompt Engineering Determinista
Moviola traduce los parámetros visuales (Lente 35mm, Iluminación Neón) a **sufijos de texto plano** optimizados para cada motor. 
*   **Veo:** Se añaden tokens como `cinematic camera movement`, `coherent scene`.
*   **Sora:** Se enfoca en `physics-consistent`, `material behavior`.
*   **Wan:** Se prioriza `movement-forward`, `strong contrast`.

No se inventan parámetros de API ficticios (como `seed` o `fps` si la API no los expone en el prompt). Todo control es lingüístico.
