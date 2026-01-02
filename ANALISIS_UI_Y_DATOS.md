# ESPECIFICACIÓN DE UI Y DATOS
**VERSIÓN ACTUAL:** v4.2.0 (Audit & Standardized)
**ESTADO:** IMPLEMENTACIÓN ACTIVA / ESTABILIZADA

---

## 1. ESTADO DE LA INTERFAZ DE USUARIO (UI)

### 1.1 Paradigma Visual: Bento Grid
**[IMPLEMENTADO]** en `ResultsView.tsx`.
-   **Estructura:** Layout asimétrico (Media Anchor Izquierdo / Texto Derecho).
-   **Componentes:** Canvas de imagen, Reproductor de audio flotante, Sistema de Pestañas (`activeTab`).

### 1.2 Configuración Rich Media
**[IMPLEMENTADO]** en `ConfigForm.tsx`.
-   Selectores visuales para `VoiceOption`.
-   Integración directa con `AssetManagerModal`.

### 1.3 Modales Auxiliares
-   **Asset Manager [IMPLEMENTADO]:** CRUD completo para ontología local.
-   **History Modal [IMPLEMENTADO]:** Visualización y restauración de `localStorage`.
-   **Premium Modal [IMPLEMENTADO]:** Interfaz funcional que conecta con selección de API Key.

---

## 2. DICCIONARIO DE DATOS TÉCNICO

### 2.1 Entidad: `NarrativeConfig`
*Contrato de entrada (types.ts)*

| Propiedad | Estado UI | Nota Técnica |
| :--- | :--- | :--- |
| `voiceStyle` | Visible | Select (Enum) |
| `protagonists`| Visible | String libre |
| `location` | Visible | Dinámico + Custom |
| `selectedTheme`| Visible | Dinámico |
| `duration` | **OCULTO** | Hardcoded '30s'. No editable. |
| `culturalElements`| Visible | Array Dinámico |
| `audioVoice` | Visible | Visual Card Selection |

### 2.2 Entidad: `GeneratedContent`
*Contrato de salida (types.ts / geminiService.ts)*

| Propiedad | Estado (v4.2.0) | Arquitectura |
| :--- | :--- | :--- |
| `narrativeText` | Estable | Generación Secuencial (Paso 1) |
| `socialScript` | **Estable** | Generación Paralela (Thread A) |
| `article` | **Estable** | Generación Paralela (Thread B) |
| `visualPrompt` | **Estable** | Generación Paralela (Thread C) |
| `generatedImage` | Estable | Generación Bajo Demanda |

**Nota v4.2.0:** Se eliminó la dependencia de JSON Monolítico. Cada campo derivado se obtiene mediante una llamada independiente, eliminando la fragilidad por truncamiento de texto.

### 2.3 Entidad: `SystemAssets`
*Contrato de persistencia (storageService.ts)*

| Clave Storage | Versión | Estructura |
| :--- | :--- | :--- |
| `voces_guerrero_assets_v2` | v2 | `{ locations[], culturalElements[], themes[] }` |
| `voces_guerrero_assets_v4` | v4 | Estructura normalizada completa |

---

## 3. INCONSISTENCIAS Y DEUDA TÉCNICA REGISTRADA

1.  **Consumo API:** La arquitectura paralela v4.2.0 triplica el número de requests en la fase de derivados.
2.  **Dependencia SDK:** El sistema depende exclusivamente de `@google/genai`. No soporta librerías legacy.

---

## 4. ESTADO DE CONGELAMIENTO

**ESTADO:** ACTIVO (v4.2.0)
Este documento refleja el comportamiento exacto del código auditado.

*Documento actualizado según auditoría v4.2.0.*