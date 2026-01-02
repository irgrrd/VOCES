# REGISTRO DE CAMBIOS: Voces de Guerrero (Evolución Asistida)

Este documento detalla la evolución del sistema SNAC a través de una serie de iteraciones, reflejando la corrección de errores, la implementación de nuevas funcionalidades y la respuesta a feedback específico del usuario.

---

### Iteración 1: Mejora de Claridad en la Interfaz de Usuario (UI)

*   **Solicitud:** Se solicitó mejorar las descripciones de los formatos de salida para que fueran más claras y detalladas para el usuario final.
*   **Análisis:** Las descripciones existentes eran funcionales pero no comunicaban completamente el valor o el resultado de cada opción.
*   **Implementación:**
    *   Se actualizaron las etiquetas de texto en `components/ConfigForm.tsx` para los checkboxes de "Guion Vertical", "Artículo Periodístico" y "Prompt Visual".
    *   Las nuevas descripciones son más explícitas sobre el formato, el caso de uso y las características del contenido generado (ej. "Estructura viral de ~60 segundos", "Tono editorial (~400 palabras)").
*   **Archivos Modificados:**
    *   `components/ConfigForm.tsx`

---

### Iteración 2: Corrección de Error Crítico de API ("Permission Denied")

*   **Problema:** La aplicación fallaba con un error de `permission denied` al llamar a la API de Gemini, bloqueando completamente el flujo.
*   **Análisis:** Este error típicamente ocurre cuando se utilizan modelos que requieren una clave de API asociada a un proyecto de Google Cloud con facturación habilitada. La inicialización del cliente de la API no era robusta ante cambios de clave o claves inválidas.
*   **Implementación (Solución de Estabilidad):**
    1.  **Portal de Selección de Clave (`ApiKeyGate`):** Se creó un nuevo componente (`components/ApiKeyGate.tsx`) que actúa como un portal obligatorio. Verifica si el usuario ha seleccionado una clave API válida a través de `window.aistudio.hasSelectedApiKey()` y, si no, le solicita que lo haga, explicando el requisito del plan de pago.
    2.  **Inicialización Robusta de API:** Se refactorizó `services/geminiService.ts` para que, en lugar de crear una instancia única del cliente de Gemini, se cree una nueva (`new GoogleGenAI(...)`) en cada llamada a la API. Esto asegura que siempre se utilice la clave más reciente seleccionada por el usuario.
    3.  **Manejo de Errores Específico:** Se actualizó `components/App.tsx` para detectar errores de API que contengan "permission denied" o "API key not valid". Al detectar este error, el estado `apiKeyReady` se resetea a `false`, volviendo a mostrar el `ApiKeyGate` para que el usuario seleccione una nueva clave.
*   **Archivos Modificados:**
    *   `components/ApiKeyGate.tsx` (Nuevo)
    *   `services/geminiService.ts`
    *   `components/App.tsx`

---

### Iteración 3: Arquitectura de Coexistencia (Respuesta a Feedback)

*   **Problema:** El usuario señaló acertadamente que la solución anterior, aunque efectiva, había simplificado en exceso la lógica de los prompts, eliminando la riqueza y profundidad de las versiones "históricas" (v3.2.1) en favor de la eficiencia de la v4.0. Se perdieron funcionalidades en lugar de hacerlas coexistir.
*   **Análisis:** Era necesario crear una arquitectura flexible que permitiera al sistema (y al usuario) elegir entre la velocidad y la profundidad, reconciliando los dos enfoques.
*   **Implementación (Arquitectura de Coexistencia):**
    1.  **Control de Profundidad y Estrategia:** Se introdujeron dos nuevos conceptos en `types.ts`:
        *   `NarrativeDepth`: Permite elegir entre `'standard'` (prompts v4 eficientes) y `'deep_legacy'` (prompts v3 históricos y detallados).
        *   `ModelStrategy`: Permite configurar el comportamiento del fallback de modelos (`'auto_fallback'`, `'high_fidelity_only'`, `'speed_turbo'`).
    2.  **Restauración de Prompts Históricos:** En `constants.ts`, se recuperó y renombró el prompt detallado como `SYSTEM_INSTRUCTION_LEGACY`, manteniéndolo junto al `SYSTEM_INSTRUCTION` estándar.
    3.  **UI de Control Avanzado:** Se modificó `components/ConfigForm.tsx` para añadir una sección desplegable de "Configuración Avanzada", donde el usuario puede seleccionar explícitamente la `NarrativeDepth` y `ModelStrategy` deseadas.
    4.  **Lógica Condicional en el Servicio:** El corazón del cambio reside en `services/geminiService.ts`. La función `generateNarrativeDraft` ahora comprueba `config.narrativeDepth`.
        *   Si es `'deep_legacy'`, utiliza `SYSTEM_INSTRUCTION_LEGACY` e inyecta metadatos enriquecidos en el prompt.
        *   Si es `'standard'`, utiliza el prompt v4 estándar.
        *   Se implementó `executeWithModelStrategy` para seleccionar la cadena de modelos a utilizar según la estrategia elegida por el usuario.
    5.  **Actualización del Estado Inicial:** En `App.tsx`, el estado por defecto del `config` se actualizó para incluir y dar valores predeterminados a `narrativeDepth` y `modelStrategy`, asegurando que la aplicación siempre inicie en un estado coherente.
*   **Archivos Modificados:**
    *   `types.ts`
    *   `constants.ts`
    *   `components/ConfigForm.tsx`
    *   `services/geminiService.ts`
    *   `App.tsx`

---

### Iteración 4: Auditoría y Estandarización v4.2.0

*   **Problema:** Inconsistencia entre versiones declaradas en código (v4.2.0) y documentación (v4.1.0/v3.2.1). Necesidad de verificar cumplimiento estricto con SDK `@google/genai`.
*   **Análisis:** El sistema utiliza las librerías correctas y modelos actualizados (`gemini-3-flash`, `gemini-2.5-flash-image`). La documentación estaba desactualizada.
*   **Implementación:**
    1.  **Sincronización de Versiones:** Se actualizó `index.html` y todos los archivos `.md` para reflejar la versión **v4.2.0**.
    2.  **Validación de Stack:** Se confirmó que `geminiService.ts` cumple con las mejores prácticas de instanciación y manejo de tipos de Gemini 2.5/3.
    3.  **Golden State:** Se declara v4.2.0 como la versión estable actual.
*   **Archivos Modificados:**
    *   `components/index.html`
    *   `MANIFESTO_SNAC_V3.2.1.md`
    *   `ANALISIS_UI_Y_DATOS.md`
    *   `config_proyecto.md`