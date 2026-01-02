# MANIFIESTO DEL SISTEMA: SNAC
**VERSIÓN ACTUAL:** v4.2.0 (Audit & Standardized)
**BASELINE ANTERIOR:** v4.1.0
**VERSIÓN FUNDACIONAL / LEGACY:** v3.2.1

---

## 1. PROPÓSITO Y EVOLUCIÓN
El sistema opera bajo la designación técnica **SNAC v4.2.0**, consolidando las mejoras de estabilidad de la v4.1.0 y estandarizando el uso de la SDK `@google/genai` en todo el pipeline.
Este documento certifica el estado operativo actual (Golden State).

### 1.1 Principios Operativos
1.  **Arraigo Cultural [IMPLEMENTADO]:** Inyección de ontología específica (Guerrero) validada mediante `AssetManagerModal` y `storageService`.
2.  **Agencia del Usuario [IMPLEMENTADO]:** Flujo de revisión obligatoria en `DraftEditor`.
3.  **Privacidad por Diseño [IMPLEMENTADO]:** Ejecución "Client-side" directa a API Gemini.
4.  **Autonomía Total [FRÁGIL]:** Dependencia crítica de la API Gemini.

---

## 2. ARQUITECTURA OBSERVADA [VERIFICADO]

### 2.1 Flujo de Ejecución (v4.2.0)
El sistema implementa 5 etapas, con una actualización crítica en la etapa 4:
1.  **Ingesta [IMPLEMENTADO]:** Análisis visual (`gemini-2.5-flash-image`).
2.  **Configuración [IMPLEMENTADO]:** Contexto cultural dinámico (`NarrativeConfig`).
3.  **Borrador [IMPLEMENTADO]:** Generación de texto base (`gemini-3-flash-preview`).
4.  **Derivados [ESTABILIZADO]:**
    *   **Arquitectura Paralela:** Se sustituye la llamada monolítica por 3 micro-transacciones paralelas (`Promise.allSettled`).
    *   **Beneficio:** Elimina el riesgo de "JSON Truncation" y asegura que un error en el Artículo no bloquee el Guion o el Prompt.
5.  **Síntesis [IMPLEMENTADO]:** Audio (TTS Gemini) e Imagen (Imagen 2.5) bajo demanda.

### 2.2 Gestión de Datos
**[IMPLEMENTADO]** Ontología local persistente en `localStorage`.
-   Entidades: `locations`, `culturalElements`, `themes`.

---

## 3. CONTRATOS TÉCNICOS INMUTABLES

### 3.1 Configuración Narrativa (`NarrativeConfig`)
Definida en `types.ts`.
-   **Campos Activos:** `voiceStyle`, `protagonists`, `location`, `selectedTheme`, `culturalElements`, `audioVoice`.
-   **Campos Ocultos:** `duration` (Hardcoded a '30s').

### 3.2 Contenido Generado (`GeneratedContent`)
Gestionado en `geminiService.ts`.
-   **Estado:** **Estabilizado (v4.2.0)**.
-   El sistema ahora soporta fallos parciales (ej. se genera Guion y Prompt, pero falla Artículo) sin colapsar el flujo de la aplicación.

---

## 4. LIMITACIONES REALES REGISTRADAS

1.  **Modo Premium (MOCK UI):** La interfaz `showPremiumModal` es puramente visual, aunque funcionalmente conecta con la API Key Selection de AI Studio.
2.  **Gestión de Credenciales:** El sistema depende de `process.env.API_KEY` o inyección dinámica.
3.  **Latencia Variable:** La ejecución paralela puede consumir más cuota de solicitudes por minuto (RPM).

---

## 5. ESTADO DE CONGELAMIENTO

**ESTADO:** ACTIVO (v4.2.0)
La baseline v4.1.0 ha sido auditada y validada.

*Documento actualizado según auditoría v4.2.0.*