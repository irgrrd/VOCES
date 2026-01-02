
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Camera,
  Clapperboard,
  Aperture,
  Sun,
  Palette,
  Ratio,
  History,
  Sparkles,
  Wand2,
  Upload,
  Film,
  Play,
  Clock,
  MonitorPlay,
  ChevronRight,
  X,
  ShieldAlert,
  Hash,
  Layers,
} from "lucide-react";

import type {
  AspectRatio,
  FidelityLock,
  FilmStyle,
  UsageTemplate,
  WatermarkConfig,
  WatermarkPosition,
  MoviolaInput,
  EditScriptMaster,
} from "../types/moviola";

import { moviolaService } from "../services/moviolaService";

// -----------------------------
// Props
// -----------------------------
export interface PhotoEditorProps {
  analysisContext: string;
  narrativeText: string;
  culturalElements: string[];
  initialPrompt?: string;

  // Revelado (imagen) - actualizado para aceptar referencia opcional
  onGenerateImage?: (
    prompt: string, 
    settings: { 
      aspectRatio: AspectRatio; 
      lens: string; 
      style: FilmStyle;
      referenceImage?: string; // Base64 del archivo subido
    }
  ) => void;

  // Moviola (guion) - devolvemos el master ya compilado
  onGenerateScript?: (master: EditScriptMaster) => void;

  isGenerating?: boolean;
}

// -----------------------------
// History item (local UI)
// -----------------------------
interface HistoryItem {
  id: string;
  url: string; // placeholder / dataurl en implementación real
  timestamp: number;
  params: string;
  compiledPromptHead: string;
}

// -----------------------------
// Expanded Config
// -----------------------------
const ASPECT_RATIOS: Array<{ id: AspectRatio; label: string; hint: string }> = [
  { id: "1:1", label: "1:1", hint: "Cuadrado" },
  { id: "16:9", label: "16:9", hint: "Cine" },
  { id: "9:16", label: "9:16", hint: "Story" },
  { id: "4:3", label: "4:3", hint: "Clásico" },
  { id: "3:4", label: "3:4", hint: "Vertical clásico" },
  { id: "21:9", label: "21:9", hint: "Ultra-wide" },
  { id: "4:5", label: "4:5", hint: "IG feed" },
  { id: "2:3", label: "2:3", hint: "Foto vertical" },
  { id: "3:2", label: "3:2", hint: "Foto estándar" },
  { id: "5:4", label: "5:4", hint: "Editorial" },
];

const LENSES = [
  { id: "24mm", label: "24mm", prompt: "shot on 24mm wide angle lens, environmental context, expansive background" },
  { id: "35mm", label: "35mm", prompt: "shot on 35mm lens, natural perspective, documentary street photography" },
  { id: "85mm", label: "85mm", prompt: "shot on 85mm portrait lens, shallow depth of field, creamy bokeh, subject isolation" },
];

const LIGHTING = [
  { id: "natural", label: "Natural", prompt: "soft natural lighting, warm tones, realistic shadows" },
  { id: "studio", label: "Studio", prompt: "controlled studio lighting, rim light, high contrast, clean highlights" },
  { id: "neon", label: "Neon", prompt: "cinematic neon lighting, night atmosphere, colored practical lights, subtle haze" },
  { id: "overcast", label: "Overcast", prompt: "overcast diffuse lighting, soft shadows, misty atmosphere" },
];

type StyleGroup = "REALISMO" | "ARTE";

