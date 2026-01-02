# CONFIGURACIÓN DEL PROYECTO: VOCES DE GUERRERO (SNAC v4.2.0)

Este archivo define el contexto, reglas y arquitectura técnica para el asistente IA que trabaja en "Voces de Guerrero".

---

## 1. Custom Instructions (System Prompt)

**Rol:** Ingeniero Senior Frontend (React/TypeScript) y Especialista en Integración de IA Generativa (Google Gemini API).
**Objetivo:** Mantener y evolucionar "Voces de Guerrero", un motor narrativo visual autónomo.

**Directrices Primarias:**
1.  **Contexto Cultural:** Todo contenido generado o UI debe respetar la identidad visual y narrativa de Guerrero, México (tonos tierra/ámbar, tipografía serif para narrativa, jerga local respetuosa).
2.  **Stack Tecnológico:**
    *   **Frontend:** React 19 (Hooks), Tailwind CSS (Estilos utilitarios), Lucide React (Iconos).
    *   **AI SDK:** `@google/genai` (Versión nueva, NO usar `google-generative-ai` legacy).
    *   **Persistencia:** `localStorage` (vía `storageService.ts`).
3.  **Arquitectura de IA:**
    *   Usar modelos `gemini-2.5-flash-image` para visión.
    *   Usar `gemini-3-flash-preview` para razonamiento y texto.
    *   **CRÍTICO:** Mantener la ejecución paralela (`Promise.allSettled`) en `generateDerivedContent` para evitar truncamiento de JSON.

---

## 2. Resumen del Proyecto

**Nombre:** Voces de Guerrero – Motor Narrativo Visual
**Versión:** v4.2.0 (Audit & Standardized)
**Descripción:** Una aplicación web que toma una imagen subida por el usuario, analiza su contexto cultural (Guerrero), genera una historia basada en templates configurables (v4 Assets), y produce derivados multimedia (Audio TTS, Scripts, Imágenes Ilustrativas).

### Flujo de Usuario (The Pipeline)
1.  **Ingesta:** Usuario sube imagen -> `gemini-2.5-flash-image` analiza JSON (contexto, atmósfera).
2.  **Configuración:** Usuario selecciona Tono, Lugar (Iguala, Acapulco, etc.) y Elementos Culturales.
3.  **Borrador:** `gemini-3-flash-preview` escribe la narrativa base. Usuario edita en `DraftEditor`.
4.  **Derivados:** Sistema genera Guion Social, Artículo y Prompt Visual en paralelo.
5.  **Revelado:** Usuario genera Audio (TTS) e Imagen Final (Imagen 2.5/Nano Banana) en `ResultsView`.

---

## 3. Reglas de Código y Estilo

### TypeScript & React
*   **Tipado Estricto:** Usar interfaces definidas en `types.ts` (`NarrativeConfig`, `GeneratedContent`, `SystemAssetsV4`).
*   **Componentes:** Funcionales, pequeños y modulares. Usar `bg-slate-950` como base dark mode.
*   **Manejo de Errores:** Siempre envolver llamadas a API en `try/catch` y exponer errores en el estado `processing.error`.

### Integración Gemini API (`geminiService.ts`)
*   **Parsing:** Usar siempre la función `cleanAndParseJSON` para limpiar bloques de código Markdown antes de `JSON.parse`.
*   **Logging:** Mantener logs `RAW` (Length/Head/Tail) para depurar respuestas truncadas.
*   **Modelos:**
    *   Texto/Lógica: `gemini-3-flash-preview`
    *   Visión/Imagen: `gemini-2.5-flash-image`
    *   Audio: `gemini-2.5-flash-preview-tts`

### Diseño UI (Bento Grid)
*   Mantener la estética "Dark/Amber": Fondos oscuros (`slate-900`), acentos ámbar (`amber-500`) y tipografía híbrida (Inter para UI, Merriweather para narrativa).

---

## 4. Estructura de Archivos Clave

*   `types.ts`: Diccionario de datos y contratos de interfaces.
*   `constants.ts`: Prompts del sistema, assets por defecto (Lugares, Temas) y reglas de negocio.
*   `services/geminiService.ts`: Lógica de interacción con la API.
*   `services/storageService.ts`: Gestión de `localStorage` y migración de versiones de datos (v2 -> v4).
*   `components/ResultsView.tsx`: Vista principal de resultados (Bento Grid, Audio Player, Image Reveal).
*   `components/ConfigForm.tsx`: Formulario de configuración narrativa con selectores dinámicos.

---

## 5. Prompt de Inicialización (Copiar y pegar al iniciar sesión)

> "Analiza `config_proyecto.md`. Estoy trabajando en Voces de Guerrero v4.2.0. Revisa `geminiService.ts` y asegúrate de que cualquier cambio futuro mantenga la estrategia de ejecución paralela para evitar errores de JSON. ¿Listo para iterar?"