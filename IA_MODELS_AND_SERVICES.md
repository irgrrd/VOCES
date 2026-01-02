# ARQUITECTURA DE IA Y ROADMAP DE SERVICIOS
**SISTEMA:** Voces de Guerrero (SNAC)
**VERSIÓN:** v4.1.0+
**PROPÓSITO:** Documentar el stack de IA actual y explorar la integración de servicios avanzados de Google para futuras versiones.

---

## 1. Stack de IA Actual (Implementación Verificada)

La arquitectura actual (v4.1.0) utiliza un conjunto de modelos de Gemini optimizados para velocidad, costo y calidad en tareas específicas, formando un pipeline robusto y eficiente.

| Etapa del Pipeline | Modelo Utilizado | Rol y Justificación |
| :--- | :--- | :--- |
| **1. Análisis Visual** | `gemini-2.5-flash-image` | **Análisis de Imagen:** Procesa la imagen subida para extraer contexto, atmósfera y paleta de colores en formato JSON. Su velocidad y capacidad multimodal son ideales para esta tarea inicial. |
| **2. Redacción (Borrador y Derivados)** | `gemini-3-flash-preview` | **Generación de Texto:** Es el caballo de batalla para toda la creación de contenido textual (narrativa, guion, artículo, prompts). Ofrece un excelente balance entre capacidad de razonamiento creativo y costo operativo. |
| **3. Síntesis de Audio (On-Demand)** | `gemini-2.5-flash-preview-tts` | **Texto a Voz:** Genera el audio de la narrativa. Las voces pre-construidas (`Kore`, `Charon`, `Zephyr`, etc.) ofrecen alta calidad y variedad para los diferentes tonos narrativos de la aplicación. |
| **4. Síntesis Visual (On-Demand)** | `gemini-2.5-flash-image` | **Generación de Imagen:** Utilizado para "revelar" la imagen ilustrativa. Su capacidad para tomar una imagen de referencia (la subida por el usuario) y reinterpretarla según un prompt es fundamental para la función de "fidelidad facial". |

---

## 2. Roadmap de Evolución: Integración de Servicios Avanzados

A continuación se detallan las oportunidades de expansión, categorizadas por capacidad y con una evaluación de la complejidad de implementación.

### A. Capacidad: Narrativa de Máxima Calidad y Complejidad
*   **Modelo Propuesto:** `gemini-3-pro-preview`
*   **Caso de Uso:** Ofrecer una opción de "Calidad Ultra" o "Profundidad Máxima" en la Configuración Avanzada. Este modelo es superior en el manejo de la sutileza, la longitud del texto y la adherencia a estilos literarios complejos, lo que lo hace perfecto para el modo `deep_legacy`.
*   **Implementación (Baja Complejidad):**
    1.  Modificar la `ModelStrategy` en `types.ts` para incluir una opción `'ultra_quality'`.
    2.  Actualizar la lógica en `geminiService.ts` para seleccionar el modelo `gemini-3-pro-preview` cuando esta estrategia esté activa para la generación de texto.
    3.  **Consideración:** Comunicar al usuario el posible aumento en el tiempo de generación y costo de tokens.

### B. Capacidad: Anclaje en la Realidad (Fact-Checking y Actualidad)
*   **Servicio Propuesto:** **Google Search Grounding**
*   **Caso de Uso:** Crear un nuevo formato de salida, como "Crónica Periodística Verificada", que pueda incorporar eventos recientes, datos históricos o información específica sobre la cultura de Guerrero que no esté en el conocimiento base del modelo. Por ejemplo: *"La foto del mercado de Chilpancingo evoca el bullicio del Jueves Pozolero, una tradición que, según fuentes locales, se intensificó después de los años 70..."*.
*   **Implementación (Media Complejidad):**
    1.  Añadir una opción en la UI (`ConfigForm.tsx`) para habilitar el "Anclaje Web".
    2.  En `geminiService.ts`, al generar el artículo, añadir `tools: [{googleSearch: {}}]` a la configuración de la llamada a la API.
    3.  **Requisito Obligatorio:** Extraer las URLs de las fuentes de `response.candidates[0].groundingMetadata.groundingChunks`.
    4.  Modificar `ResultsView.tsx` para mostrar estas URLs como "Fuentes" al final del artículo, proporcionando transparencia y verificabilidad.