const STYLES: Array<{ id: FilmStyle; label: string; group: StyleGroup; prompt: string }> = [
  // REALISMO
  { id: "raw", label: "RAW Realismo", group: "REALISMO", prompt: "photorealistic raw photo, detailed texture, natural skin texture, no beauty filter" },
  { id: "documentary", label: "Documental", group: "REALISMO", prompt: "documentary realism, candid moment, honest imperfection, natural grain" },
  { id: "editorial", label: "Editorial", group: "REALISMO", prompt: "editorial photography, clean composition, premium detail, magazine look" },
  { id: "cinematic", label: "Cinemático", group: "REALISMO", prompt: "cinematic frame, filmic contrast, subtle halation, narrative lighting" },
  { id: "studio", label: "Estudio Pro", group: "REALISMO", prompt: "high-end studio photo, crisp detail, controlled highlights, clean background separation" },
  { id: "portrait_skin", label: "Retrato Piel", group: "REALISMO", prompt: "portrait with natural skin texture, pores visible, realistic specular highlights" },
  { id: "hyperreal", label: "Hiperreal", group: "REALISMO", prompt: "hyperreal detail, micro-texture, realistic materials, high fidelity" },
  { id: "analog", label: "Analógico", group: "REALISMO", prompt: "analog film look, film grain, slight vignette, nostalgic color science" },
  { id: "cyber", label: "Cyber", group: "REALISMO", prompt: "cyber cinematic realism, neon accents, metallic textures, controlled glow" },

  // ARTE
  { id: "oil", label: "Óleo", group: "ARTE", prompt: "oil painting style, impasto brushstrokes, painterly texture, classical composition" },
  { id: "sketch", label: "Sketch", group: "ARTE", prompt: "sketch illustration, pencil lines, cross-hatching, paper texture" },
];

const FIDELITY: Array<{ id: FidelityLock; label: string; prompt: string }> = [
  { id: "LOCK_A", label: "LOCK A (Gemelo)", prompt: "identity lock: preserve face/body identity if present, minimal deviation" },
  { id: "LOCK_B", label: "LOCK B (Narrativa)", prompt: "narrative lock: keep character consistent and story-coherent" },
  { id: "LOCK_C", label: "LOCK C (Atmósfera)", prompt: "atmosphere lock: match mood, palette, lighting, ignore strict identity" },
];

const TEMPLATES: Array<{
  id: UsageTemplate;
  label: string;
  desc: string;
  apply: {
    aspectRatio: AspectRatio;
    lens: string;
    lighting: string;
    filmStyle: FilmStyle;
    fidelity: FidelityLock;
    referenceWeight: number;
    watermarkEnabled: boolean;
    watermarkPosition: WatermarkPosition;
    watermarkOpacity: number;
  };
}> = [
  {
    id: "none",
    label: "Sin plantilla",
    desc: "Manual total",
    apply: {
      aspectRatio: "1:1",
      lens: "35mm",
      lighting: "natural",
      filmStyle: "raw",
      fidelity: "LOCK_B",
      referenceWeight: 50,
      watermarkEnabled: false,
      watermarkPosition: "bottom_right",
      watermarkOpacity: 20,
    },
  },
  {
    id: "news",
    label: "Nota / Prensa",
    desc: "Prioriza claridad y credibilidad",
    apply: {
      aspectRatio: "16:9",
      lens: "35mm",
      lighting: "overcast",
      filmStyle: "documentary",
      fidelity: "LOCK_B",
      referenceWeight: 70,
      watermarkEnabled: true,
      watermarkPosition: "bottom_right",
      watermarkOpacity: 18,
    },
  },
  {
    id: "social_organic",
    label: "Social orgánico",
    desc: "Vertical, emocional, rápido",
    apply: {
      aspectRatio: "9:16",
      lens: "35mm",
      lighting: "natural",
      filmStyle: "cinematic",
      fidelity: "LOCK_B",
      referenceWeight: 55,
      watermarkEnabled: true,
      watermarkPosition: "top_right",
      watermarkOpacity: 14,
    },
  },
  {
    id: "poster",
    label: "Póster",
    desc: "Impacto visual + composición",
    apply: {
      aspectRatio: "3:4",
      lens: "24mm",
      lighting: "studio",
      filmStyle: "editorial",
      fidelity: "LOCK_C",
      referenceWeight: 40,
      watermarkEnabled: true,
      watermarkPosition: "bottom_left",
      watermarkOpacity: 16,
    },
  },
  {
    id: "thumbnail",
    label: "Thumbnail",
    desc: "Lectura fuerte, contraste",
    apply: {
      aspectRatio: "16:9",
      lens: "24mm",
      lighting: "studio",
      filmStyle: "hyperreal",
      fidelity: "LOCK_C",
      referenceWeight: 35,
      watermarkEnabled: true,
      watermarkPosition: "top_left",
      watermarkOpacity: 20,
    },
  },
  {
    id: "catalog",
    label: "Catálogo",
    desc: "Producto/archivo limpio",
    apply: {
      aspectRatio: "4:5",
      lens: "85mm",
      lighting: "studio",
      filmStyle: "studio",
      fidelity: "LOCK_A",
      referenceWeight: 80,
      watermarkEnabled: true,
      watermarkPosition: "bottom_right",
      watermarkOpacity: 12,
    },
  },
  {
    id: "archive",
    label: "Archivo",
    desc: "Documentación neutral",
    apply: {
      aspectRatio: "3:2",
      lens: "35mm",
      lighting: "natural",
      filmStyle: "documentary",
      fidelity: "LOCK_B",
      referenceWeight: 75,
      watermarkEnabled: false,
      watermarkPosition: "bottom_right",
      watermarkOpacity: 15,
    },
  },
];

