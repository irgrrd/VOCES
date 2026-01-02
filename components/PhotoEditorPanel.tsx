
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Ratio, Camera, Clapperboard, Settings, ImagePlus, Upload, RefreshCw, 
  Sparkles, Aperture, History, Volume2, Music, Mic, Play, Trash2, 
  Smartphone, Monitor, Frame, Type, Stamp, LayoutTemplate, Edit3, X,
  Sun, Palette, ShieldAlert, Hash, Clock, MonitorPlay, Layers, Wand2, Eye
} from 'lucide-react';
import { MoviolaService } from '../services/moviolaService';
import { MoviolaInput, EditScriptMaster, AspectRatio, FidelityLock, FilmStyle, UsageTemplate, WatermarkPosition, RevealSettingsSnapshot } from '../types/moviola';

interface PhotoEditorProps {
  analysisContext?: string; 
  narrativeText?: string;
  culturalElements?: string[];
  initialPrompt?: string;
  onReveal?: (settings: any) => Promise<string>;
  onGenerateScript?: (master: EditScriptMaster) => void;
  isGenerating?: boolean;
}

interface HistoryItem {
    id: string;
    createdAt: number;
    thumbUrl?: string; // Data URL or placeholder
    prompt: string;
    settings: RevealSettingsSnapshot;
}

// --- CONSTANTES DE UI v5.0 ---

const RATIOS: Array<{ id: AspectRatio; label: string }> = [
  { id: "1:1", label: "1:1" }, { id: "16:9", label: "16:9" }, { id: "9:16", label: "9:16" }, 
  { id: "4:3", label: "4:3" }, { id: "3:4", label: "3:4" }, { id: "21:9", label: "21:9" },
  { id: "4:5", label: "4:5" }, { id: "2:3", label: "2:3" }, { id: "3:2", label: "3:2" }, { id: "5:4", label: "5:4" }
];

const LENSES = [
  { id: '24mm', label: '24mm (Angular)', prompt: 'shot on 24mm wide angle lens, expansive background' },
  { id: '35mm', label: '35mm (Ojo)', prompt: 'shot on 35mm lens, natural perspective, street photography' },
  { id: '50mm', label: '50mm (Normal)', prompt: 'shot on 50mm prime lens, truthful perspective' },
  { id: '85mm', label: '85mm (Retrato)', prompt: 'shot on 85mm portrait lens, shallow depth of field, creamy bokeh' },
];

const LIGHTING = [
  { id: 'natural', label: 'Natural', prompt: 'soft natural lighting, golden hour' },
  { id: 'studio', label: 'Estudio', prompt: 'dramatic studio lighting, rim light, high contrast' },
  { id: 'neon', label: 'Neón', prompt: 'cinematic neon lighting, cyan and orange tones, night atmosphere' },
  { id: 'overcast', label: 'Nublado', prompt: 'overcast diffuse lighting, soft shadows, misty' },
];

type StyleGroup = "REALISMO" | "ARTE";
const STYLES: Array<{ id: FilmStyle; label: string; group: StyleGroup; prompt: string }> = [
  // REALISMO
  { id: 'raw', label: 'Raw Photo', group: 'REALISMO', prompt: 'highly detailed, 8k, raw photo, fujifilm color' },
  { id: 'documentary', label: 'Documental', group: 'REALISMO', prompt: 'national geographic style, authentic, grit' },
  { id: 'editorial', label: 'Editorial', group: 'REALISMO', prompt: 'fashion magazine style, clean composition' },
  { id: 'cinematic', label: 'Cinemático', group: 'REALISMO', prompt: 'movie still, anamorphic lens flares, color graded' },
  { id: 'studio', label: 'Estudio Pro', group: 'REALISMO', prompt: 'controlled environment, clean background, commercial look' },
  { id: 'portrait_skin', label: 'Piel Real', group: 'REALISMO', prompt: 'macro details of skin texture, pores, vellus hair' },
  { id: 'hyperreal', label: 'Hiperreal', group: 'REALISMO', prompt: 'hyperrealistic, unreal engine 5 render style' },
  // ARTE
  { id: 'analog', label: 'Analógico', group: 'ARTE', prompt: 'vintage aesthetics, film grain, kodak portra 400' },
  { id: 'cyber', label: 'Cyberpunk', group: 'ARTE', prompt: 'futuristic style, vibrant neon colors, metallic textures' },
  { id: 'oil', label: 'Óleo', group: 'ARTE', prompt: 'oil painting style, impasto brushstrokes' },
  { id: 'sketch', label: 'Boceto', group: 'ARTE', prompt: 'charcoal sketch, rough lines, graphite texture' },
  { id: 'watercolor', label: 'Acuarela', group: 'ARTE', prompt: 'watercolor painting, wet on wet, pastel tones' },
];