### C. Capacidad: Inteligencia Geoespacial
*   **Servicio Propuesto:** **Google Maps Grounding**
*   **Caso de Uso:** La mejora más transformadora para la aplicación. Si un usuario sube una foto de la iglesia de Santa Prisca en Taxco, la aplicación podría:
    1.  Solicitar permiso de geolocalización.
    2.  Generar una narrativa que mencione las calles empedradas circundantes, el olor de la plata de los talleres cercanos o incluso tejer una leyenda local asociada a esa ubicación específica, todo gracias a la data de Google Maps.
*   **Implementación (Alta Complejidad):**
    1.  Añadir el permiso `"geolocation"` a `metadata.json`.
    2.  En `App.tsx`, implementar `navigator.geolocation.getCurrentPosition` para obtener las coordenadas del usuario y pasarlas a través del flujo de configuración.
    3.  En `geminiService.ts`, modificar la llamada para incluir `tools: [{googleMaps: {}}]` y el `toolConfig` con los datos de `latLng`.
    4.  **Requisito Obligatorio:** Al igual que con Search, se deben extraer y mostrar las URLs de los lugares (ej. link a Google Maps de la iglesia) en la UI de resultados.

### D. Capacidad: Video Generativo (Feature Premium)
*   **Modelo Propuesto:** `veo-3.1-fast-generate-preview` / `veo-3.1-generate-preview`
*   **Caso de Uso:** Activar la funcionalidad "Premium" real. Una vez generada la imagen final y la narrativa, el usuario podría generar un clip de video de 5-10 segundos que anime la imagen (ej. un efecto de "travelling", hojas moviéndose, vapor saliendo del pozole) mientras se escucha el inicio de la narración en audio.
*   **Implementación (Alta Complejidad):**
    1.  **Requisito:** Esta funcionalidad **debe** estar protegida por el `ApiKeyGate`, ya que requiere un proyecto con facturación. La infraestructura actual ya soporta esto.
    2.  En `ResultsView.tsx`, añadir un botón "Crear Video".
    3.  La lógica de `geminiService.ts` debe manejar el flujo asíncrono de Veo:
        *   Llamar a `ai.models.generateVideos`, que devuelve una `operation`.
        *   Implementar un bucle de sondeo (polling) con `ai.operations.getVideosOperation` para verificar el estado de la operación.
        *   Actualizar la UI para mostrar mensajes de progreso claros ("Procesando video, esto puede tardar unos minutos...", "Añadiendo efectos...", "Renderizando...").
        *   Una vez que `operation.done` es `true`, obtener el `downloadLink` y mostrar el video en un reproductor HTML5.

### E. Capacidad: Narrativa Conversacional en Tiempo Real (Visión a Futuro)
*   **API Propuesta:** **Live API**
*   **Modelo:** `gemini-2.5-flash-native-audio-preview-09-2025`
*   **Caso de Uso:** Un modo completamente nuevo llamado "Cronista Interactivo". El usuario podría hablarle a la aplicación a través del micrófono, describiendo una escena o un sentimiento. La IA, actuando como un cronista de Guerrero, respondería en tiempo real con una narración en audio, creando un diálogo. El usuario podría interrumpir y redirigir la historia.
*   **Implementación (Muy Alta Complejidad - Requiere una nueva vista):**
    1.  Añadir el permiso `"microphone"` a `metadata.json`.
    2.  Crear un nuevo componente de interfaz para la conversación en vivo, que muestre transcripciones y controles de audio.
    3.  Implementar la lógica de conexión de `ai.live.connect` con todos sus callbacks (`onopen`, `onmessage`, `onerror`, `onclose`).
    4.  Manejar el streaming de audio desde el micrófono del usuario hacia el modelo y la reproducción del audio de respuesta del modelo, utilizando las funciones de decodificación de PCM como se especifica en la documentación.
    5.  Potencialmente, integrar "Function Calling" para que el usuario pueda dar comandos como "Ahora haz que llueva" y que la IA ajuste el tono de la narrativa.