const VIDEO_ENGINES = [
  { id: "Veo", label: "Google Veo", badge: "DESTINO" },
  { id: "Sora", label: "Sora", badge: "DESTINO" },
  { id: "Wan", label: "Wan", badge: "DESTINO" },
  { id: "Grok", label: "Grok", badge: "DESTINO" },
  { id: "Otro", label: "Otro", badge: "DESTINO" },
];

// -----------------------------
// Utils
// -----------------------------
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const head = (s: string, n: number) => (s ? s.slice(0, n) : "");
const compact = (s: string) => (s || "").replace(/\s+/g, " ").trim();

const watermarkText = (wm: WatermarkConfig) => {
  if (!wm.enabled || !wm.text.trim()) return "";
  const pos =
    wm.position === "top_left"
      ? "top-left"
      : wm.position === "top_right"
        ? "top-right"
        : wm.position === "bottom_left"
          ? "bottom-left"
          : wm.position === "bottom_right"
            ? "bottom-right"
            : "center";
  return `Composition note: include a subtle watermark text "${wm.text.trim()}" at ${pos}, approx ${Math.round(wm.opacity)}% opacity (best-effort).`;
};

const refWeightText = (w: number) => {
  const n = Math.max(0, Math.min(100, Math.round(w)));
  if (n >= 80) return "Reference influence: very strong (minimal deviation).";
  if (n <= 20) return "Reference influence: loose (inspiration only).";
  return "Reference influence: balanced.";
};