const TEMPLATES: Array<{ id: UsageTemplate; label: string; settings: any }> = [
  { id: 'none', label: 'Manual', settings: {} },
  { id: 'news', label: 'Noticia', settings: { ratio: '4:3', style: 'documentary', lens: '35mm', light: 'natural' } },
  { id: 'social_organic', label: 'Social', settings: { ratio: '9:16', style: 'raw', lens: '24mm', light: 'natural' } },
  { id: 'poster', label: 'Póster', settings: { ratio: '2:3', style: 'cinematic', lens: '50mm', light: 'studio' } },
  { id: 'cinema', label: 'Cine', settings: { ratio: '21:9', style: 'cinematic', lens: '35mm', light: 'neon' } },
  { id: 'thumbnail', label: 'Miniatura', settings: { ratio: '16:9', style: 'hyperreal', lens: '24mm', light: 'studio' } },
  { id: 'catalog', label: 'Catálogo', settings: { ratio: '1:1', style: 'studio', lens: '50mm', light: 'natural' } },
  { id: 'archive', label: 'Archivo', settings: { ratio: '3:4', style: 'analog', lens: '35mm', light: 'overcast' } },
];

const PhotoEditorPanel: React.FC<PhotoEditorProps> = ({ 
  analysisContext = "", narrativeText = "", culturalElements = [], initialPrompt = "", 
  onReveal, onGenerateScript, isGenerating 
}) => {
  const [activeTab, setActiveTab] = useState<'photo' | 'moviola'>('photo');
  
  // --- STATE: REVELADO ---
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [lens, setLens] = useState("35mm");
  const [lighting, setLighting] = useState("natural");
  const [styleGroup, setStyleGroup] = useState<StyleGroup>("REALISMO");
  const [filmStyle, setFilmStyle] = useState<FilmStyle>("raw");
  const [template, setTemplate] = useState<UsageTemplate>("none");
  
  // Advanced State
  const [fidelity, setFidelity] = useState<FidelityLock>("LOCK_B");
  const [referenceWeight, setReferenceWeight] = useState(60);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [manualOverride, setManualOverride] = useState("");

  // Watermark
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmText, setWmText] = useState("@VocesGuerrero");
  const [wmPosition, setWmPosition] = useState<WatermarkPosition>("bottom_right");
  const [wmOpacity, setWmOpacity] = useState(30);

  // Reference Upload
  const [referenceName, setReferenceName] = useState<string | null>(null);
  const [referenceBase64, setReferenceBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session History (Tira de Prueba)
  const [sessionHistory, setSessionHistory] = useState<HistoryItem[]>([]);

  // --- STATE: MOVIOLA ---
  const [videoModel, setVideoModel] = useState("Veo");
  const [durationSec, setDurationSec] = useState(10);
  const [intent, setIntent] = useState("Cinematic slow motion, establishing shots.");

  // --- PERSISTENCIA (Effect) ---
  useEffect(() => {
    // Load settings from local storage if available
    const saved = localStorage.getItem('voces_darkroom_settings_v5');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setAspectRatio(parsed.aspectRatio || "16:9");
            setLens(parsed.lens || "35mm");
            setLighting(parsed.lighting || "natural");
            setFilmStyle(parsed.filmStyle || "raw");
            // Not loading prompt to allow fresh prompts from parent
        } catch(e) {}
    }
  }, []);

  useEffect(() => {
    // Save settings
    const settings = { aspectRatio, lens, lighting, filmStyle };
    localStorage.setItem('voces_darkroom_settings_v5', JSON.stringify(settings));
  }, [aspectRatio, lens, lighting, filmStyle]);

  // --- LOGIC ---

  const currentStyles = useMemo(() => STYLES.filter(s => s.group === styleGroup), [styleGroup]);

  const applyTemplate = (tId: UsageTemplate) => {
    setTemplate(tId);
    const t = TEMPLATES.find(x => x.id === tId);
    if (t && tId !== 'none') {
      if (t.settings.ratio) setAspectRatio(t.settings.ratio);
      if (t.settings.style) {
         setFilmStyle(t.settings.style);
         const grp = STYLES.find(s => s.id === t.settings.style)?.group;
         if(grp) setStyleGroup(grp);
      }
      if (t.settings.lens) setLens(t.settings.lens);
      if (t.settings.light) setLighting(t.settings.light);
      // Optional default ref weight for templates
      setReferenceWeight(60); 
    }
  };

  const buildVisualPrompt = useCallback(() => {
    const lObj = LENSES.find(l => l.id === lens);
    const liObj = LIGHTING.find(l => l.id === lighting);
    const sObj = STYLES.find(s => s.id === filmStyle);
    
    // Auto-compile
    const tech = `[TECH]: ${lObj?.prompt || lens}, ${liObj?.prompt || lighting}, ${sObj?.prompt || filmStyle}`;
    const context = `[SCENE]: ${analysisContext ? analysisContext.substring(0, 150) : 'Cinematic scene'}`;
    const narrative = narrativeText ? `[ACTION]: ${narrativeText.substring(0, 150)}...` : '';
    const neg = negativePrompt ? `[EXCLUDE]: ${negativePrompt}` : '';
    const wm = wmEnabled ? `[COMPOSITION]: Leave space in ${wmPosition} for watermark "${wmText}".` : '';
    
    // Manual Override appended at the END
    const man = manualOverride ? `[OVERRIDE]: ${manualOverride}` : '';

    const full = `${context}\n${narrative}\n${tech}\n${wm}\n${neg}\n${man}`;
    setPrompt(full);
  }, [lens, lighting, filmStyle, analysisContext, narrativeText, negativePrompt, manualOverride, wmEnabled, wmPosition, wmText]);

  // Init prompt once
  useEffect(() => {
    if(!prompt && initialPrompt) buildVisualPrompt();
  }, [initialPrompt]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const base64 = result.split(',')[1];
        setReferenceBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const restoreHistoryItem = (item: HistoryItem) => {
      const s = item.settings;
      setAspectRatio(s.aspectRatio);
      setFilmStyle(s.filmStyle);
      setLens(s.lens);
      setLighting(s.lighting);
      setFidelity(s.fidelity);
      setNegativePrompt(s.negativePrompt);
      setManualOverride(s.manualOverride || "");
      setReferenceWeight(s.referenceWeight);
      setTemplate(s.templatePreset);
      setWmEnabled(s.watermark.enabled);
      setWmText(s.watermark.text);
      setWmPosition(s.watermark.position);
      setPrompt(item.prompt);
  };

  const handleReveal = async () => {
    const traceId = crypto.randomUUID();
    const settings: RevealSettingsSnapshot = {
        aspectRatio, 
        filmStyle, 
        lens,
        lighting,
        fidelity,
        templatePreset: template,
        referenceWeight,
        negativePrompt,
        watermark: { enabled: wmEnabled, text: wmText, position: wmPosition, opacity: wmOpacity },
        manualOverride
    };

    // Payload for Parent (includes base64 for generation, but we don't save base64 in history)
    const payload = {
        traceId,
        ...settings,
        referenceImage: referenceBase64,
        prompt: prompt
    };

    // Log Trazabilidad
    console.log("REVEAL_COMPLETED", { 
        traceId, 
        compiledPrompt: prompt?.substring(0,50) + "...", 
        revealSettings: { aspectRatio, filmStyle, lens }, 
        analysisContextHead: analysisContext?.substring(0, 20) 
    });

    try {
        const resultUrl = await onReveal?.(payload);
        
        // Add to Session History if successful
        if (resultUrl) {
            const newItem: HistoryItem = {
                id: traceId,
                createdAt: Date.now(),
                thumbUrl: resultUrl, // Assuming result is a dataURL we can show
                prompt: prompt || "",
                settings: settings
            };
            setSessionHistory(prev => [newItem, ...prev]);
        }
    } catch (e) {
        console.error("Reveal failed", e);
    }
  };

  const handleGenerateScript = async () => {
    const traceId = crypto.randomUUID();
    const settings: RevealSettingsSnapshot = {
        aspectRatio, fidelity, lens, lighting, 
        filmStyle, templatePreset: template, referenceWeight, 
        negativePrompt, watermark: { enabled: wmEnabled, text: wmText, position: wmPosition, opacity: wmOpacity },
        manualOverride
    };

    const input: MoviolaInput = {
      traceId,
      createdAt: Date.now(),
      analysisContext, narrativeText, culturalElements,
      compiledVisualPrompt: prompt || "",
      revealSettings: settings,
      moviola: { engine: videoModel, durationSec, intent }
    };
    
    const master = await MoviolaService.compileMasterScript(input);

    // LOG DE TRAZABILIDAD
    console.log("MOVIOLA_MASTER_READY", master);
    
    onGenerateScript?.(master);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 p-0 font-sans border-r border-slate-800">
      {/* Header Tabs */}
      <div className="flex border-b border-slate-800 shrink-0">
        <button 
            onClick={() => setActiveTab('photo')} 
            className={`flex-1 p-3 text-xs font-bold flex items-center justify-center gap-2 ${activeTab === 'photo' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <Camera className="w-4 h-4" /> REVELADO
        </button>
        <button 
            onClick={() => setActiveTab('moviola')} 
            className={`flex-1 p-3 text-xs font-bold flex items-center justify-center gap-2 ${activeTab === 'moviola' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <Clapperboard className="w-4 h-4" /> MOVIOLA
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {activeTab === 'photo' ? (
          <div className="space-y-6 animate-fade-in">
            
            {/* 0. Session History Strip (Tira de Prueba) */}
            {sessionHistory.length > 0 && (
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><History className="w-3 h-3"/> Tira de Prueba</label>
                        <button onClick={() => setSessionHistory([])} className="text-[10px] text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3"/></button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {sessionHistory.map(item => (
                            <button key={item.id} onClick={() => restoreHistoryItem(item)} className="shrink-0 w-16 h-16 rounded border border-slate-700 overflow-hidden relative group hover:border-blue-500 transition-all">
                                {item.thumbUrl ? <img src={item.thumbUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[9px]">IMG</div>}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <RefreshCw className="w-4 h-4 text-white"/>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 1. Templates */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><LayoutTemplate className="w-3 h-3"/> Plantillas (v5)</label>
                <div className="flex gap-2 flex-wrap">
                    {TEMPLATES.map(t => (
                        <button 
                            key={t.id} 
                            onClick={() => applyTemplate(t.id)} 
                            className={`px-3 py-1.5 border rounded text-[10px] transition-all ${template === t.id ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Prompt Compiler */}
            <div className="space-y-2">
                 <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500"/> Prompt Técnico</label>
                    <button onClick={buildVisualPrompt} className="text-[10px] text-blue-400 flex items-center gap-1 hover:text-white"><Wand2 className="w-3 h-3"/> Re-Compilar</button>
                 </div>
                 <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-24 bg-slate-950 border border-slate-700 rounded p-2 text-[10px] font-mono text-slate-400 focus:border-blue-500 outline-none resize-none"
                 />
            </div>
            
            {/* 3. Estilos (Categorized Realismo vs Arte) */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Palette className="w-3 h-3"/> Estilo</label>
                    <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
                        <button onClick={() => setStyleGroup("REALISMO")} className={`px-2 py-0.5 text-[9px] rounded ${styleGroup === "REALISMO" ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>REALISMO</button>
                        <button onClick={() => setStyleGroup("ARTE")} className={`px-2 py-0.5 text-[9px] rounded ${styleGroup === "ARTE" ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>ARTE</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {currentStyles.map(s => (
                        <button 
                            key={s.id} 
                            onClick={() => setFilmStyle(s.id)}
                            className={`text-left px-2 py-1.5 rounded border text-[10px] flex justify-between items-center transition-all ${filmStyle === s.id ? 'bg-slate-800 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                        >
                            {s.label}
                            {filmStyle === s.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. Ratios & Specs (10 Ratios) */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Ratio className="w-3 h-3"/> Formato</label>
                <div className="grid grid-cols-5 gap-1.5">
                    {RATIOS.map(r => (
                        <button key={r.id} onClick={() => setAspectRatio(r.id)} className={`py-1 text-[10px] border rounded ${aspectRatio === r.id ? 'bg-slate-200 text-slate-900 font-bold border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>{r.label}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                     <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Aperture className="w-3 h-3"/> Lente</label>
                     <select value={lens} onChange={e => setLens(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-300 outline-none">
                        {LENSES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                     </select>
                 </div>
                 <div className="space-y-1">
                     <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Sun className="w-3 h-3"/> Iluminación</label>
                     <select value={lighting} onChange={e => setLighting(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-300 outline-none">
                        {LIGHTING.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                     </select>
                 </div>
            </div>

            {/* 5. Reference & Fidelity */}
            <div className="space-y-2 border-t border-slate-800 pt-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><ImagePlus className="w-3 h-3"/> Referencia de Fondo</label>
                <div className="flex gap-2 items-center">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 border border-dashed border-slate-700 bg-slate-900 rounded text-xs flex items-center justify-center gap-2 hover:border-blue-500 hover:text-white transition-colors text-slate-400">
                        <Upload size={14}/> {referenceName ? "Cambiar Imagen" : "Subir Imagen (Fondo/Ref)"}
                    </button>
                    {referenceName && (
                        <button onClick={() => { setReferenceName(null); setReferenceBase64(null); }} className="p-3 bg-slate-900 border border-slate-700 rounded text-red-400 hover:text-red-300 hover:bg-slate-800">
                            <X size={14}/>
                        </button>
                    )}
                </div>
                {referenceName && (
                   <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[9px] text-emerald-500 truncate flex-1">{referenceName}</span>
                      <div className="w-20">
                         <input type="range" min="0" max="100" value={referenceWeight} onChange={e => setReferenceWeight(parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" title="Peso de referencia" />
                      </div>
                      <span className="text-[9px] text-slate-500 w-6 text-right">{referenceWeight}%</span>
                   </div>
                )}
            </div>

            {/* 6. Advanced Controls (Manual Override Added) */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Ajustes Finos</label>
                <input type="text" placeholder="Negativos (ej. blurry, text)..." value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-300 placeholder-slate-600 focus:border-red-500/50 outline-none" />
                <textarea placeholder="Manual Override (Añadir texto extra al final del prompt)..." value={manualOverride} onChange={e => setManualOverride(e.target.value)} className="w-full h-12 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-300 placeholder-slate-600 focus:border-blue-500 outline-none resize-none" />
            </div>

            {/* 7. Watermark */}
            <div className="p-3 border border-slate-800 rounded bg-slate-900/50 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Stamp className="w-3 h-3"/> Marca de Agua (Metadata)</span>
                    <input type="checkbox" checked={wmEnabled} onChange={e => setWmEnabled(e.target.checked)} className="accent-blue-500"/>
                </div>
                {wmEnabled && (
                  <div className="grid grid-cols-2 gap-2 animate-fade-in">
                    <input type="text" value={wmText} onChange={e => setWmText(e.target.value)} className="col-span-2 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs" placeholder="Texto..." />
                    <select value={wmPosition} onChange={e => setWmPosition(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded p-1 text-xs">
                       <option value="bottom_right">Abajo Der</option>
                       <option value="bottom_left">Abajo Izq</option>
                       <option value="top_right">Arriba Der</option>
                       <option value="top_left">Arriba Izq</option>
                       <option value="center">Centro</option>
                    </select>
                    <input type="range" min="0" max="100" value={wmOpacity} onChange={e => setWmOpacity(parseInt(e.target.value))} className="h-full bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                )}
            </div>

            {/* Action */}
            <button onClick={handleReveal} disabled={isGenerating} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                {isGenerating ? "REVELAR IMAGEN" : "REVELAR IMAGEN"}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="p-3 bg-amber-900/10 border border-amber-500/20 rounded text-[10px] text-amber-200/80 flex gap-2">
                <Layers className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Moviola genera un <strong>guion técnico (JSON)</strong> para motores externos. No genera video MP4 directamente aquí.</span>
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><MonitorPlay className="w-3 h-3 text-amber-500"/> Motor Destino</label>
                <div className="space-y-1">
                    {["Veo", "Sora", "Wan", "Grok"].map(v => (
                         <button key={v} onClick={() => setVideoModel(v)} className={`w-full flex justify-between p-2 rounded border text-xs transition-all ${videoModel === v ? 'bg-amber-900/20 border-amber-500 text-amber-100' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                             <span className="font-bold">{v}</span>
                             {videoModel === v && <div className="w-2 h-2 rounded-full bg-amber-500 self-center"></div>}
                         </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Duración (Seg)</label>
                 <div className="flex items-center gap-3">
                    <span className="text-xs font-mono w-4">3s</span>
                    <input type="range" min="3" max="20" step="1" value={durationSec} onChange={e => setDurationSec(parseInt(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                    <span className="text-xs font-mono font-bold text-amber-500 w-6">{durationSec}s</span>
                 </div>
            </div>

            <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold text-slate-500">Intención de Movimiento</label>
                 <textarea value={intent} onChange={e => setIntent(e.target.value)} className="w-full h-24 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 focus:border-amber-500 outline-none resize-none" placeholder="Ej: Zoom lento, panning horizontal, partículas flotando..." />
            </div>

            <button onClick={handleGenerateScript} className="w-full bg-slate-800 hover:bg-slate-700 text-amber-500 border border-amber-500/30 font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                <Play className="w-4 h-4 fill-current"/> GENERAR GUION TÉCNICO
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default PhotoEditorPanel;