// -----------------------------
// Component
// -----------------------------
const PhotoEditorPanel: React.FC<PhotoEditorProps> = ({
  analysisContext,
  narrativeText,
  culturalElements,
  initialPrompt = "",
  onGenerateImage,
  onGenerateScript,
  isGenerating = false,
}) => {
  const [activeTab, setActiveTab] = useState<"revelado" | "moviola">("revelado");

  // Core prompt
  const [promptText, setPromptText] = useState<string>(initialPrompt);

  // Expanded reveal state
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [lens, setLens] = useState<string>("35mm");
  const [lighting, setLighting] = useState<string>("natural");
  const [filmStyle, setFilmStyle] = useState<FilmStyle>("raw");
  const [styleGroup, setStyleGroup] = useState<StyleGroup>("REALISMO");

  const [fidelity, setFidelity] = useState<FidelityLock>("LOCK_B");
  const [referenceWeight, setReferenceWeight] = useState<number>(50);
  const [negativePrompt, setNegativePrompt] = useState<string>("");

  const [templatePreset, setTemplatePreset] = useState<UsageTemplate>("none");

  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: false,
    text: "Focus Guerrero",
    position: "bottom_right",
    opacity: 18,
  });

  const [manualOverride, setManualOverride] = useState<string>("");

  // History strip (local)
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Moviola state
  const [engine, setEngine] = useState<string>("Veo");
  const [durationSec, setDurationSec] = useState<number>(8);
  const [intent, setIntent] = useState<string>("Teaser documental, movimiento lento, claridad narrativa");

  // Reference upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referenceName, setReferenceName] = useState<string | null>(null);
  const [referenceBase64, setReferenceBase64] = useState<string | null>(null);

  const realismStyles = useMemo(() => STYLES.filter((s) => s.group === "REALISMO"), []);
  const artStyles = useMemo(() => STYLES.filter((s) => s.group === "ARTE"), []);

  const currentStyleList = styleGroup === "REALISMO" ? realismStyles : artStyles;

  const applyTemplate = useCallback(
    (preset: UsageTemplate) => {
      const t = TEMPLATES.find((x) => x.id === preset);
      if (!t) return;

      setTemplatePreset(preset);
      setAspectRatio(t.apply.aspectRatio);
      setLens(t.apply.lens);
      setLighting(t.apply.lighting);
      setFilmStyle(t.apply.filmStyle);
      setFidelity(t.apply.fidelity);
      setReferenceWeight(t.apply.referenceWeight);
      setWatermark((prev) => ({
        ...prev,
        enabled: t.apply.watermarkEnabled,
        position: t.apply.watermarkPosition,
        opacity: t.apply.watermarkOpacity,
        // No pisamos texto si el usuario ya lo cambió a algo propio:
        text: prev.text?.trim() ? prev.text : "Focus Guerrero",
      }));
    },
    [setTemplatePreset]
  );

  // Prompt Compiler (English technical)
  const buildVisualPrompt = useCallback(() => {
    const lensPrompt = LENSES.find((l) => l.id === lens)?.prompt || `shot on ${lens} lens`;
    const lightPrompt = LIGHTING.find((l) => l.id === lighting)?.prompt || `lighting: ${lighting}`;
    const stylePrompt = STYLES.find((s) => s.id === filmStyle)?.prompt || `style: ${filmStyle}`;

    const fidelityPrompt = FIDELITY.find((f) => f.id === fidelity)?.prompt || "narrative lock";
    const ratioPrompt = `Target aspect ratio: ${aspectRatio}.`;

    const narrativeKernel = compact(narrativeText).slice(0, 220);
    const scene = compact(analysisContext).slice(0, 220);

    const culture =
      culturalElements && culturalElements.length
        ? `Cultural context (Guerrero, Mexico): ${culturalElements.join(", ")}.`
        : "";

    const templateText =
      templatePreset && templatePreset !== "none"
        ? `Usage template: ${templatePreset} (optimize composition for this destination).`
        : "";

    const wm = watermarkText(watermark);

    const neg = negativePrompt.trim() ? `Exclude: ${negativePrompt.trim()}.` : "";

    const manual = manualOverride.trim()
      ? `Manual override (user): ${manualOverride.trim()}`
      : "";

    const refNote = referenceName ? `[REFERENCE]: Use provided reference image as composition/background guide.` : "";

    const compiled = [
      "[SCENE]:",
      scene ? scene + "." : "No scene context provided.",
      narrativeKernel ? `[NARRATIVE KERNEL]: ${narrativeKernel}...` : "",
      culture ? `[CULTURE]: ${culture}` : "",
      templateText ? `[TEMPLATE]: ${templateText}` : "",
      "[TECH SPECS]:",
      `${lensPrompt}; ${lightPrompt}; ${ratioPrompt}`,
      "[STYLE]:",
      `${stylePrompt}.`,
      "[FIDELITY]:",
      `${fidelityPrompt}.`,
      "[REFERENCE WEIGHT]:",
      `${refWeightText(referenceWeight)}`,
      refNote,
      wm ? `[WATERMARK]: ${wm}` : "",
      manual ? `[MANUAL]: ${manual}` : "",
      neg ? `[NEGATIVE]: ${neg}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    setPromptText(compiled);
  }, [
    aspectRatio,
    lens,
    lighting,
    filmStyle,
    fidelity,
    referenceWeight,
    negativePrompt,
    manualOverride,
    watermark,
    analysisContext,
    narrativeText,
    culturalElements,
    templatePreset,
    referenceName
  ]);

  // Init prompt if empty
  useEffect(() => {
    if (!promptText?.trim()) buildVisualPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handlers Upload ---
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setReferenceName(file.name);
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        const result = ev.target?.result as string;
        // Obtenemos solo el base64 sin el prefijo data:image...
        const base64 = result.split(',')[1];
        setReferenceBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClearReference = () => {
    setReferenceName(null);
    setReferenceBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReveal = async () => {
    // Siempre compila antes de revelar (para consistencia)
    if (!promptText?.trim()) buildVisualPrompt();

    const revealSettings = {
      aspectRatio,
      fidelity,
      lens,
      lighting,
      filmStyle,
      templatePreset,
      referenceWeight,
      negativePrompt,
      watermark,
      manualOverride: manualOverride.trim() ? manualOverride.trim() : undefined,
    };

    console.log("REVEAL_COMPLETED", {
      compiledPrompt: promptText,
      revealSettings,
      analysisContextHead: head(analysisContext, 120),
      hasReference: !!referenceBase64
    });

    // Callback real
    onGenerateImage?.(promptText, { 
      aspectRatio, 
      lens, 
      style: filmStyle,
      referenceImage: referenceBase64 || undefined
    });

    // Simulación de “resultado” para history strip
    const newItem: HistoryItem = {
      id: uid(),
      url: "placeholder://image", 
      timestamp: Date.now(),
      params: `${aspectRatio} | ${lens} | ${lighting} | ${filmStyle}`,
      compiledPromptHead: head(promptText, 120),
    };
    setHistory((prev) => [newItem, ...prev].slice(0, 12));
  };

  const handleGenerateMoviola = async () => {
    // Compilar prompt (si el usuario lo editó manualmente, respetamos)
    const compiledVisualPrompt = promptText?.trim() ? promptText : (buildVisualPrompt(), promptText);

    const input: MoviolaInput = {
      traceId: uid(),
      createdAt: Date.now(),
      analysisContext: analysisContext || "",
      narrativeText: narrativeText || "",
      culturalElements: culturalElements || [],
      compiledVisualPrompt: compiledVisualPrompt || "",
      revealSettings: {
        aspectRatio,
        fidelity,
        lens,
        lighting,
        filmStyle,
        templatePreset,
        referenceWeight,
        negativePrompt,
        watermark,
        manualOverride: manualOverride.trim() ? manualOverride.trim() : undefined,
      },
      moviola: {
        engine,
        durationSec,
        intent: intent || "Technical script",
      },
    };

    // Compila guion técnico (JSON)
    const master = await moviolaService.compileMasterScript(input);

    console.log("MOVIOLA_MASTER_READY", master);

    // Entrega master al padre (ResultsView, etc.)
    onGenerateScript?.(master);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700 text-slate-200 font-sans shadow-2xl w-full">
      {/* Header Tabs */}
      <div className="flex border-b border-slate-700 shrink-0 bg-slate-950">
        <button
          onClick={() => setActiveTab("revelado")}
          className={`flex-1 py-4 text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-colors ${
            activeTab === "revelado"
              ? "text-blue-400 border-b-2 border-blue-500 bg-slate-900"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
          }`}
        >
          <Camera className="w-4 h-4" /> REVELADO
        </button>
        <button
          onClick={() => setActiveTab("moviola")}
          className={`flex-1 py-4 text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-colors ${
            activeTab === "moviola"
              ? "text-amber-500 border-b-2 border-amber-500 bg-slate-900"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
          }`}
        >
          <Clapperboard className="w-4 h-4" /> MOVIOLA
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-8 bg-slate-900">
        {/* REVELADO */}
        {activeTab === "revelado" && (
          <div className="space-y-6 animate-fade-in">
            {/* Template */}
            <section className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <Layers className="w-3 h-3 text-amber-500" /> Plantilla de uso
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className={`text-left px-3 py-2 rounded border text-xs transition-all ${
                      templatePreset === t.id
                        ? "bg-amber-900/15 border-amber-500/40 text-amber-100"
                        : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                    title={t.desc}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{t.label}</span>
                      {templatePreset === t.id && <span className="text-[10px] text-amber-400">ACTIVA</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Prompt Engine */}
            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-blue-500" /> Prompt Técnico (EN)
                </label>
                <button onClick={buildVisualPrompt} className="text-[10px] flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                  <Wand2 className="w-3 h-3" /> Auto-Compilar
                </button>
              </div>

              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full h-36 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 resize-none shadow-inner"
                placeholder="El prompt técnico aparecerá aquí..."
              />

              <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500/80" />
                <div className="leading-snug">
                  <div className="text-slate-400 font-bold">Regla:</div>
                  <div>
                    Marca de agua = instrucción + metadata. Moviola = guiones técnicos (JSON), no video MP4.
                  </div>
                </div>
              </div>
            </section>

            {/* Ratios */}
            <section className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <Ratio className="w-3 h-3" /> Aspect Ratios (Expandido)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setAspectRatio(r.id)}
                    className={`py-2 rounded border text-[10px] font-bold transition-all ${
                      aspectRatio === r.id
                        ? "bg-slate-200 text-slate-900 border-slate-200"
                        : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                    title={r.hint}
                  >
                    {r.id}
                  </button>
                ))}
              </div>
            </section>

            {/* Lens + Lighting */}
            <section className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                  <Aperture className="w-3 h-3" /> Lente
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LENSES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLens(l.id)}
                      className={`px-3 py-2 rounded border text-xs transition-all ${
                        lens === l.id
                          ? "bg-blue-900/20 border-blue-500 text-blue-100"
                          : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <div className="font-bold">{l.label}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{l.id === "24mm" ? "Contexto" : l.id === "85mm" ? "Retrato" : "Natural"}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                  <Sun className="w-3 h-3" /> Iluminación
                </label>
                <select
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded p-2 outline-none focus:border-blue-500"
                >
                  {LIGHTING.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Styles grouped */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Estilos (Realismo vs Arte)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStyleGroup("REALISMO")}
                    className={`px-3 py-1.5 rounded border text-[10px] font-bold transition-all ${
                      styleGroup === "REALISMO"
                        ? "bg-slate-200 text-slate-900 border-slate-200"
                        : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    REALISMO
                  </button>
                  <button
                    onClick={() => setStyleGroup("ARTE")}
                    className={`px-3 py-1.5 rounded border text-[10px] font-bold transition-all ${
                      styleGroup === "ARTE"
                        ? "bg-slate-200 text-slate-900 border-slate-200"
                        : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    ARTE
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {currentStyleList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilmStyle(s.id)}
                    className={`text-left px-3 py-2 rounded border text-xs transition-all flex items-center justify-between ${
                      filmStyle === s.id
                        ? "bg-slate-800 border-slate-500 text-slate-100"
                        : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                    title={s.prompt}
                  >
                    {s.label}
                    {filmStyle === s.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Fidelity + Reference Weight */}
            <section className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                  <Hash className="w-3 h-3 text-amber-500" /> Fidelidad (LOCK)
                </label>
                <select
                  value={fidelity}
                  onChange={(e) => setFidelity(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded p-2 outline-none focus:border-amber-500"
                >
                  {FIDELITY.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Peso de Referencia (0–100)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={referenceWeight}
                  onChange={(e) => setReferenceWeight(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Loose</span>
                  <span className="text-blue-400 font-bold">{referenceWeight}</span>
                  <span>Strict</span>
                </div>
              </div>
            </section>

            {/* Negative + Manual override */}
            <section className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-3 h-3 text-red-400/80" /> Negativos + Override manual
              </label>
              <input
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none focus:border-red-500/50"
                placeholder='Ej: blurry, deformed, watermark, text artifacts...'
              />
              <textarea
                value={manualOverride}
                onChange={(e) => setManualOverride(e.target.value)}
                className="w-full h-20 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none focus:border-blue-500 resize-none"
                placeholder="Override manual (opcional): instrucciones extra específicas..."
              />
            </section>

            {/* Watermark */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                  <Film className="w-3 h-3 text-amber-500/80" /> Marca de agua (metadata + instrucción)
                </label>
                <button
                  onClick={() => setWatermark((p) => ({ ...p, enabled: !p.enabled }))}
                  className={`px-3 py-1.5 rounded border text-[10px] font-bold transition-all ${
                    watermark.enabled
                      ? "bg-amber-900/20 border-amber-500/40 text-amber-100"
                      : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {watermark.enabled ? "ACTIVA" : "INACTIVA"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={watermark.text}
                  onChange={(e) => setWatermark((p) => ({ ...p, text: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none focus:border-amber-500/60"
                  placeholder="Texto de watermark (ej: Focus Guerrero)"
                  disabled={!watermark.enabled}
                />
                <select
                  value={watermark.position}
                  onChange={(e) => setWatermark((p) => ({ ...p, position: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded p-2 outline-none focus:border-amber-500/60"
                  disabled={!watermark.enabled}
                >
                  <option value="top_left">Arriba Izq</option>
                  <option value="top_right">Arriba Der</option>
                  <option value="bottom_left">Abajo Izq</option>
                  <option value="bottom_right">Abajo Der</option>
                  <option value="center">Centro</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Opacidad</span>
                  <span className="text-amber-400 font-bold">{Math.round(watermark.opacity)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={watermark.opacity}
                  onChange={(e) => setWatermark((p) => ({ ...p, opacity: parseInt(e.target.value, 10) }))}
                  className="w-full accent-amber-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  disabled={!watermark.enabled}
                />
              </div>
            </section>

            {/* Reference upload (REAL UPLOAD) */}
            <section className="pt-2 pb-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
                <button
                  onClick={handleUploadClick}
                  className="flex-1 py-3 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-900/50 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <Upload className="w-4 h-4" /> {referenceName ? `Cambiar: ${referenceName}` : "Subir Referencia Visual (Opcional)"}
                </button>
                {referenceName && (
                  <button
                    onClick={handleClearReference}
                    className="p-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-600"
                    title="Quitar referencia"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {referenceName && (
                <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Referencia cargada. Se usará para composición/fondo.</span>
                  <span className="text-amber-500 font-mono text-[9px]">READY</span>
                </div>
              )}
            </section>

            {/* Action */}
            <button
              onClick={handleReveal}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? "Revelando..." : "REVELAR IMAGEN"}
            </button>
          </div>
        )}

        {/* MOVIOLA */}
        {activeTab === "moviola" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200/80 flex gap-2">
              <Film className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                La Moviola <b>NO genera video</b>. Genera un <b>guion técnico (JSON)</b> con prompts por clip,
                optimizado para motores externos (Veo/Sora/Wan/Grok).
              </span>
            </div>

            <section className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <MonitorPlay className="w-3 h-3 text-amber-500" /> Motor destino
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VIDEO_ENGINES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setEngine(m.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-all ${
                      engine === m.id
                        ? "bg-amber-900/20 border-amber-500 text-amber-100"
                        : "bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-xs font-bold">{m.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                      {m.badge}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                <Clock className="w-3 h-3" /> Duración total (segundos)
              </label>
              <input
                type="range"
                min={3}
                max={20}
                step={1}
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>3s</span>
                <span className="text-amber-500 font-bold">{durationSec}s</span>
                <span>20s</span>
              </div>
            </section>

            <section className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Intención (guion)</label>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full h-24 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 focus:border-amber-500 outline-none resize-none"
                placeholder="Ej: teaser documental, movimientos lentos, enfoque en artesanía..."
              />
            </section>

            <button
              onClick={handleGenerateMoviola}
              className="w-full bg-slate-800 hover:bg-slate-700 text-amber-500 border border-amber-500/30 hover:border-amber-500 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> GENERAR GUION TÉCNICO (JSON)
            </button>
          </div>
        )}
      </div>

      {/* History Strip */}
      <div className="h-24 bg-slate-950 border-t border-slate-700 shrink-0 p-3 flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold tracking-wider">
          <span className="flex items-center gap-1">
            <History className="w-3 h-3" /> Tira de Prueba
          </span>
          <span>{history.length} shots</span>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none py-1 h-full items-center">
          {history.length === 0 ? (
            <div className="text-[10px] text-slate-700 italic w-full text-center">Sin revelados recientes</div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="relative group shrink-0 w-12 h-12 bg-slate-900 rounded border border-slate-700 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                title={`${new Date(item.timestamp).toLocaleString()}\n${item.params}\n${item.compiledPromptHead}`}
              >
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[8px] text-slate-600 font-mono">
                  IMG
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoEditorPanel;
